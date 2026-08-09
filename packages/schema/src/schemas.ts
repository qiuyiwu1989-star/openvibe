import { z } from "zod";

import {
  AUDIENCE_LEVELS,
  DIFFICULTY_LEVELS,
  LEARNING_GOALS,
  PROJECT_CATEGORIES,
  PUBLICATION_STATUSES,
  RISK_KINDS,
  SCHEMA_VERSION,
  SCORE_MAX,
} from "./taxonomies.js";

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
            "invalid_response",
            "network",
            "unknown",
          ]),
          message: nonEmptyText,
          retryable: z.boolean(),
          retryAt: isoDateTime.nullable(),
        })
        .strict(),
    })
    .strict(),
]);

export type RepositorySnapshot = z.infer<typeof RepositorySnapshotSchema>;
export type EditorialProfile = z.infer<typeof EditorialProfileSchema>;
export type PublicationRecord = z.infer<typeof PublicationRecordSchema>;
export type RadarProjectBundle = z.infer<typeof RadarProjectBundleSchema>;
export type RepositoryLocator = z.infer<typeof RepositoryLocatorSchema>;
export type IngestCommand = z.infer<typeof IngestCommandSchema>;
export type IngestOutcome = z.infer<typeof IngestOutcomeSchema>;

