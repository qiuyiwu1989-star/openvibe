import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  RadarProjectBundleSchema,
  RepositorySnapshotSchema,
  SCHEMA_VERSION,
  UpdateDecisionSchema,
  UpdateHistorySchema,
  UpdateQueueSchema,
  type UpdateDecision,
} from "../../packages/schema/src/index.js";

export type ReviewUpdateOptions = {
  queuePath: string;
  repositoryId: number;
  decision: "approved" | "rejected";
  reviewer: { kind: "human" | "agent"; id: string };
  decidedAt: string;
  notes: string;
  allowHighRisk: boolean;
  snapshotsDirectory: string;
  projectsDirectory: string;
  decisionsDirectory: string;
  historyPath: string;
};

export async function reviewUpdate(options: ReviewUpdateOptions): Promise<UpdateDecision> {
  const queue = UpdateQueueSchema.parse(
    JSON.parse(await readFile(options.queuePath, "utf8")) as unknown,
  );
  const entry = queue.entries.find((candidate) => candidate.repositoryId === options.repositoryId);
  if (!entry) throw new Error(`队列中找不到 repositoryId=${options.repositoryId}`);
  if (options.decision === "approved" && entry.risk === "high" && !options.allowHighRisk) {
    throw new Error("高风险更新需要显式传入 --allow-high-risk 才能批准");
  }

  const applied = options.decision === "approved" && entry.candidatePath !== null;
  const decision = UpdateDecisionSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    repositoryId: entry.repositoryId,
    fullName: entry.fullName,
    queueGeneratedAt: queue.generatedAt,
    decision: options.decision,
    reviewer: options.reviewer,
    decidedAt: options.decidedAt,
    notes: options.notes,
    applied,
    changeKinds: entry.changeKinds,
  });
  const decisionFile = path.join(
    options.decisionsDirectory,
    `${safeTimestamp(options.decidedAt)}-${entry.repositoryId}.json`,
  );
  const writes: Array<{ target: string; value: unknown }> = [{ target: decisionFile, value: decision }];

  if (applied && entry.candidatePath) {
    const queueDirectory = path.dirname(options.queuePath);
    const candidatePath = path.resolve(queueDirectory, entry.candidatePath);
    if (!candidatePath.startsWith(`${path.resolve(queueDirectory)}${path.sep}`)) {
      throw new Error("候选快照路径越界");
    }
    const snapshot = RepositorySnapshotSchema.parse(
      JSON.parse(await readFile(candidatePath, "utf8")) as unknown,
    );
    if (snapshot.repositoryId !== entry.repositoryId) {
      throw new Error("候选快照与队列 repositoryId 不一致");
    }

    const projectRecord = await findProject(options.projectsDirectory, entry.repositoryId);
    const updatedBundle = RadarProjectBundleSchema.parse({
      ...projectRecord.bundle,
      snapshot,
      publication: {
        ...projectRecord.bundle.publication,
        lastReviewedAt: options.decidedAt,
      },
    });
    const history = await readHistory(options.historyPath);
    const historyEntry = {
      id: `${safeTimestamp(options.decidedAt)}-${entry.repositoryId}`,
      kind: "repository_update" as const,
      publishedAt: options.decidedAt,
      title: `${snapshot.fullName} 项目信息已更新`,
      summary: `已经审核并同步：${entry.changeKinds.map(changeKindLabel).join("、")}。`,
      repositoryId: entry.repositoryId,
      projectSlug: updatedBundle.publication.slug,
      changeKinds: entry.changeKinds,
    };
    const updatedHistory = UpdateHistorySchema.parse({
      ...history,
      entries: [historyEntry, ...history.entries.filter((item) => item.id !== historyEntry.id)].slice(0, 500),
    });
    writes.unshift(
      { target: path.join(options.snapshotsDirectory, entry.snapshotFile), value: snapshot },
      { target: projectRecord.file, value: updatedBundle },
      { target: options.historyPath, value: updatedHistory },
    );
  }

  await writeJsonGroupAtomically(writes);
  return decision;
}

async function readHistory(file: string) {
  try {
    return UpdateHistorySchema.parse(JSON.parse(await readFile(file, "utf8")) as unknown);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return UpdateHistorySchema.parse({ schemaVersion: SCHEMA_VERSION, entries: [] });
    }
    throw error;
  }
}

function changeKindLabel(kind: UpdateDecision["changeKinds"][number]): string {
  const labels: Record<UpdateDecision["changeKinds"][number], string> = {
    repository_renamed: "仓库名称",
    default_branch_changed: "默认分支",
    description_changed: "项目介绍",
    license_changed: "许可证",
    readme_changed: "README",
    technology_changed: "技术栈",
    activity_changed: "活跃信息",
    metrics_changed: "GitHub 指标",
    availability_changed: "可用状态",
    maintenance_risk: "维护风险",
  };
  return labels[kind];
}

async function findProject(directory: string, repositoryId: number) {
  const files = (await readdir(directory)).filter((file) => file.endsWith(".json")).sort();
  for (const name of files) {
    const file = path.join(directory, name);
    const parsed = RadarProjectBundleSchema.parse(
      JSON.parse(await readFile(file, "utf8")) as unknown,
    );
    if (parsed.snapshot.repositoryId === repositoryId) return { file, bundle: parsed };
  }
  throw new Error(`找不到 repositoryId=${repositoryId} 的发布 bundle`);
}

async function writeJsonGroupAtomically(
  writes: Array<{ target: string; value: unknown }>,
): Promise<void> {
  const staged: Array<{
    target: string;
    temporary: string;
    backup: string;
    hadExisting: boolean;
    installed: boolean;
  }> = [];

  try {
    for (const [index, write] of writes.entries()) {
      await mkdir(path.dirname(write.target), { recursive: true });
      const temporary = `${write.target}.tmp-${process.pid}-${Date.now()}-${index}`;
      const backup = `${write.target}.backup-${process.pid}-${Date.now()}-${index}`;
      await writeFile(temporary, `${JSON.stringify(write.value, null, 2)}\n`, {
        encoding: "utf8",
        flag: "wx",
      });
      staged.push({ target: write.target, temporary, backup, hadExisting: false, installed: false });
    }

    for (const item of staged) {
      try {
        await rename(item.target, item.backup);
        item.hadExisting = true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      await rename(item.temporary, item.target);
      item.installed = true;
    }

    await Promise.all(staged.map((item) => rm(item.backup, { force: true })));
  } catch (error) {
    for (const item of [...staged].reverse()) {
      await rm(item.temporary, { force: true });
      if (item.installed) await rm(item.target, { force: true });
      if (item.hadExisting) {
        await rename(item.backup, item.target).catch(() => undefined);
      }
    }
    throw error;
  }
}

function safeTimestamp(value: string): string {
  return value.replace(/[^0-9a-z]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}
