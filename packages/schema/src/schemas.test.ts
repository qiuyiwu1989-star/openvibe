import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { RadarProjectBundleSchema } from "./schemas.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(
  currentDirectory,
  "../../../data/fixtures/projects/example-project.json",
);
const validFixture = JSON.parse(await readFile(fixturePath, "utf8")) as Record<string, unknown>;

function cloneFixture(): Record<string, any> {
  return structuredClone(validFixture);
}

test("接受合法的三层项目 bundle", () => {
  assert.equal(RadarProjectBundleSchema.safeParse(cloneFixture()).success, true);
});

test("拒绝与分项不一致的总分", () => {
  const fixture = cloneFixture();
  fixture.editorial.score.total = 99;

  assert.equal(RadarProjectBundleSchema.safeParse(fixture).success, false);
});

test("拒绝三层 repositoryId 不一致", () => {
  const fixture = cloneFixture();
  fixture.publication.repositoryId = 42;

  assert.equal(RadarProjectBundleSchema.safeParse(fixture).success, false);
});

test("拒绝把未审核内容标记为已发布", () => {
  const fixture = cloneFixture();
  fixture.editorial.review = {
    state: "pending",
    reviewer: null,
    reviewedAt: null,
    notes: null,
  };

  assert.equal(RadarProjectBundleSchema.safeParse(fixture).success, false);
});

test("拒绝缺少发布审计字段的已发布内容", () => {
  const fixture = cloneFixture();
  fixture.publication.publishedAt = null;

  assert.equal(RadarProjectBundleSchema.safeParse(fixture).success, false);
});
