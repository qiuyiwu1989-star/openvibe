import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type { RepositoryLocator, RepositorySnapshot } from "../../packages/schema/src/index.js";

export function snapshotFileName(locator: RepositoryLocator): string {
  return `${safeSegment(locator.owner)}--${safeSegment(locator.name)}.json`;
}

export function snapshotPath(outputDirectory: string, locator: RepositoryLocator): string {
  return path.join(outputDirectory, snapshotFileName(locator));
}

export async function readStoredSnapshot(
  filePath: string,
): Promise<RepositorySnapshot | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as RepositorySnapshot;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeSnapshotAtomically(
  filePath: string,
  snapshot: RepositorySnapshot,
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;

  try {
    await writeFile(temporaryPath, `${JSON.stringify(snapshot, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    await rename(temporaryPath, filePath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}

function safeSegment(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_.-]/g, "-");
}
