import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { EditorialProfileSchema } from "../../packages/schema/src/index.js";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const candidatesDirectory = join(scriptDirectory, "../../data/candidates");

async function validateCandidates() {
  const filenames = (await readdir(candidatesDirectory))
    .filter((filename) => filename.endsWith(".json"))
    .sort();

  if (filenames.length === 0) {
    throw new Error(`没有在 ${candidatesDirectory} 找到候选 JSON`);
  }

  const repositoryIds = new Set<number>();

  for (const filename of filenames) {
    const filePath = join(candidatesDirectory, filename);
    const raw = await readFile(filePath, "utf8");
    const parsed = EditorialProfileSchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      console.error(`❌ ${filename}`);
      console.error(parsed.error.issues);
      process.exitCode = 1;
      continue;
    }

    const candidate = parsed.data;
    if (candidate.review.state !== "pending") {
      console.error(`❌ ${filename}: review.state 必须为 pending`);
      process.exitCode = 1;
      continue;
    }

    if (repositoryIds.has(candidate.repositoryId)) {
      console.error(`❌ ${filename}: repositoryId ${candidate.repositoryId} 重复`);
      process.exitCode = 1;
      continue;
    }

    repositoryIds.add(candidate.repositoryId);
    console.log(`✅ ${filename} — ${candidate.displayName} (${candidate.score.total}/100)`);
  }

  if (process.exitCode) {
    throw new Error("候选内容校验失败");
  }

  console.log(`已校验 ${filenames.length} 份 pending EditorialProfile。`);
}

await validateCandidates();
