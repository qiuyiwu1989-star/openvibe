import path from "node:path";

import { UpdateScanFailedError, scanRepositoryUpdates } from "./scan.js";

type Options = {
  snapshotsDirectory: string;
  outputDirectory: string;
  staleAfterDays: number;
};

async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));
  if (!process.env.GITHUB_TOKEN?.trim()) {
    throw new Error("缺少 GITHUB_TOKEN；更新扫描不会回显令牌内容");
  }

  try {
    const queue = await scanRepositoryUpdates(options);
    process.stdout.write(`${JSON.stringify({
      status: "success",
      output: path.join(options.outputDirectory, "queue.json"),
      summary: queue.summary,
    })}\n`);
  } catch (error) {
    if (error instanceof UpdateScanFailedError) {
      process.stderr.write(`${JSON.stringify({
        status: "failed",
        previousQueuePreserved: true,
        summary: error.queue.summary,
        failures: error.queue.failures,
      })}\n`);
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}

function parseArguments(args: string[]): Options {
  let snapshotsDirectory = path.resolve("data/snapshots");
  let outputDirectory = path.resolve("data/updates/latest");
  let staleAfterDays = 365;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--snapshots-dir" || argument === "--output-dir" || argument === "--stale-days") {
      const value = args[index + 1];
      if (!value) throw new Error(`${argument} 需要参数`);
      if (argument === "--snapshots-dir") snapshotsDirectory = path.resolve(value);
      else if (argument === "--output-dir") outputDirectory = path.resolve(value);
      else {
        staleAfterDays = Number(value);
        if (!Number.isInteger(staleAfterDays) || staleAfterDays <= 0) {
          throw new Error("--stale-days 必须是正整数");
        }
      }
      index += 1;
    } else if (argument === "--help") {
      process.stdout.write(
        "用法: tsx scripts/updates/scan-cli.ts [--snapshots-dir DIR] [--output-dir DIR] [--stale-days N]\n" +
          "需要 GITHUB_TOKEN；结果只产生待审队列，不会更新公开项目。\n",
      );
      process.exit(0);
    } else {
      throw new Error(`未知参数：${argument}`);
    }
  }

  return { snapshotsDirectory, outputDirectory, staleAfterDays };
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "更新扫描 CLI 失败"}\n`);
  process.exitCode = 1;
});
