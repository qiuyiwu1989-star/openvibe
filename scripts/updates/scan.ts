import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  RepositorySnapshotSchema,
  SCHEMA_VERSION,
  UPDATE_CHANGE_KINDS,
  UpdateQueueSchema,
  type IngestCommand,
  type IngestOutcome,
  type RepositorySnapshot,
  type UpdateQueue,
  type UpdateQueueEntry,
} from "../../packages/schema/src/index.js";

import { ingestRepository } from "../ingest/ingest.js";

type IngestFunction = (command: IngestCommand) => Promise<IngestOutcome>;

export type ScanOptions = {
  snapshotsDirectory: string;
  outputDirectory: string;
  staleAfterDays: number;
  now?: () => Date;
  ingest?: IngestFunction;
};

export class UpdateScanFailedError extends Error {
  constructor(readonly queue: UpdateQueue) {
    super(`更新扫描有 ${queue.failures.length} 个仓库失败，已保留上一版队列`);
    this.name = "UpdateScanFailedError";
  }
}

export async function scanRepositoryUpdates(options: ScanOptions): Promise<UpdateQueue> {
  const now = options.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const ingest = options.ingest ?? ((command) => ingestRepository(command));
  const snapshots = await readSnapshots(options.snapshotsDirectory);
  const entries: UpdateQueueEntry[] = [];
  const failures: UpdateQueue["failures"] = [];
  let unchanged = 0;
  const temporaryDirectory = `${options.outputDirectory}.tmp-${process.pid}-${Date.now()}`;

  await rm(temporaryDirectory, { recursive: true, force: true });
  await mkdir(path.join(temporaryDirectory, "candidates"), { recursive: true });

  try {
    // Sequential by design: conditional requests stay predictable and kind to GitHub's limits.
    for (const { file, snapshot } of snapshots) {
      const [owner, name] = snapshot.fullName.split("/");
      if (!owner || !name) throw new Error(`${snapshot.fullName} 不是合法仓库名`);

      const outcome = await ingest({
        locator: { owner, name },
        ifNoneMatch: snapshot.source.etag ?? undefined,
        knownRepositoryId: snapshot.repositoryId,
        force: false,
      });

      if (outcome.status === "failed") {
        failures.push({
          repositoryId: snapshot.repositoryId,
          fullName: snapshot.fullName,
          code: outcome.error.code,
          message: outcome.error.message,
          retryable: outcome.error.retryable,
        });
        continue;
      }

      const candidate = outcome.status === "changed" ? outcome.snapshot : snapshot;
      if (candidate.repositoryId !== snapshot.repositoryId) {
        failures.push({
          repositoryId: snapshot.repositoryId,
          fullName: snapshot.fullName,
          code: "repository_identity_mismatch",
          message: `GitHub 返回 repositoryId=${candidate.repositoryId}，与基线 ${snapshot.repositoryId} 不一致`,
          retryable: false,
        });
        continue;
      }

      const changeKinds = classifySnapshotChanges(
        snapshot,
        candidate,
        new Date(generatedAt),
        options.staleAfterDays,
      );
      if (changeKinds.length === 0) {
        unchanged += 1;
        continue;
      }

      const hasSnapshotChange = outcome.status === "changed" && changeKinds.some(
        (kind) => kind !== "maintenance_risk",
      );
      const candidatePath = hasSnapshotChange ? `candidates/${file}` : null;
      if (candidatePath) {
        await writeJson(path.join(temporaryDirectory, candidatePath), candidate);
      }

      entries.push({
        repositoryId: snapshot.repositoryId,
        fullName: candidate.fullName,
        previousFullName: snapshot.fullName,
        snapshotFile: file,
        candidatePath,
        detectedAt: generatedAt,
        risk: riskForChanges(changeKinds),
        changeKinds,
        reviewState: "review",
      });
    }

    const queue = UpdateQueueSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      generatedAt,
      staleAfterDays: options.staleAfterDays,
      summary: {
        checked: snapshots.length,
        unchanged,
        review: entries.length,
        failed: failures.length,
      },
      entries: entries.sort((left, right) => {
        const riskOrder = { high: 0, medium: 1, low: 2 } as const;
        return riskOrder[left.risk] - riskOrder[right.risk] || left.fullName.localeCompare(right.fullName);
      }),
      failures,
    });

    if (failures.length > 0) throw new UpdateScanFailedError(queue);

    await writeJson(path.join(temporaryDirectory, "queue.json"), queue);
    await replaceDirectoryAtomically(temporaryDirectory, options.outputDirectory);
    return queue;
  } catch (error) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }
}

export function classifySnapshotChanges(
  previous: RepositorySnapshot,
  current: RepositorySnapshot,
  checkedAt: Date,
  staleAfterDays: number,
): UpdateQueueEntry["changeKinds"] {
  const changes = new Set<UpdateQueueEntry["changeKinds"][number]>();

  if (
    previous.fullName !== current.fullName ||
    previous.owner.login !== current.owner.login ||
    previous.name !== current.name
  ) changes.add("repository_renamed");
  if (previous.defaultBranch !== current.defaultBranch) changes.add("default_branch_changed");
  if (
    previous.description !== current.description ||
    previous.homepageUrl !== current.homepageUrl
  ) changes.add("description_changed");
  if (!sameLicense(previous, current)) changes.add("license_changed");
  if (!sameReadme(previous, current)) changes.add("readme_changed");
  if (
    previous.primaryLanguage !== current.primaryLanguage ||
    stableJson(previous.languages) !== stableJson(current.languages) ||
    stableJson([...previous.topics].sort()) !== stableJson([...current.topics].sort())
  ) changes.add("technology_changed");
  if (
    previous.timestamps.pushedAt !== current.timestamps.pushedAt ||
    previous.timestamps.updatedAt !== current.timestamps.updatedAt
  ) changes.add("activity_changed");
  if (stableJson(previous.metrics) !== stableJson(current.metrics)) changes.add("metrics_changed");
  if (
    previous.visibility !== current.visibility ||
    previous.archived !== current.archived ||
    previous.disabled !== current.disabled ||
    previous.isFork !== current.isFork
  ) changes.add("availability_changed");

  const pushedAt = current.timestamps.pushedAt ? new Date(current.timestamps.pushedAt) : null;
  const staleBefore = checkedAt.getTime() - staleAfterDays * 86_400_000;
  if (!pushedAt || Number.isNaN(pushedAt.getTime()) || pushedAt.getTime() < staleBefore) {
    changes.add("maintenance_risk");
  }

  return UPDATE_CHANGE_KINDS.filter((kind) => changes.has(kind));
}

function riskForChanges(changeKinds: UpdateQueueEntry["changeKinds"]): UpdateQueueEntry["risk"] {
  if (changeKinds.some((kind) => kind === "license_changed" || kind === "availability_changed")) {
    return "high";
  }
  if (
    changeKinds.some((kind) =>
      [
        "repository_renamed",
        "default_branch_changed",
        "readme_changed",
        "technology_changed",
        "maintenance_risk",
      ].includes(kind),
    )
  ) return "medium";
  return "low";
}

async function readSnapshots(
  directory: string,
): Promise<Array<{ file: string; snapshot: RepositorySnapshot }>> {
  const files = (await readdir(directory)).filter((file) => file.endsWith(".json")).sort();
  return Promise.all(files.map(async (file) => ({
    file,
    snapshot: RepositorySnapshotSchema.parse(
      JSON.parse(await readFile(path.join(directory, file), "utf8")) as unknown,
    ),
  })));
}

function sameLicense(left: RepositorySnapshot, right: RepositorySnapshot): boolean {
  return stableJson(left.license && { spdxId: left.license.spdxId, name: left.license.name }) ===
    stableJson(right.license && { spdxId: right.license.spdxId, name: right.license.name });
}

function sameReadme(left: RepositorySnapshot, right: RepositorySnapshot): boolean {
  return stableJson(left.readme && { path: left.readme.path, sha: left.readme.sha }) ===
    stableJson(right.readme && { path: right.readme.path, sha: right.readme.sha });
}

function stableJson(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return JSON.stringify(value);
  return JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
  );
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
}

async function replaceDirectoryAtomically(temporary: string, target: string): Promise<void> {
  await mkdir(path.dirname(target), { recursive: true });
  const backup = `${target}.backup-${process.pid}-${Date.now()}`;
  let movedExisting = false;

  try {
    try {
      await rename(target, backup);
      movedExisting = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    await rename(temporary, target);
    if (movedExisting) await rm(backup, { recursive: true, force: true });
  } catch (error) {
    if (movedExisting) {
      await rm(target, { recursive: true, force: true });
      await rename(backup, target);
    }
    throw error;
  }
}
