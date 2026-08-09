import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  EditorialProfileSchema,
  RepositorySnapshotSchema,
  SCHEMA_VERSION,
  type EditorialProfile,
  type RepositorySnapshot,
} from "../../packages/schema/src/index.js";

type DraftSource = EditorialProfile["sources"][number] extends infer Source
  ? Omit<Source, "accessedAt">
  : never;

type EditorialDraft = Omit<
  EditorialProfile,
  "schemaVersion" | "repositoryId" | "sources" | "provenance" | "review"
> & {
  fullName: string;
  sourceUrls: DraftSource[];
};

type Options = {
  generatedAt: string;
  draftsDirectory: string;
  snapshotsDirectory: string;
  candidatesDirectory: string;
};

function parseArguments(arguments_: string[]): Options {
  const values = new Map<string, string>();

  for (let index = 0; index < arguments_.length; index += 2) {
    const key = arguments_[index];
    const value = arguments_[index + 1];
    if (!key?.startsWith("--") || !value) {
      throw new Error(
        "用法：tsx scripts/evaluate/materialize-catalog.ts --generated-at <ISO 时间> [--drafts-dir DIR] [--snapshots-dir DIR] [--candidates-dir DIR]",
      );
    }
    values.set(key, value);
  }

  const generatedAt = values.get("--generated-at");
  if (!generatedAt || Number.isNaN(Date.parse(generatedAt))) {
    throw new Error("--generated-at 必须是合法 ISO 时间");
  }

  return {
    generatedAt,
    draftsDirectory: path.resolve(values.get("--drafts-dir") ?? "data/editorial-drafts"),
    snapshotsDirectory: path.resolve(values.get("--snapshots-dir") ?? "data/snapshots"),
    candidatesDirectory: path.resolve(values.get("--candidates-dir") ?? "data/candidates"),
  };
}

async function readJsonFilesRecursively(directory: string): Promise<Array<{ file: string; value: unknown }>> {
  const entries = await readdir(directory, { withFileTypes: true });
  const records: Array<{ file: string; value: unknown }> = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      records.push(...(await readJsonFilesRecursively(file)));
    } else if (entry.isFile() && entry.name.endsWith(".json") && entry.name !== "rejections.json") {
      records.push({ file, value: JSON.parse(await readFile(file, "utf8")) as unknown });
    }
  }

  return records;
}

function parseDraft(value: unknown, file: string): EditorialDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${file} 不是对象`);
  }

  const draft = value as Record<string, unknown>;
  if (typeof draft.fullName !== "string" || !/^[^/\s]+\/[^/\s]+$/.test(draft.fullName)) {
    throw new Error(`${file} 缺少合法 fullName`);
  }
  if (!Array.isArray(draft.sourceUrls) || draft.sourceUrls.length === 0) {
    throw new Error(`${file} 至少需要一个 sourceUrls 证据`);
  }

  return draft as EditorialDraft;
}

function candidateFilename(snapshot: RepositorySnapshot): string {
  return `${snapshot.owner.login}-${snapshot.name}`.toLowerCase().replace(/[^a-z0-9.-]+/g, "-") + ".json";
}

async function writeAtomically(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, file);
}

async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));
  const snapshotRecords = await readJsonFilesRecursively(options.snapshotsDirectory);
  const snapshots = snapshotRecords.map(({ file, value }) => {
    const result = RepositorySnapshotSchema.safeParse(value);
    if (!result.success) throw new Error(`${file} 未通过 RepositorySnapshotSchema`);
    return result.data;
  });
  const snapshotsByName = new Map(
    snapshots.map((snapshot) => [snapshot.fullName.toLocaleLowerCase("en-US"), snapshot]),
  );
  const draftRecords = await readJsonFilesRecursively(options.draftsDirectory);

  if (draftRecords.length === 0) throw new Error("没有找到可物化的策展草案");

  const seenRepositoryIds = new Set<number>();
  for (const { file, value } of draftRecords) {
    const draft = parseDraft(value, file);
    const snapshot = snapshotsByName.get(draft.fullName.toLocaleLowerCase("en-US"));
    if (!snapshot) throw new Error(`${file} 找不到 ${draft.fullName} 的仓库快照`);
    if (seenRepositoryIds.has(snapshot.repositoryId)) {
      throw new Error(`${file} 对应的 repositoryId ${snapshot.repositoryId} 在草案中重复`);
    }
    seenRepositoryIds.add(snapshot.repositoryId);

    const { fullName: _fullName, sourceUrls, ...content } = draft;
    const candidate = EditorialProfileSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      repositoryId: snapshot.repositoryId,
      ...content,
      sources: sourceUrls.map((source) => ({ ...source, accessedAt: options.generatedAt })),
      provenance: {
        createdBy: "hybrid",
        generator: "open-source-radar-curated-catalog-v1",
        createdAt: options.generatedAt,
      },
      review: {
        state: "pending",
        reviewer: null,
        reviewedAt: null,
        notes: "批量策展草案已绑定事实快照，等待独立审核。",
      },
    });

    const output = path.join(options.candidatesDirectory, candidateFilename(snapshot));
    await writeAtomically(output, candidate);
    process.stdout.write(`materialized ${snapshot.fullName} -> ${path.relative(process.cwd(), output)}\n`);
  }

  process.stdout.write(`已物化 ${draftRecords.length} 份 pending 候选；没有生成发布记录。\n`);
}

await main();
