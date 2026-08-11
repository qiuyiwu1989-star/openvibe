import { z } from "zod";

import {
  AUDIENCE_LEVELS,
  BEGINNER_MISSION_SCHEMA_VERSION,
  BEGINNER_MISSION_LEVELS,
  BEGINNER_MISSION_TRACKS,
  DIFFICULTY_LEVELS,
  LEARNING_GOALS,
  K12_AGE_BANDS,
  K12_LEARNING_CONTEXTS,
  K12_SUBJECTS,
  K12_SUPPORT_LEVELS,
  PROJECT_CATEGORIES,
  PUBLICATION_STATUSES,
  RISK_KINDS,
  SCHEMA_VERSION,
  SCORE_MAX,
  UPDATE_CHANGE_KINDS,
  UPDATE_RISK_LEVELS,
} from "./taxonomies";

const isoDateTime = z.string().datetime({ offset: true });
const nullableUrl = z.string().url().nullable();
const repositoryId = z.number().int().positive();
const nonEmptyText = z.string().trim().min(1);

export const RepositorySnapshotSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    repositoryId,
    nodeId: nonEmptyText,
    owner: z
      .object({
        login: nonEmptyText,
        id: z.number().int().positive(),
        type: z.enum(["User", "Organization"]),
        avatarUrl: z.string().url(),
      })
      .strict(),
    name: nonEmptyText,
    fullName: z.string().regex(/^[^/\s]+\/[^/\s]+$/),
    htmlUrl: z.string().url(),
    description: z.string().trim().max(500).nullable(),
    homepageUrl: nullableUrl,
    defaultBranch: nonEmptyText,
    visibility: z.literal("public"),
    isFork: z.boolean(),
    isTemplate: z.boolean(),
    archived: z.boolean(),
    disabled: z.boolean(),
    metrics: z
      .object({
        stars: z.number().int().nonnegative(),
        forks: z.number().int().nonnegative(),
        openIssues: z.number().int().nonnegative(),
        subscribers: z.number().int().nonnegative().nullable(),
      })
      .strict(),
    primaryLanguage: z.string().trim().min(1).nullable(),
    languages: z.record(z.string(), z.number().int().nonnegative()),
    topics: z.array(z.string().trim().min(1)).max(50),
    license: z
      .object({
        spdxId: nonEmptyText,
        name: nonEmptyText,
        url: nullableUrl,
      })
      .strict()
      .nullable(),
    timestamps: z
      .object({
        createdAt: isoDateTime,
        updatedAt: isoDateTime,
        pushedAt: isoDateTime.nullable(),
        fetchedAt: isoDateTime,
      })
      .strict(),
    readme: z
      .object({
        path: nonEmptyText,
        sha: nonEmptyText,
        htmlUrl: z.string().url(),
        excerpt: z.string().trim().max(1200).nullable(),
        truncated: z.boolean(),
      })
      .strict()
      .nullable(),
    source: z
      .object({
        provider: z.literal("github"),
        apiVersion: nonEmptyText,
        etag: z.string().trim().min(1).nullable(),
      })
      .strict(),
  })
  .strict();

const scoreSchema = z
  .object({
    replicability: z.number().int().min(0).max(SCORE_MAX.replicability),
    clarity: z.number().int().min(0).max(SCORE_MAX.clarity),
    beginnerValue: z.number().int().min(0).max(SCORE_MAX.beginnerValue),
    productCompleteness: z.number().int().min(0).max(SCORE_MAX.productCompleteness),
    vibeCodingRelevance: z.number().int().min(0).max(SCORE_MAX.vibeCodingRelevance),
    maintenance: z.number().int().min(0).max(SCORE_MAX.maintenance),
    novelty: z.number().int().min(0).max(SCORE_MAX.novelty),
    total: z.number().int().min(0).max(100),
    rationale: z
      .object({
        replicability: nonEmptyText,
        clarity: nonEmptyText,
        beginnerValue: nonEmptyText,
        productCompleteness: nonEmptyText,
        vibeCodingRelevance: nonEmptyText,
        maintenance: nonEmptyText,
        novelty: nonEmptyText,
      })
      .strict(),
  })
  .strict()
  .superRefine((score, context) => {
    const calculated =
      score.replicability +
      score.clarity +
      score.beginnerValue +
      score.productCompleteness +
      score.vibeCodingRelevance +
      score.maintenance +
      score.novelty;

    if (score.total !== calculated) {
      context.addIssue({
        code: "custom",
        path: ["total"],
        message: `总分 ${score.total} 与分项之和 ${calculated} 不一致`,
      });
    }
  });

const learningStepSchema = z
  .object({
    objective: nonEmptyText,
    steps: z.array(nonEmptyText).min(1).max(8),
    outcome: nonEmptyText,
  })
  .strict();

const reviewSchema = z
  .object({
    state: z.enum(["pending", "approved", "changes_requested"]),
    reviewer: z
      .object({
        kind: z.enum(["human", "agent"]),
        id: nonEmptyText,
      })
      .strict()
      .nullable(),
    reviewedAt: isoDateTime.nullable(),
    notes: z.string().trim().max(2000).nullable(),
  })
  .strict()
  .superRefine((review, context) => {
    if (review.state === "approved" && (!review.reviewer || !review.reviewedAt)) {
      context.addIssue({
        code: "custom",
        message: "approved 审核必须记录 reviewer 和 reviewedAt",
      });
    }
  });

export const EditorialProfileSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    repositoryId,
    locale: z.literal("zh-CN"),
    displayName: z.string().trim().min(1).max(80),
    tagline: z.string().trim().min(1).max(100),
    summary: z.string().trim().min(20).max(1000),
    recommendationReasons: z.array(nonEmptyText).min(2).max(5),
    audiences: z.array(z.enum(AUDIENCE_LEVELS)).min(1),
    categories: z.array(z.enum(PROJECT_CATEGORIES)).min(1).max(3),
    learningGoals: z.array(z.enum(LEARNING_GOALS)).min(1).max(6),
    difficulty: z
      .object({
        level: z.enum(DIFFICULTY_LEVELS),
        rationale: nonEmptyText,
        prerequisites: z.array(nonEmptyText).max(8),
      })
      .strict(),
    techStack: z
      .array(
        z
          .object({
            name: nonEmptyText,
            role: nonEmptyText,
            confidence: z.enum(["confirmed", "inferred", "unknown"]),
            evidenceUrl: nullableUrl,
          })
          .strict(),
      )
      .max(20),
    learningHighlights: z
      .array(
        z
          .object({
            title: nonEmptyText,
            description: nonEmptyText,
            evidencePaths: z.array(nonEmptyText).max(10),
          })
          .strict(),
      )
      .min(2)
      .max(8),
    learningPath: z
      .object({
        thirtyMinutes: learningStepSchema,
        twoHours: learningStepSchema,
        oneDay: learningStepSchema,
      })
      .strict(),
    readingGuide: z
      .array(
        z
          .object({
            path: nonEmptyText,
            reason: nonEmptyText,
          })
          .strict(),
      )
      .max(12),
    risks: z
      .array(
        z
          .object({
            kind: z.enum(RISK_KINDS),
            severity: z.enum(["low", "medium", "high"]),
            note: nonEmptyText,
          })
          .strict(),
      )
      .max(12),
    score: scoreSchema,
    sources: z
      .array(
        z
          .object({
            kind: z.enum(["repository", "readme", "file", "release", "external"]),
            url: z.string().url(),
            accessedAt: isoDateTime,
          })
          .strict(),
      )
      .min(1),
    provenance: z
      .object({
        createdBy: z.enum(["human", "agent", "hybrid"]),
        generator: z.string().trim().min(1).nullable(),
        createdAt: isoDateTime,
      })
      .strict(),
    review: reviewSchema,
  })
  .strict();

export const PublicationRecordSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    repositoryId,
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    status: z.enum(PUBLICATION_STATUSES),
    featured: z.boolean(),
    editorialVersion: z.number().int().nonnegative(),
    publishedAt: isoDateTime.nullable(),
    lastReviewedAt: isoDateTime.nullable(),
    rejectionReasons: z.array(nonEmptyText).max(10),
  })
  .strict()
  .superRefine((publication, context) => {
    if (
      publication.status === "published" &&
      (!publication.publishedAt || !publication.lastReviewedAt || publication.editorialVersion < 1)
    ) {
      context.addIssue({
        code: "custom",
        message: "published 状态需要发布时间、复核时间和大于 0 的编辑版本",
      });
    }
  });

export const RadarProjectBundleSchema = z
  .object({
    snapshot: RepositorySnapshotSchema,
    editorial: EditorialProfileSchema,
    publication: PublicationRecordSchema,
  })
  .strict()
  .superRefine((bundle, context) => {
    const ids = [
      bundle.snapshot.repositoryId,
      bundle.editorial.repositoryId,
      bundle.publication.repositoryId,
    ];

    if (!ids.every((id) => id === ids[0])) {
      context.addIssue({
        code: "custom",
        message: "snapshot、editorial、publication 的 repositoryId 必须一致",
      });
    }

    if (bundle.publication.status === "published" && bundle.editorial.review.state !== "approved") {
      context.addIssue({
        code: "custom",
        path: ["editorial", "review", "state"],
        message: "只有审核通过的编辑内容可以发布",
      });
    }
  });

const beginnerMissionStepSchema = z
  .object({
    time: nonEmptyText,
    title: z.string().trim().min(1).max(80),
    actions: z.array(nonEmptyText).min(1).max(5),
    doneWhen: nonEmptyText,
  })
  .strict();

const uniqueTextList = z.array(nonEmptyText).min(1).max(5).refine(
  (items) => new Set(items).size === items.length,
  { message: "列表内容不能重复" },
);

const k12LearningDesignSchema = z
  .object({
    primaryAgeBand: z.enum(K12_AGE_BANDS),
    ageBands: z.array(z.enum(K12_AGE_BANDS)).min(1).max(2),
    subjectLinks: z.array(z.enum(K12_SUBJECTS)).min(1).max(3),
    learningContext: z.enum(K12_LEARNING_CONTEXTS),
    adultSupport: z
      .object({
        level: z.enum(K12_SUPPORT_LEVELS),
        role: z.string().trim().min(10).max(300),
      })
      .strict(),
    safetyNotes: uniqueTextList,
    creatorLoop: z
      .object({
        problem: z.string().trim().min(10).max(300),
        knowledge: z.string().trim().min(10).max(300),
        tool: z.string().trim().min(10).max(300),
        work: z.string().trim().min(10).max(300),
        feedback: z.string().trim().min(10).max(300),
        identity: z.string().trim().min(10).max(300),
      })
      .strict(),
    aiBoundary: z
      .object({
        learnerOwns: uniqueTextList,
        aiCanHelp: uniqueTextList,
        mustVerify: uniqueTextList,
      })
      .strict(),
  })
  .strict()
  .superRefine((design, context) => {
    if (!design.ageBands.includes(design.primaryAgeBand)) {
      context.addIssue({
        code: "custom",
        path: ["ageBands"],
        message: "主要年龄段必须包含在推荐年龄段中",
      });
    }
    if (new Set(design.ageBands).size !== design.ageBands.length) {
      context.addIssue({ code: "custom", path: ["ageBands"], message: "推荐年龄段不能重复" });
    }
    if (new Set(design.subjectLinks).size !== design.subjectLinks.length) {
      context.addIssue({ code: "custom", path: ["subjectLinks"], message: "学科连接不能重复" });
    }
    if (design.primaryAgeBand === "lower-primary" && design.adultSupport.level === "optional") {
      context.addIssue({
        code: "custom",
        path: ["adultSupport", "level"],
        message: "小学低段案例至少需要建议成人支持",
      });
    }
  });

export const BeginnerMissionSchema = z
  .object({
    schemaVersion: z.enum([SCHEMA_VERSION, BEGINNER_MISSION_SCHEMA_VERSION]),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().trim().min(1).max(80),
    tagline: z.string().trim().min(10).max(140),
    track: z.enum(BEGINNER_MISSION_TRACKS),
    level: z.enum(BEGINNER_MISSION_LEVELS),
    source: z
      .object({
        repository: z.string().regex(/^[^/\s]+\/[^/\s]+$/),
        path: nonEmptyText,
        url: z.string().url(),
        license: nonEmptyText,
      })
      .strict(),
    tools: z.array(nonEmptyText).min(1).max(6),
    runMode: nonEmptyText,
    time: z
      .object({
        firstVisibleMinutes: z.number().int().positive().max(15),
        completeMinutes: z.number().int().positive().max(120),
      })
      .strict(),
    outcome: z.string().trim().min(10).max(300),
    makerDecision: z.string().trim().min(10).max(300),
    firstChange: z.string().trim().min(10).max(300),
    steps: z.array(beginnerMissionStepSchema).length(3),
    aiPrompt: z.string().trim().min(30).max(1600),
    k12: k12LearningDesignSchema.optional(),
    noPaidService: z.literal(true),
    requiresBackend: z.literal(false),
    verifiedAt: isoDateTime,
  })
  .strict()
  .superRefine((mission, context) => {
    if (mission.schemaVersion === BEGINNER_MISSION_SCHEMA_VERSION && !mission.k12) {
      context.addIssue({ code: "custom", path: ["k12"], message: "1.1.0 任务必须包含 K12 学习设计" });
    }
    if (mission.schemaVersion === SCHEMA_VERSION && mission.k12) {
      context.addIssue({
        code: "custom",
        path: ["schemaVersion"],
        message: "包含 K12 学习设计的任务必须使用 1.1.0",
      });
    }
  });

const learningPathWeekSchema = z
  .object({
    week: z.number().int().min(1).max(4),
    title: z.string().trim().min(1).max(80),
    focus: z.string().trim().min(10).max(300),
    actions: z.array(nonEmptyText).min(2).max(4),
    evidence: z.string().trim().min(10).max(300),
    facilitatorMove: z.string().trim().min(10).max(300),
  })
  .strict();

export const LearningPathSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().trim().min(1).max(80),
    tagline: z.string().trim().min(10).max(180),
    ageBand: z.enum(K12_AGE_BANDS),
    durationWeeks: z.literal(4),
    missionSlugs: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).length(5),
    outcome: z.string().trim().min(10).max(400),
    weeks: z.array(learningPathWeekSchema).length(4),
    guide: z
      .object({
        forWhom: z.string().trim().min(10).max(240),
        preparation: uniqueTextList,
        questions: uniqueTextList,
        observe: uniqueTextList,
        feedbackProtocol: uniqueTextList,
        privacyReminder: z.string().trim().min(10).max(400),
        showcase: z.string().trim().min(10).max(400),
      })
      .strict(),
    successCriteria: uniqueTextList,
  })
  .strict()
  .superRefine((path, context) => {
    if (new Set(path.missionSlugs).size !== path.missionSlugs.length) {
      context.addIssue({ code: "custom", path: ["missionSlugs"], message: "路线案例不能重复" });
    }
    if (path.weeks.some((week, index) => week.week !== index + 1)) {
      context.addIssue({ code: "custom", path: ["weeks"], message: "四周路线必须按 1 到 4 排列" });
    }
  });

export const MakerProgressRecordSchema = z
  .object({
    missionSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    status: z.enum(["in_progress", "completed"]),
    completedStepIndexes: z.array(z.number().int().min(0).max(2)).max(3),
    authorName: z.string().trim().max(80),
    makerDecision: z.string().trim().max(800),
    reflection: z.string().trim().max(1200),
    workUrl: z
      .string()
      .url()
      .refine((value) => value.startsWith("https://") || value.startsWith("http://"), {
        message: "作品网址只允许 HTTP 或 HTTPS",
      })
      .nullable(),
    startedAt: isoDateTime,
    updatedAt: isoDateTime,
    completedAt: isoDateTime.nullable(),
  })
  .strict()
  .superRefine((record, context) => {
    if (new Set(record.completedStepIndexes).size !== record.completedStepIndexes.length) {
      context.addIssue({
        code: "custom",
        path: ["completedStepIndexes"],
        message: "完成步骤不能重复",
      });
    }
    if (record.status === "completed") {
      if (record.completedStepIndexes.length !== 3) {
        context.addIssue({ code: "custom", message: "完成作品前必须完成三个步骤" });
      }
      if (!record.authorName || record.makerDecision.length < 10 || !record.completedAt) {
        context.addIssue({ code: "custom", message: "完成作品必须署名并记录作者决定" });
      }
    } else if (record.completedAt !== null) {
      context.addIssue({ code: "custom", path: ["completedAt"], message: "进行中作品不能有完成时间" });
    }
  });

export const MakerProgressCollectionSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    records: z.array(MakerProgressRecordSchema).max(100),
  })
  .strict()
  .superRefine((collection, context) => {
    const slugs = collection.records.map((record) => record.missionSlug);
    if (new Set(slugs).size !== slugs.length) {
      context.addIssue({ code: "custom", path: ["records"], message: "每个任务只能有一份进度" });
    }
  });

const updateFailureSchema = z
  .object({
    repositoryId,
    fullName: z.string().regex(/^[^/\s]+\/[^/\s]+$/),
    code: nonEmptyText,
    message: nonEmptyText,
    retryable: z.boolean(),
  })
  .strict();

export const UpdateQueueEntrySchema = z
  .object({
    repositoryId,
    fullName: z.string().regex(/^[^/\s]+\/[^/\s]+$/),
    previousFullName: z.string().regex(/^[^/\s]+\/[^/\s]+$/),
    snapshotFile: z.string().regex(/^[a-z0-9_.-]+\.json$/),
    candidatePath: z.string().regex(/^candidates\/[a-z0-9_.-]+\.json$/).nullable(),
    detectedAt: isoDateTime,
    risk: z.enum(UPDATE_RISK_LEVELS),
    changeKinds: z.array(z.enum(UPDATE_CHANGE_KINDS)).min(1),
    reviewState: z.literal("review"),
  })
  .strict()
  .superRefine((entry, context) => {
    if (new Set(entry.changeKinds).size !== entry.changeKinds.length) {
      context.addIssue({ code: "custom", path: ["changeKinds"], message: "changeKinds 不能重复" });
    }
    if (
      entry.candidatePath === null &&
      entry.changeKinds.some((kind) => kind !== "maintenance_risk")
    ) {
      context.addIssue({
        code: "custom",
        path: ["candidatePath"],
        message: "快照变更必须包含候选快照路径",
      });
    }
  });

export const UpdateQueueSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    generatedAt: isoDateTime,
    staleAfterDays: z.number().int().positive(),
    summary: z
      .object({
        checked: z.number().int().nonnegative(),
        unchanged: z.number().int().nonnegative(),
        review: z.number().int().nonnegative(),
        failed: z.number().int().nonnegative(),
      })
      .strict(),
    entries: z.array(UpdateQueueEntrySchema),
    failures: z.array(updateFailureSchema),
  })
  .strict()
  .superRefine((queue, context) => {
    if (
      queue.summary.review !== queue.entries.length ||
      queue.summary.failed !== queue.failures.length ||
      queue.summary.checked !==
        queue.summary.unchanged + queue.summary.review + queue.summary.failed
    ) {
      context.addIssue({ code: "custom", path: ["summary"], message: "更新队列摘要与条目不一致" });
    }

    const ids = queue.entries.map((entry) => entry.repositoryId);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: "custom", path: ["entries"], message: "更新队列不能重复仓库" });
    }
  });

export const UpdateDecisionSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    repositoryId,
    fullName: z.string().regex(/^[^/\s]+\/[^/\s]+$/),
    queueGeneratedAt: isoDateTime,
    decision: z.enum(["approved", "rejected"]),
    reviewer: z
      .object({
        kind: z.enum(["human", "agent"]),
        id: nonEmptyText,
      })
      .strict(),
    decidedAt: isoDateTime,
    notes: z.string().trim().min(1).max(2000),
    applied: z.boolean(),
    changeKinds: z.array(z.enum(UPDATE_CHANGE_KINDS)).min(1),
  })
  .strict()
  .superRefine((decision, context) => {
    if (decision.decision === "rejected" && decision.applied) {
      context.addIssue({ code: "custom", path: ["applied"], message: "拒绝决定不能标记为已应用" });
    }
  });

export const UpdateHistoryEntrySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    kind: z.enum(["catalog_release", "repository_update"]),
    publishedAt: isoDateTime,
    title: z.string().trim().min(1).max(120),
    summary: z.string().trim().min(10).max(600),
    repositoryId: repositoryId.nullable(),
    projectSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).nullable(),
    changeKinds: z.array(z.enum(UPDATE_CHANGE_KINDS)),
  })
  .strict()
  .superRefine((entry, context) => {
    if (
      entry.kind === "repository_update" &&
      (!entry.repositoryId || !entry.projectSlug || entry.changeKinds.length === 0)
    ) {
      context.addIssue({ code: "custom", message: "仓库更新必须关联项目和变更类型" });
    }
    if (
      entry.kind === "catalog_release" &&
      (entry.repositoryId !== null || entry.projectSlug !== null || entry.changeKinds.length > 0)
    ) {
      context.addIssue({ code: "custom", message: "目录版本事件不应关联单一仓库" });
    }
  });

export const UpdateHistorySchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    entries: z.array(UpdateHistoryEntrySchema).max(500),
  })
  .strict()
  .superRefine((history, context) => {
    const ids = history.entries.map((entry) => entry.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: "custom", path: ["entries"], message: "公开更新历史 ID 不能重复" });
    }
  });

export const RepositoryLocatorSchema = z
  .object({
    owner: nonEmptyText,
    name: nonEmptyText,
  })
  .strict();

export const IngestCommandSchema = z
  .object({
    locator: RepositoryLocatorSchema,
    ifNoneMatch: z.string().trim().min(1).optional(),
    knownRepositoryId: repositoryId.optional(),
    force: z.boolean().default(false),
  })
  .strict();

export const IngestOutcomeSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("changed"),
      snapshot: RepositorySnapshotSchema,
    })
    .strict(),
  z
    .object({
      status: z.literal("not_modified"),
      repositoryId,
      checkedAt: isoDateTime,
      etag: z.string().trim().min(1),
    })
    .strict(),
  z
    .object({
      status: z.literal("failed"),
      error: z
        .object({
          code: z.enum([
            "not_found",
            "rate_limited",
            "unauthorized",
            "forbidden",
            "invalid_response",
            "network",
            "github_error",
            "unknown",
          ]),
          message: nonEmptyText,
          status: z.number().int().min(100).max(599).nullable(),
          retryable: z.boolean(),
          retryAt: isoDateTime.nullable(),
          retryAfterSeconds: z.number().int().nonnegative().nullable(),
        })
        .strict(),
    })
    .strict(),
]);

export type RepositorySnapshot = z.infer<typeof RepositorySnapshotSchema>;
export type EditorialProfile = z.infer<typeof EditorialProfileSchema>;
export type PublicationRecord = z.infer<typeof PublicationRecordSchema>;
export type RadarProjectBundle = z.infer<typeof RadarProjectBundleSchema>;
export type BeginnerMission = z.infer<typeof BeginnerMissionSchema>;
export type LearningPath = z.infer<typeof LearningPathSchema>;
export type MakerProgressRecord = z.infer<typeof MakerProgressRecordSchema>;
export type MakerProgressCollection = z.infer<typeof MakerProgressCollectionSchema>;
export type UpdateQueueEntry = z.infer<typeof UpdateQueueEntrySchema>;
export type UpdateQueue = z.infer<typeof UpdateQueueSchema>;
export type UpdateDecision = z.infer<typeof UpdateDecisionSchema>;
export type UpdateHistoryEntry = z.infer<typeof UpdateHistoryEntrySchema>;
export type UpdateHistory = z.infer<typeof UpdateHistorySchema>;
export type RepositoryLocator = z.infer<typeof RepositoryLocatorSchema>;
export type IngestCommand = z.infer<typeof IngestCommandSchema>;
export type IngestOutcome = z.infer<typeof IngestOutcomeSchema>;
