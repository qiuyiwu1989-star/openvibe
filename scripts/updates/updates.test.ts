import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  RadarProjectBundleSchema,
  RepositorySnapshotSchema,
  SCHEMA_VERSION,
  UpdateQueueSchema,
  type IngestOutcome,
} from "../../packages/schema/src/index.js";
import { reviewUpdate } from "./review.js";
import {
  UpdateScanFailedError,
  classifySnapshotChanges,
  scanRepositoryUpdates,
} from "./scan.js";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const baseline = RepositorySnapshotSchema.parse(
  JSON.parse(
    await readFile(path.join(projectRoot, "data/snapshots/actualbudget--actual.json"), "utf8"),
  ) as unknown,
);

test("将许可证、README、改名和指标变化分类为待审事件", () => {
  const current = structuredClone(baseline);
  current.fullName = "actualbudget/actual-next";
  current.name = "actual-next";
  current.metrics.stars += 1;
  current.license = { spdxId: "Apache-2.0", name: "Apache License 2.0", url: null };
  if (!current.readme) throw new Error("测试快照缺少 README");
  current.readme.sha = "a".repeat(40);

  const kinds = classifySnapshotChanges(
    baseline,
    current,
    new Date("2026-08-11T00:00:00Z"),
    5000,
  );
  assert.deepEqual(kinds, [
    "repository_renamed",
    "license_changed",
    "readme_changed",
    "metrics_changed",
  ]);
});

test("扫描把候选快照与队列一起原子写入", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "openvibe-update-scan-"));
  const snapshotsDirectory = path.join(root, "snapshots");
  const outputDirectory = path.join(root, "updates/latest");
  await mkdir(snapshotsDirectory, { recursive: true });
  await writeJson(path.join(snapshotsDirectory, "actualbudget--actual.json"), baseline);
  const current = structuredClone(baseline);
  current.metrics.stars += 5;
  current.timestamps.fetchedAt = "2026-08-11T00:00:00Z";
  current.source.etag = '"new-etag"';

  const queue = await scanRepositoryUpdates({
    snapshotsDirectory,
    outputDirectory,
    staleAfterDays: 5000,
    now: () => new Date("2026-08-11T00:00:00Z"),
    ingest: async () => ({ status: "changed", snapshot: current }),
  });

  assert.deepEqual(queue.summary, { checked: 1, unchanged: 0, review: 1, failed: 0 });
  assert.deepEqual(queue.entries[0]?.changeKinds, ["metrics_changed"]);
  assert.equal(queue.entries[0]?.risk, "low");
  UpdateQueueSchema.parse(
    JSON.parse(await readFile(path.join(outputDirectory, "queue.json"), "utf8")) as unknown,
  );
  RepositorySnapshotSchema.parse(
    JSON.parse(
      await readFile(path.join(outputDirectory, "candidates/actualbudget--actual.json"), "utf8"),
    ) as unknown,
  );
});

test("任一仓库扫描失败时保留上一版队列", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "openvibe-update-failure-"));
  const snapshotsDirectory = path.join(root, "snapshots");
  const outputDirectory = path.join(root, "updates/latest");
  await mkdir(snapshotsDirectory, { recursive: true });
  await mkdir(outputDirectory, { recursive: true });
  await writeJson(path.join(snapshotsDirectory, "actualbudget--actual.json"), baseline);
  await writeFile(path.join(outputDirectory, "preserved.txt"), "previous", "utf8");
  const failed: IngestOutcome = {
    status: "failed",
    error: {
      code: "rate_limited",
      message: "rate limited",
      status: 429,
      retryable: true,
      retryAt: null,
      retryAfterSeconds: 60,
    },
  };

  await assert.rejects(
    scanRepositoryUpdates({
      snapshotsDirectory,
      outputDirectory,
      staleAfterDays: 365,
      ingest: async () => failed,
    }),
    UpdateScanFailedError,
  );
  assert.equal(await readFile(path.join(outputDirectory, "preserved.txt"), "utf8"), "previous");
});

test("长期无提交的仓库即使 304 也进入维护风险队列", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "openvibe-update-stale-"));
  const snapshotsDirectory = path.join(root, "snapshots");
  const outputDirectory = path.join(root, "updates/latest");
  const stale = structuredClone(baseline);
  stale.timestamps.pushedAt = "2020-01-01T00:00:00Z";
  stale.source.etag = '"known"';
  await mkdir(snapshotsDirectory, { recursive: true });
  await writeJson(path.join(snapshotsDirectory, "actualbudget--actual.json"), stale);

  const queue = await scanRepositoryUpdates({
    snapshotsDirectory,
    outputDirectory,
    staleAfterDays: 365,
    now: () => new Date("2026-08-11T00:00:00Z"),
    ingest: async () => ({
      status: "not_modified",
      repositoryId: stale.repositoryId,
      checkedAt: "2026-08-11T00:00:00Z",
      etag: '"known"',
    }),
  });

  assert.deepEqual(queue.entries[0]?.changeKinds, ["maintenance_risk"]);
  assert.equal(queue.entries[0]?.candidatePath, null);
});

test("低风险更新批准后同步快照、发布 bundle 与决定记录", async () => {
  const sourceProject = RadarProjectBundleSchema.parse(
    JSON.parse(
      await readFile(path.join(projectRoot, "data/projects/actualbudget-actual.json"), "utf8"),
    ) as unknown,
  );
  const root = await mkdtemp(path.join(os.tmpdir(), "openvibe-update-review-"));
  const snapshotsDirectory = path.join(root, "snapshots");
  const projectsDirectory = path.join(root, "projects");
  const queueDirectory = path.join(root, "updates/latest");
  const decisionsDirectory = path.join(root, "updates/decisions");
  const historyPath = path.join(root, "updates/history.json");
  await mkdir(path.join(queueDirectory, "candidates"), { recursive: true });
  await mkdir(snapshotsDirectory, { recursive: true });
  await mkdir(projectsDirectory, { recursive: true });
  const candidate = structuredClone(sourceProject.snapshot);
  candidate.metrics.stars += 7;
  candidate.timestamps.fetchedAt = "2026-08-11T00:00:00Z";
  await writeJson(path.join(snapshotsDirectory, "actualbudget--actual.json"), sourceProject.snapshot);
  await writeJson(path.join(projectsDirectory, "actualbudget-actual.json"), sourceProject);
  await writeJson(path.join(queueDirectory, "candidates/actualbudget--actual.json"), candidate);
  await writeJson(path.join(queueDirectory, "queue.json"), UpdateQueueSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    generatedAt: "2026-08-11T00:00:00Z",
    staleAfterDays: 365,
    summary: { checked: 1, unchanged: 0, review: 1, failed: 0 },
    entries: [{
      repositoryId: candidate.repositoryId,
      fullName: candidate.fullName,
      previousFullName: sourceProject.snapshot.fullName,
      snapshotFile: "actualbudget--actual.json",
      candidatePath: "candidates/actualbudget--actual.json",
      detectedAt: "2026-08-11T00:00:00Z",
      risk: "low",
      changeKinds: ["metrics_changed"],
      reviewState: "review",
    }],
    failures: [],
  }));

  const decision = await reviewUpdate({
    queuePath: path.join(queueDirectory, "queue.json"),
    repositoryId: candidate.repositoryId,
    decision: "approved",
    reviewer: { kind: "human", id: "test-reviewer" },
    decidedAt: "2026-08-11T01:00:00Z",
    notes: "指标变化已核对。",
    allowHighRisk: false,
    snapshotsDirectory,
    projectsDirectory,
    decisionsDirectory,
    historyPath,
  });

  assert.equal(decision.applied, true);
  const updatedSnapshot = RepositorySnapshotSchema.parse(
    JSON.parse(await readFile(path.join(snapshotsDirectory, "actualbudget--actual.json"), "utf8")),
  );
  const updatedProject = RadarProjectBundleSchema.parse(
    JSON.parse(await readFile(path.join(projectsDirectory, "actualbudget-actual.json"), "utf8")),
  );
  assert.equal(updatedSnapshot.metrics.stars, candidate.metrics.stars);
  assert.equal(updatedProject.snapshot.metrics.stars, candidate.metrics.stars);
  assert.equal(updatedProject.publication.lastReviewedAt, "2026-08-11T01:00:00Z");
  assert.equal((await readdir(decisionsDirectory)).length, 1);
  const history = JSON.parse(await readFile(historyPath, "utf8")) as { entries: unknown[] };
  assert.equal(history.entries.length, 1);
});

test("高风险许可证变更不能被普通批准", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "openvibe-update-high-risk-"));
  const queuePath = path.join(root, "latest/queue.json");
  await writeJson(queuePath, UpdateQueueSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    generatedAt: "2026-08-11T00:00:00Z",
    staleAfterDays: 365,
    summary: { checked: 1, unchanged: 0, review: 1, failed: 0 },
    entries: [{
      repositoryId: baseline.repositoryId,
      fullName: baseline.fullName,
      previousFullName: baseline.fullName,
      snapshotFile: "actualbudget--actual.json",
      candidatePath: "candidates/actualbudget--actual.json",
      detectedAt: "2026-08-11T00:00:00Z",
      risk: "high",
      changeKinds: ["license_changed"],
      reviewState: "review",
    }],
    failures: [],
  }));

  await assert.rejects(
    reviewUpdate({
      queuePath,
      repositoryId: baseline.repositoryId,
      decision: "approved",
      reviewer: { kind: "human", id: "test-reviewer" },
      decidedAt: "2026-08-11T01:00:00Z",
      notes: "还没有独立复核许可证。",
      allowHighRisk: false,
      snapshotsDirectory: path.join(root, "snapshots"),
      projectsDirectory: path.join(root, "projects"),
      decisionsDirectory: path.join(root, "decisions"),
      historyPath: path.join(root, "history.json"),
    }),
    /--allow-high-risk/,
  );
});

async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
