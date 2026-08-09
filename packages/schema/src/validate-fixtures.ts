import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { RadarProjectBundleSchema } from "./schemas.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixtureDirectory = path.resolve(currentDirectory, "../../../data/fixtures/projects");
const fixtureFiles = (await readdir(fixtureDirectory)).filter((file) => file.endsWith(".json"));

if (fixtureFiles.length === 0) {
  throw new Error(`没有找到 fixture：${fixtureDirectory}`);
}

for (const fixtureFile of fixtureFiles) {
  const fixturePath = path.join(fixtureDirectory, fixtureFile);
  const rawFixture = JSON.parse(await readFile(fixturePath, "utf8")) as unknown;
  const result = RadarProjectBundleSchema.safeParse(rawFixture);

  if (!result.success) {
    console.error(`fixture 校验失败：${fixtureFile}`);
    console.error(result.error.format());
    process.exitCode = 1;
    continue;
  }

  console.log(`fixture 校验通过：${fixtureFile}`);
}

