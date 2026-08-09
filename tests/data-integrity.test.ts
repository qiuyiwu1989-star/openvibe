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
  "Nutlope/llamacoder",
  "vercel/chatbot",
  "FlowiseAI/Flowise",
  "langflow-ai/langflow",
  "calcom/cal.diy",
  "dubinc/dub",
  "documenso/documenso",
  "twentyhq/twenty",
  "gitroomhq/postiz-app",
  "formbricks/formbricks",
  "makeplane/plane",
  "usememos/memos",
  "siyuan-note/siyuan",
  "excalidraw/excalidraw",
  "penpot/penpot",
  "AppFlowy-IO/AppFlowy",
  "appwrite/appwrite",
  "supabase/supabase",
  "gristlabs/grist-core",
  "triggerdotdev/trigger.dev",
  "slidevjs/slidev",
  "ChatGPTNextWeb/NextChat",
  "karakeep-app/karakeep",
  "immich-app/immich",
  "pocketbase/pocketbase",
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

test("30 个 MVP 快照全部合法、可学习且仓库身份不重复", async () => {
  const records = await readJsonDirectory(path.join(projectRoot, "data/snapshots"));
  const snapshots: RepositorySnapshot[] = [];

  for (const record of records) {
    const parsed = RepositorySnapshotSchema.safeParse(record.value);
    assert.equal(parsed.success, true, `${record.file} 未通过 RepositorySnapshotSchema`);
    if (parsed.success) snapshots.push(parsed.data);
  }

  assert.deepEqual(new Set(snapshots.map((snapshot) => snapshot.fullName)), expectedRepositories);
  assert.equal(new Set(snapshots.map((snapshot) => snapshot.repositoryId)).size, snapshots.length);

  for (const snapshot of snapshots) {
    assert.equal(snapshot.visibility, "public");
    assert.equal(snapshot.isFork, false, `${snapshot.fullName} 不应是 fork`);
    assert.equal(snapshot.archived, false, `${snapshot.fullName} 不应已归档`);
    assert.equal(snapshot.disabled, false, `${snapshot.fullName} 不应已禁用`);
    assert.ok(snapshot.license, `${snapshot.fullName} 缺少已核实许可证`);
    assert.ok(snapshot.readme, `${snapshot.fullName} 缺少 README 学习证据`);
  }
});

test("30 份候选策展内容合法、保持待审核，并能与快照一一关联", async () => {
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

test("30 个本地发布 bundle 全部通过审核门并达到内容覆盖目标", async () => {
  const projectRecords = await readJsonDirectory(path.join(projectRoot, "data/projects"));
  const projects = projectRecords.map((record) => {
    const parsed = RadarProjectBundleSchema.safeParse(record.value);
    assert.equal(parsed.success, true, `${record.file} 未通过 RadarProjectBundleSchema`);
    if (!parsed.success) throw new Error(`${record.file} 无法继续校验`);
    return parsed.data;
  });

  assert.equal(projects.length, expectedRepositories.size);
  assert.deepEqual(new Set(projects.map((project) => project.snapshot.fullName)), expectedRepositories);
  assert.equal(new Set(projects.map((project) => project.publication.slug)).size, projects.length);

  for (const project of projects) {
    assert.equal(project.publication.status, "published");
    assert.equal(project.editorial.review.state, "approved");
    assert.equal(project.editorial.review.reviewer?.id, "codex-main-agent");
  }

  const categories = new Set(projects.flatMap((project) => project.editorial.categories));
  const learningGoals = new Set(projects.flatMap((project) => project.editorial.learningGoals));
  assert.ok(categories.size >= 6, `项目类型覆盖不足：${categories.size}/6`);
  assert.ok(learningGoals.size >= 8, `学习目标覆盖不足：${learningGoals.size}/8`);
});
