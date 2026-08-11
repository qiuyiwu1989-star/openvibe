import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  BeginnerMissionSchema,
  MakerProgressCollectionSchema,
  MakerProgressRecordSchema,
  RadarProjectBundleSchema,
} from "./schemas.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(
  currentDirectory,
  "../../../data/fixtures/projects/example-project.json",
);
const validFixture = JSON.parse(await readFile(fixturePath, "utf8")) as Record<string, unknown>;
const beginnerMissionsPath = path.resolve(
  currentDirectory,
  "../../../data/beginner-missions.json",
);
const beginnerMissions = JSON.parse(await readFile(beginnerMissionsPath, "utf8")) as Array<
  Record<string, unknown>
>;

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

test("拒绝没有事实来源的编辑内容", () => {
  const fixture = cloneFixture();
  fixture.editorial.sources = [];

  assert.equal(RadarProjectBundleSchema.safeParse(fixture).success, false);
});

test("接受全部新手作品任务", () => {
  assert.ok(beginnerMissions.length >= 12);
  for (const mission of beginnerMissions) {
    assert.equal(
      BeginnerMissionSchema.safeParse(mission).success,
      true,
      `${String(mission.slug)} 未通过 BeginnerMissionSchema`,
    );
  }
});

test("K12 试点覆盖四个年龄段且每段有两个主要案例", () => {
  const pilots = beginnerMissions
    .map((mission) => BeginnerMissionSchema.parse(mission))
    .filter((mission) => mission.k12);

  assert.equal(pilots.length, 8);
  assert.deepEqual(
    Object.fromEntries(
      ["lower-primary", "upper-primary", "middle-school", "high-school"].map((ageBand) => [
        ageBand,
        pilots.filter((mission) => mission.k12?.primaryAgeBand === ageBand).length,
      ]),
    ),
    {
      "lower-primary": 2,
      "upper-primary": 2,
      "middle-school": 2,
      "high-school": 2,
    },
  );
});

test("拒绝没有 K12 学习设计的 1.1.0 任务", () => {
  const source = beginnerMissions.find((mission) => mission.schemaVersion === "1.0.0");
  assert.ok(source);
  const mission = structuredClone(source);
  mission.schemaVersion = "1.1.0";

  assert.equal(BeginnerMissionSchema.safeParse(mission).success, false);
});

test("拒绝把小学低段案例标为无需成人支持", () => {
  const source = beginnerMissions.find(
    (mission) => mission.k12 && (mission.k12 as Record<string, unknown>).primaryAgeBand === "lower-primary",
  );
  assert.ok(source);
  const mission = structuredClone(source);
  (mission.k12 as Record<string, any>).adultSupport.level = "optional";

  assert.equal(BeginnerMissionSchema.safeParse(mission).success, false);
});

test("拒绝不能快速看到变化的新手任务", () => {
  const source = beginnerMissions[0];
  assert.ok(source);
  const mission = structuredClone(source);
  mission.time = { firstVisibleMinutes: 20, completeMinutes: 90 };

  assert.equal(BeginnerMissionSchema.safeParse(mission).success, false);
});

test("拒绝需要付费服务的新手任务", () => {
  const source = beginnerMissions[0];
  assert.ok(source);
  const mission = structuredClone(source);
  mission.noPaidService = false;

  assert.equal(BeginnerMissionSchema.safeParse(mission).success, false);
});

test("接受已署名并完成三步的作品记录", () => {
  assert.equal(MakerProgressRecordSchema.safeParse({
    missionSlug: "personal-card",
    status: "completed",
    completedStepIndexes: [0, 1, 2],
    authorName: "小明",
    makerDecision: "我决定让这张网页首先展示我做过的作品。",
    reflection: "下一次会改善手机展示。",
    workUrl: null,
    startedAt: "2026-08-11T00:00:00Z",
    updatedAt: "2026-08-11T01:00:00Z",
    completedAt: "2026-08-11T01:00:00Z",
  }).success, true);
});

test("拒绝没有作者决定的伪完成记录", () => {
  assert.equal(MakerProgressRecordSchema.safeParse({
    missionSlug: "personal-card",
    status: "completed",
    completedStepIndexes: [0, 1, 2],
    authorName: "小明",
    makerDecision: "AI 做的",
    reflection: "",
    workUrl: null,
    startedAt: "2026-08-11T00:00:00Z",
    updatedAt: "2026-08-11T01:00:00Z",
    completedAt: "2026-08-11T01:00:00Z",
  }).success, false);
});

test("拒绝同一任务的重复进度", () => {
  const record = {
    missionSlug: "personal-card",
    status: "in_progress",
    completedStepIndexes: [0],
    authorName: "",
    makerDecision: "",
    reflection: "",
    workUrl: null,
    startedAt: "2026-08-11T00:00:00Z",
    updatedAt: "2026-08-11T01:00:00Z",
    completedAt: null,
  };
  assert.equal(MakerProgressCollectionSchema.safeParse({
    schemaVersion: "1.0.0",
    records: [record, record],
  }).success, false);
});

test("拒绝非 HTTP 协议的作品网址", () => {
  const result = MakerProgressRecordSchema.safeParse({
    missionSlug: "personal-card",
    status: "in_progress",
    completedStepIndexes: [0],
    authorName: "小明",
    makerDecision: "",
    reflection: "",
    workUrl: "javascript:alert(1)",
    startedAt: "2026-08-11T08:00:00.000Z",
    updatedAt: "2026-08-11T08:10:00.000Z",
    completedAt: null,
  });

  assert.equal(result.success, false);
});
