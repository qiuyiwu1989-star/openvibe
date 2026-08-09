import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { MissingGitHubTokenError, readDiscoveryConfig, requireGitHubToken } from "./config.js";
import { createDiscoveryClient, discoverRepositories } from "./discover.js";
import { DiscoveryFailureSchema } from "./schema.js";

async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));
  const config = await readDiscoveryConfig(options.configPath);
  const generatedAt = new Date().toISOString();

  let token: string;
  try {
    token = requireGitHubToken(process.env.GITHUB_TOKEN);
  } catch (error) {
    if (!(error instanceof MissingGitHubTokenError)) throw error;
    const failure = DiscoveryFailureSchema.parse({
      schemaVersion: "1.0.0",
      status: "failed",
      generatedAt,
      error: {
        code: "missing_token",
        message: error.message,
        status: null,
        retryable: false,
        retryAt: null,
        retryAfterSeconds: null,
      },
    });
    process.stderr.write(`${JSON.stringify(failure)}\n`);
    process.exitCode = 1;
    return;
  }

  const outcome = await discoverRepositories(config, createDiscoveryClient(token));
  if (outcome.status === "failed") {
    process.stderr.write(`${JSON.stringify(outcome)}\n`);
    process.exitCode = 1;
    return;
  }

  await writeJsonAtomically(options.outputPath, outcome);
  process.stdout.write(
    `${JSON.stringify({
      status: "success",
      output: options.outputPath,
      summary: outcome.summary,
    })}\n`,
  );
}

function parseArguments(args: string[]): { configPath: string; outputPath: string } {
  let configPath = path.resolve("data/discovery/config.json");
  let outputPath = path.resolve("data/discovery/queue.json");

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--config" || argument === "--output") {
      const value = args[index + 1];
      if (!value) throw new Error(`${argument} 需要路径参数`);
      if (argument === "--config") configPath = path.resolve(value);
      else outputPath = path.resolve(value);
      index += 1;
    } else if (argument === "--help") {
      process.stdout.write(
        "用法: tsx scripts/discover/cli.ts [--config FILE] [--output FILE]\n" +
          "需要通过 GITHUB_TOKEN 环境变量提供 GitHub 令牌。\n",
      );
      process.exit(0);
    } else {
      throw new Error(`未知参数：${argument}`);
    }
  }

  return { configPath, outputPath };
}

async function writeJsonAtomically(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    await rename(temporaryPath, filePath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}

main().catch((error) => {
  process.stderr.write(
    `${JSON.stringify({
      status: "failed",
      error: {
        code: "invalid_response",
        message: error instanceof Error ? error.message : "自动发现 CLI 执行失败",
      },
    })}\n`,
  );
  process.exitCode = 1;
});
