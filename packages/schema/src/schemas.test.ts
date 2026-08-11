import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  BeginnerMissionSchema,
  LearningPathSchema,
  MakerProgressCollectionSchema,
  MakerProgressRecordSchema,
  PilotSessionCollectionSchema,
  PilotSessionRecordSchema,
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
const learningPathsPath = path.resolve(currentDirectory, "../../../data/learning-paths.json");
const learningPaths = JSON.parse(await readFile(learningPathsPath, "utf8")) as Array<
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

test("K12 案例覆盖四个年龄段且每段有五个主要案例", () => {
  const pilots = beginnerMissions
    .map((mission) => BeginnerMissionSchema.parse(mission))
    .filter((mission) => mission.k12);

  assert.equal(pilots.length, 20);
  assert.deepEqual(
    Object.fromEntries(
      ["lower-primary", "upper-primary", "middle-school", "high-school"].map((ageBand) => [
        ageBand,
        pilots.filter((mission) => mission.k12?.primaryAgeBand === ageBand).length,
      ]),
    ),
    {
      "lower-primary": 5,
      "upper-primary": 5,
      "middle-school": 5,
      "high-school": 5,
    },
  );
});

test("拒绝没有 K12 学习设计的 1.1.0 任务", () => {
  const source = beginnerMissions[0];
  assert.ok(source);
  const mission = structuredClone(source);
  mission.schemaVersion = "1.1.0";
  delete mission.k12;

  assert.equal(BeginnerMissionSchema.safeParse(mission).success, false);
});

test("接受四条分龄学习路线并拒绝重复案例", () => {
  assert.equal(learningPaths.length, 4);
  for (const pathData of learningPaths) {
    assert.equal(LearningPathSchema.safeParse(pathData).success, true, `${String(pathData.slug)} 路线不合法`);
  }

  const duplicated = structuredClone(learningPaths[0]);
  assert.ok(duplicated);
  duplicated.missionSlugs = Array(5).fill("memory-game");
  assert.equal(LearningPathSchema.safeParse(duplicated).success, false);
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

const validPilotSession = {
  id: "5d986152-820b-4b3f-91b1-659d5448e2af",
  schemaVersion: "1.0.0",
  pathSlug: "play-and-tell",
  missionSlug: "memory-game",
  sessionDate: "2026-08-12",
  context: "classroom",
  participantCount: 12,
  firstVisibleCount: 11,
  completedCount: 9,
  authorEvidenceCount: 8,
  blockers: ["debugging", "presenting"],
  interventions: ["question-prompt", "debugging-help"],
  evidence: {
    intentionOwnership: "clear",
    focusedMaking: "emerging",
    firstPersonMeaning: "clear",
    namedResponsibility: "emerging",
  },
  workedWell: "孩子能用自己的话解释游戏规则。",
  changeNext: "下次减少开场讲解，给选择作品留更多时间。",
  privacyConfirmed: true,
  createdAt: "2026-08-12T04:00:00Z",
  updatedAt: "2026-08-12T04:00:00Z",
};

test("接受不含儿童身份信息的匿名试教汇总", () => {
  assert.equal(PilotSessionRecordSchema.safeParse(validPilotSession).success, true);
  assert.equal(PilotSessionCollectionSchema.safeParse({
    schemaVersion: "1.0.0",
    records: [validPilotSession],
  }).success, true);
});

test("拒绝超过参与总数的试教结果", () => {
  const invalid = structuredClone(validPilotSession);
  invalid.authorEvidenceCount = 13;
  assert.equal(PilotSessionRecordSchema.safeParse(invalid).success, false);
});

test("拒绝未经隐私确认的试教记录", () => {
  const invalid = structuredClone(validPilotSession) as Record<string, unknown>;
  invalid.privacyConfirmed = false;
  assert.equal(PilotSessionRecordSchema.safeParse(invalid).success, false);
});

test("拒绝在试教反思中保存联系方式或网址", () => {
  const invalid = structuredClone(validPilotSession);
  invalid.changeNext = "请联系 teacher@example.com 获取孩子的完整记录。";
  assert.equal(PilotSessionRecordSchema.safeParse(invalid).success, false);
});
