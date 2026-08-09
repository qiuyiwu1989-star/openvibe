import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import { EditorialProfileSchema } from "../../../packages/schema/src/index.js";

const sourceUrlSchema = z.object({
  kind: z.enum(["repository", "readme", "file", "release", "external"]),
  url: z.string().url(),
}).strict();

const DraftSchema = EditorialProfileSchema.omit({
  repositoryId: true,
  sources: true,
  provenance: true,
  review: true,
}).extend({
  fullName: z.string().regex(/^[^/\s]+\/[^/\s]+$/),
  sourceUrls: z.array(sourceUrlSchema).min(3),
}).strict();

const RejectionSchema = z.record(
  z.string().regex(/^[^/\s]+\/[^/\s]+$/),
  z.object({
    reason: z.enum(["repository_redirected", "archived", "license_ineligible", "not_found"]),
    note: z.string().min(1),
    evidenceUrls: z.array(z.string().url()).min(1),
    replacement: z.object({
      fullName: z.string().regex(/^[^/\s]+\/[^/\s]+$/),
      reason: z.string().min(1),
    }).strict(),
  }).strict(),
);

const directory = dirname(fileURLToPath(import.meta.url));
const filenames = (await readdir(directory))
  .filter((name) => name.endsWith(".json") && name !== "rejections.json")
  .sort();

if (filenames.length === 0) throw new Error("未找到策展草稿");

const names = new Set<string>();
for (const filename of filenames) {
  const value = JSON.parse(await readFile(join(directory, filename), "utf8"));
  const parsed = DraftSchema.safeParse(value);
  if (!parsed.success) {
    console.error(`❌ ${filename}`, parsed.error.issues);
    process.exitCode = 1;
    continue;
  }
  if (names.has(parsed.data.fullName)) {
    console.error(`❌ ${filename}: fullName 重复`);
    process.exitCode = 1;
    continue;
  }
  const expectedFilename = `${parsed.data.fullName.toLowerCase().replace("/", "--")}.json`;
  if (filename !== expectedFilename) {
    console.error(`❌ ${filename}: 应按 fullName 命名为 ${expectedFilename}`);
    process.exitCode = 1;
    continue;
  }
  names.add(parsed.data.fullName);
  console.log(`✅ ${parsed.data.fullName} (${parsed.data.score.total}/100)`);
}

if (process.exitCode) throw new Error("策展草稿校验失败");

const rejections = RejectionSchema.parse(
  JSON.parse(await readFile(join(directory, "rejections.json"), "utf8")),
);
console.log(`已校验 ${filenames.length} 份独立学习卡和 ${Object.keys(rejections).length} 份拒绝记录。`);
