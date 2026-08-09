import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
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

type CliOptions = {
  repositoryId: number;
  reviewer: string;
  reviewedAt: string;
};

function parseOptions(arguments_: string[]): CliOptions {
  const values = new Map<string, string>();

  for (let index = 0; index < arguments_.length; index += 2) {
    const key = arguments_[index];
    const value = arguments_[index + 1];
    if (!key?.startsWith("--") || !value) {
      throw new Error(
        "用法：npm run publish:local -- --repository-id <id> --reviewer <id> --reviewed-at <ISO 时间>",
      );
    }
    values.set(key, value);
  }

  const repositoryId = Number(values.get("--repository-id"));
  const reviewer = values.get("--reviewer");
  const reviewedAt = values.get("--reviewed-at");

  if (!Number.isSafeInteger(repositoryId) || repositoryId <= 0 || !reviewer || !reviewedAt) {
    throw new Error("repository-id、reviewer、reviewed-at 都是必填参数");
  }

  if (Number.isNaN(Date.parse(reviewedAt))) {
    throw new Error("reviewed-at 必须是合法 ISO 时间");
  }

  return { repositoryId, reviewer, reviewedAt };
}

async function findByRepositoryId<T>(
  directory: string,
  repositoryId: number,
  parse: (value: unknown) => T,
): Promise<T> {
  const files = (await readdir(directory)).filter((file) => file.endsWith(".json"));

  for (const file of files) {
    const value = JSON.parse(await readFile(path.join(directory, file), "utf8")) as unknown;
    const parsed = parse(value);
    if ((parsed as { repositoryId: number }).repositoryId === repositoryId) return parsed;
  }

  throw new Error(`目录 ${directory} 中没有 repositoryId=${repositoryId} 的记录`);
}

function projectSlug(snapshot: RepositorySnapshot): string {
  return snapshot.fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const options = parseOptions(process.argv.slice(2));
const projectRoot = process.cwd();
const snapshot = await findByRepositoryId<RepositorySnapshot>(
  path.join(projectRoot, "data/snapshots"),
  options.repositoryId,
  (value) => RepositorySnapshotSchema.parse(value),
);
const pendingEditorial = await findByRepositoryId<EditorialProfile>(
  path.join(projectRoot, "data/candidates"),
  options.repositoryId,
  (value) => EditorialProfileSchema.parse(value),
);

if (pendingEditorial.review.state !== "pending") {
  throw new Error("本命令只接受保持 pending 的原始候选内容");
}

const approvedEditorial = EditorialProfileSchema.parse({
  ...pendingEditorial,
  review: {
    state: "approved",
    reviewer: { kind: "agent", id: options.reviewer },
    reviewedAt: options.reviewedAt,
    notes: "阶段 1 本地纵向样板复核通过；不代表已获得公网发布授权。",
  },
});
const slug = projectSlug(snapshot);
const publication = PublicationRecordSchema.parse({
  schemaVersion: SCHEMA_VERSION,
  repositoryId: options.repositoryId,
  slug,
  status: "published",
  featured: false,
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
const outputDirectory = path.join(projectRoot, "data/projects");
const outputPath = path.join(outputDirectory, `${slug}.json`);

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
console.log(`已生成本地发布 bundle：${path.relative(projectRoot, outputPath)}`);
