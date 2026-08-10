import path from "node:path";

import { reviewUpdate, type ReviewUpdateOptions } from "./review.js";

async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));
  const decision = await reviewUpdate(options);
  process.stdout.write(`${JSON.stringify({
    status: decision.decision,
    repositoryId: decision.repositoryId,
    applied: decision.applied,
    decisionRecorded: true,
  })}\n`);
}

function parseArguments(args: string[]): ReviewUpdateOptions {
  const values = new Map<string, string>();
  let allowHighRisk = false;
  const allowed = new Set([
    "--queue",
    "--repository-id",
    "--decision",
    "--reviewer",
    "--reviewer-kind",
    "--reviewed-at",
    "--notes",
    "--snapshots-dir",
    "--projects-dir",
    "--decisions-dir",
    "--history",
  ]);

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--help") {
      process.stdout.write(
        "用法: tsx scripts/updates/review-cli.ts --repository-id ID --decision approve|reject " +
          "--reviewer ID --reviewed-at ISO --notes TEXT [--reviewer-kind human|agent] " +
          "[--allow-high-risk]\n",
      );
      process.exit(0);
    }
    if (argument === "--allow-high-risk") {
      allowHighRisk = true;
      continue;
    }
    if (!argument || !allowed.has(argument)) throw new Error(`未知参数：${argument ?? ""}`);
    const value = args[index + 1];
    if (!argument?.startsWith("--") || !value) {
      throw new Error("所有参数都必须使用 --key value 格式");
    }
    values.set(argument, value);
    index += 1;
  }

  const repositoryId = Number(values.get("--repository-id"));
  const decisionValue = values.get("--decision");
  const reviewerId = values.get("--reviewer");
  const reviewerKind = values.get("--reviewer-kind") ?? "human";
  const decidedAt = values.get("--reviewed-at");
  const notes = values.get("--notes");
  if (!Number.isInteger(repositoryId) || repositoryId <= 0) {
    throw new Error("--repository-id 必须是正整数");
  }
  if (decisionValue !== "approve" && decisionValue !== "reject") {
    throw new Error("--decision 只能是 approve 或 reject");
  }
  if (!reviewerId || !decidedAt || Number.isNaN(Date.parse(decidedAt)) || !notes) {
    throw new Error("--reviewer、--reviewed-at 和 --notes 都是必填参数");
  }
  if (reviewerKind !== "human" && reviewerKind !== "agent") {
    throw new Error("--reviewer-kind 只能是 human 或 agent");
  }

  return {
    queuePath: path.resolve(values.get("--queue") ?? "data/updates/latest/queue.json"),
    repositoryId,
    decision: decisionValue === "approve" ? "approved" : "rejected",
    reviewer: { kind: reviewerKind, id: reviewerId },
    decidedAt,
    notes,
    allowHighRisk,
    snapshotsDirectory: path.resolve(values.get("--snapshots-dir") ?? "data/snapshots"),
    projectsDirectory: path.resolve(values.get("--projects-dir") ?? "data/projects"),
    decisionsDirectory: path.resolve(values.get("--decisions-dir") ?? "data/updates/decisions"),
    historyPath: path.resolve(values.get("--history") ?? "data/updates/history.json"),
  };
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "更新审核 CLI 失败"}\n`);
  process.exitCode = 1;
});
