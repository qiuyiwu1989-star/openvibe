import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  EditorialProfileSchema,
  RadarProjectBundleSchema,
  RepositorySnapshotSchema,
  type EditorialProfile,
  type RepositorySnapshot,
} from "../packages/schema/src/index.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");

const expectedRepositories = new Set([
  "Nutlope/roomGPT",
  "nextjs/saas-starter",
  "browser-use/web-ui",
  "openstatusHQ/openstatus",
  "actualbudget/actual",
]);

async function readJsonDirectory(directory: string): Promise<Array<{ file: string; value: unknown }>> {
  const entries = await readdir(directory, { withFileTypes: true });
  const jsonFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json"));

  return Promise.all(
    jsonFiles.map(async (entry) => ({
      file: entry.name,
      value: JSON.parse(await readFile(path.join(directory, entry.name), "utf8")) as unknown,
    })),
  );
}

test("5 个阶段 1 快照全部合法且仓库身份不重复", async () => {
  const records = await readJsonDirectory(path.join(projectRoot, "data/snapshots"));
  const snapshots: RepositorySnapshot[] = [];

  for (const record of records) {
    const parsed = RepositorySnapshotSchema.safeParse(record.value);
    assert.equal(parsed.success, true, `${record.file} 未通过 RepositorySnapshotSchema`);
    if (parsed.success) snapshots.push(parsed.data);
  }

  assert.deepEqual(new Set(snapshots.map((snapshot) => snapshot.fullName)), expectedRepositories);
  assert.equal(new Set(snapshots.map((snapshot) => snapshot.repositoryId)).size, snapshots.length);
});

test("5 份候选策展内容合法、保持待审核，并能与快照一一关联", async () => {
  const snapshotRecords = await readJsonDirectory(path.join(projectRoot, "data/snapshots"));
  const candidateRecords = await readJsonDirectory(path.join(projectRoot, "data/candidates"));
  const snapshotIds = new Set(
    snapshotRecords.map((record) => RepositorySnapshotSchema.parse(record.value).repositoryId),
  );
  const editorials: EditorialProfile[] = [];

  for (const record of candidateRecords) {
    const parsed = EditorialProfileSchema.safeParse(record.value);
    assert.equal(parsed.success, true, `${record.file} 未通过 EditorialProfileSchema`);
    if (!parsed.success) continue;

    editorials.push(parsed.data);
    assert.equal(parsed.data.review.state, "pending", `${record.file} 不应绕过审核门`);
    assert.equal(snapshotIds.has(parsed.data.repositoryId), true, `${record.file} 找不到对应快照`);
  }

  assert.equal(editorials.length, expectedRepositories.size);
  assert.equal(new Set(editorials.map((editorial) => editorial.repositoryId)).size, editorials.length);
});

test("5 个本地发布 bundle 全部通过审核门且覆盖既定样板", async () => {
  const projectRecords = await readJsonDirectory(path.join(projectRoot, "data/projects"));
  const projects = projectRecords.map((record) => {
    const parsed = RadarProjectBundleSchema.safeParse(record.value);
    assert.equal(parsed.success, true, `${record.file} 未通过 RadarProjectBundleSchema`);
    if (!parsed.success) throw new Error(`${record.file} 无法继续校验`);
    return parsed.data;
  });

  assert.equal(projects.length, expectedRepositories.size);
  assert.deepEqual(new Set(projects.map((project) => project.snapshot.fullName)), expectedRepositories);

  for (const project of projects) {
    assert.equal(project.publication.status, "published");
    assert.equal(project.editorial.review.state, "approved");
    assert.equal(project.editorial.review.reviewer?.id, "codex-main-agent");
  }
});
