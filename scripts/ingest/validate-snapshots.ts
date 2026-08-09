import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { RepositorySnapshotSchema } from "../../packages/schema/src/index.js";

const directory = path.resolve(process.argv[2] ?? "data/snapshots");
const files = (await readdir(directory)).filter((file) => file.endsWith(".json")).sort();

if (files.length === 0) throw new Error(`没有找到快照：${directory}`);

for (const file of files) {
  const value: unknown = JSON.parse(await readFile(path.join(directory, file), "utf8"));
  RepositorySnapshotSchema.parse(value);
  process.stdout.write(`valid ${file}\n`);
}
