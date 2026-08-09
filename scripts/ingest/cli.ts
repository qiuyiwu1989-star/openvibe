import path from "node:path";

import { parseRepositoryLocator, STAGE_ONE_REPOSITORIES } from "../discover/seeds.js";
import { ingestRepository } from "./ingest.js";
import { readStoredSnapshot, snapshotPath, writeSnapshotAtomically } from "./storage.js";

type CliOptions = {
  locators: Array<{ owner: string; name: string }>;
  outputDirectory: string;
  force: boolean;
  rawReadme: boolean;
};

async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));
  let failures = 0;

  // Sequential by design: do not fan out requests against GitHub's API.
  for (const locator of options.locators) {
    const filePath = snapshotPath(options.outputDirectory, locator);
    const previous = await readStoredSnapshot(filePath);
    const outcome = await ingestRepository({
      locator,
      force: options.force,
      ifNoneMatch: previous?.source.etag ?? undefined,
      knownRepositoryId: previous?.repositoryId,
    }, undefined, undefined, { readmeMode: options.rawReadme ? "raw" : "api" });

    if (outcome.status === "changed") {
      await writeSnapshotAtomically(filePath, outcome.snapshot);
      process.stdout.write(`changed ${outcome.snapshot.fullName} -> ${filePath}\n`);
      continue;
    }

    if (outcome.status === "not_modified") {
      process.stdout.write(`not_modified ${locator.owner}/${locator.name}\n`);
      continue;
    }

    failures += 1;
    process.stderr.write(
      `${JSON.stringify({
        repository: `${locator.owner}/${locator.name}`,
        status: outcome.status,
        error: outcome.error,
        previousSnapshotPreserved: previous !== null,
      })}\n`,
    );
  }

  if (failures > 0) process.exitCode = 1;
}

function parseArguments(args: string[]): CliOptions {
  const repositoryArguments: string[] = [];
  let outputDirectory = path.resolve("data/snapshots");
  let force = false;
  let rawReadme = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--force") {
      force = true;
    } else if (argument === "--raw-readme") {
      rawReadme = true;
    } else if (argument === "--output-dir") {
      const value = args[index + 1];
      if (!value) throw new Error("--output-dir 需要目录参数");
      outputDirectory = path.resolve(value);
      index += 1;
    } else if (argument === "--help") {
      process.stdout.write(
        "用法: tsx scripts/ingest/cli.ts [owner/name ...] [--force] [--raw-readme] [--output-dir DIR]\n" +
          "未提供仓库时抓取阶段 1 的五个样板仓库。\n",
      );
      process.exit(0);
    } else if (argument.startsWith("-")) {
      throw new Error(`未知参数：${argument}`);
    } else {
      repositoryArguments.push(argument);
    }
  }

  return {
    locators:
      repositoryArguments.length > 0
        ? repositoryArguments.map(parseRepositoryLocator)
        : [...STAGE_ONE_REPOSITORIES],
    outputDirectory,
    force,
    rawReadme,
  };
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "CLI 执行失败"}\n`);
  process.exitCode = 1;
});
