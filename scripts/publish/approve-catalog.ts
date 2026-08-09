import { access, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  EditorialProfileSchema,
  PublicationRecordSchema,
  RadarProjectBundleSchema,
  RepositorySnapshotSchema,
  SCHEMA_VERSION,
  type EditorialProfile,
  type RepositorySnapshot,
} from "../../packages/schema/src/index.js";

type Options = {
  reviewer: string;
  reviewedAt: string;
  candidatesDirectory: string;
  snapshotsDirectory: string;
  projectsDirectory: string;
};

function parseArguments(arguments_: string[]): Options {
  const values = new Map<string, string>();

  for (let index = 0; index < arguments_.length; index += 2) {
    const key = arguments_[index];
    const value = arguments_[index + 1];
    if (!key?.startsWith("--") || !value) {
      throw new Error(
        "用法：tsx scripts/publish/approve-catalog.ts --reviewer <id> --reviewed-at <ISO 时间>",
      );
    }
    values.set(key, value);
  }

  const reviewer = values.get("--reviewer");
  const reviewedAt = values.get("--reviewed-at");
  if (!reviewer || !reviewedAt || Number.isNaN(Date.parse(reviewedAt))) {
    throw new Error("--reviewer 与合法的 --reviewed-at 都是必填参数");
  }

  return {
    reviewer,
    reviewedAt,
    candidatesDirectory: path.resolve(values.get("--candidates-dir") ?? "data/candidates"),
    snapshotsDirectory: path.resolve(values.get("--snapshots-dir") ?? "data/snapshots"),
    projectsDirectory: path.resolve(values.get("--projects-dir") ?? "data/projects"),
  };
}

async function readJsonDirectory<T>(
  directory: string,
  parse: (value: unknown) => T,
): Promise<Array<{ file: string; value: T }>> {
  const entries = (await readdir(directory)).filter((entry) => entry.endsWith(".json")).sort();
  return Promise.all(
    entries.map(async (entry) => ({
      file: entry,
      value: parse(JSON.parse(await readFile(path.join(directory, entry), "utf8")) as unknown),
    })),
  );
}

function projectSlug(snapshot: RepositorySnapshot): string {
  return snapshot.fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function writeAtomically(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, file);
}

async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));
  const snapshots = await readJsonDirectory(options.snapshotsDirectory, (value) =>
    RepositorySnapshotSchema.parse(value),
  );
  const snapshotsById = new Map(snapshots.map(({ value }) => [value.repositoryId, value]));
  const candidates = await readJsonDirectory(options.candidatesDirectory, (value) =>
    EditorialProfileSchema.parse(value),
  );
  let approvedCount = 0;
  let preservedCount = 0;

  for (const { file, value: candidate } of candidates) {
    if (candidate.review.state !== "pending") continue;
    const snapshot = snapshotsById.get(candidate.repositoryId);
    if (!snapshot) throw new Error(`${file} 找不到 repositoryId=${candidate.repositoryId} 的快照`);

    const slug = projectSlug(snapshot);
    const output = path.join(options.projectsDirectory, `${slug}.json`);
    try {
      await access(output);
      preservedCount += 1;
      process.stdout.write(`preserved existing ${snapshot.fullName}\n`);
      continue;
    } catch {
      // Missing output is the expected path for a newly approved candidate.
    }

    const approvedEditorial: EditorialProfile = EditorialProfileSchema.parse({
      ...candidate,
      review: {
        state: "approved",
        reviewer: { kind: "agent", id: options.reviewer },
        reviewedAt: options.reviewedAt,
        notes: "MVP 内容复核通过；这是本地发布状态，不代表已获得公网部署授权。",
      },
    });
    const publication = PublicationRecordSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      repositoryId: snapshot.repositoryId,
      slug,
      status: "published",
      featured: approvedEditorial.score.total >= 82,
      editorialVersion: 1,
      publishedAt: options.reviewedAt,
      lastReviewedAt: options.reviewedAt,
      rejectionReasons: [],
    });
    const bundle = RadarProjectBundleSchema.parse({
      snapshot,
      editorial: approvedEditorial,
      publication,
    });
    await writeAtomically(output, bundle);
    approvedCount += 1;
    process.stdout.write(`approved ${snapshot.fullName} -> ${path.relative(process.cwd(), output)}\n`);
  }

  process.stdout.write(
    `已审核并生成 ${approvedCount} 个本地发布 bundle；保留 ${preservedCount} 个既有 bundle。\n`,
  );
}

await main();
