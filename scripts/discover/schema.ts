import { z } from "zod";

const isoDateTime = z.string().datetime({ offset: true });
const nonEmptyText = z.string().trim().min(1);

export const DiscoveryConfigSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    seeds: z
      .array(
        z
          .object({
            owner: nonEmptyText,
            name: nonEmptyText,
          })
          .strict(),
      )
      .max(100),
    searches: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
            query: nonEmptyText,
            maxResults: z.number().int().min(1).max(100),
          })
          .strict(),
      )
      .max(20),
    gates: z
      .object({
        minStars: z.number().int().nonnegative(),
        requireLicense: z.boolean(),
        requireDescription: z.boolean(),
        allowForks: z.boolean(),
        allowArchived: z.boolean(),
        maxPushedAgeDays: z.number().int().positive().nullable(),
      })
      .strict(),
  })
  .strict()
  .superRefine((config, context) => {
    if (config.seeds.length === 0 && config.searches.length === 0) {
      context.addIssue({
        code: "custom",
        message: "发现配置至少需要一个 seed 或 search",
      });
    }

    const ids = config.searches.map((search) => search.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        path: ["searches"],
        message: "search id 必须唯一",
      });
    }
  });

export const DiscoveryQueueEntrySchema = z
  .object({
    repositoryId: z.number().int().positive(),
    fullName: z.string().regex(/^[^/\s]+\/[^/\s]+$/),
    normalizedFullName: z.string().regex(/^[^/\s]+\/[^/\s]+$/),
    htmlUrl: z.string().url(),
    description: z.string().trim().max(500).nullable(),
    stars: z.number().int().nonnegative(),
    forks: z.number().int().nonnegative(),
    openIssues: z.number().int().nonnegative(),
    defaultBranch: nonEmptyText,
    archived: z.boolean(),
    disabled: z.boolean(),
    isFork: z.boolean(),
    licenseSpdxId: nonEmptyText.nullable(),
    pushedAt: isoDateTime.nullable(),
    topics: z.array(nonEmptyText).max(50),
    sourceIds: z.array(nonEmptyText).min(1),
    reviewState: z.enum(["review", "rejected"]),
    rejectionReasons: z.array(nonEmptyText),
  })
  .strict()
  .superRefine((entry, context) => {
    if (entry.normalizedFullName !== entry.fullName.toLowerCase()) {
      context.addIssue({
        code: "custom",
        path: ["normalizedFullName"],
        message: "normalizedFullName 必须是 fullName 的小写形式",
      });
    }

    if (entry.reviewState === "review" && entry.rejectionReasons.length > 0) {
      context.addIssue({ code: "custom", message: "review 项不能包含拒绝原因" });
    }
    if (entry.reviewState === "rejected" && entry.rejectionReasons.length === 0) {
      context.addIssue({ code: "custom", message: "rejected 项必须包含拒绝原因" });
    }
  });

export const DiscoveryQueueSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    status: z.literal("success"),
    generatedAt: isoDateTime,
    configFingerprint: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    summary: z
      .object({
        total: z.number().int().nonnegative(),
        review: z.number().int().nonnegative(),
        rejected: z.number().int().nonnegative(),
      })
      .strict(),
    entries: z.array(DiscoveryQueueEntrySchema),
  })
  .strict()
  .superRefine((queue, context) => {
    const review = queue.entries.filter((entry) => entry.reviewState === "review").length;
    const rejected = queue.entries.length - review;
    if (
      queue.summary.total !== queue.entries.length ||
      queue.summary.review !== review ||
      queue.summary.rejected !== rejected
    ) {
      context.addIssue({ code: "custom", path: ["summary"], message: "队列摘要与条目不一致" });
    }

    const ids = queue.entries.map((entry) => entry.repositoryId);
    const names = queue.entries.map((entry) => entry.normalizedFullName);
    if (new Set(ids).size !== ids.length || new Set(names).size !== names.length) {
      context.addIssue({ code: "custom", path: ["entries"], message: "候选队列包含重复仓库" });
    }
  });

export const DiscoveryFailureSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    status: z.literal("failed"),
    generatedAt: isoDateTime,
    error: z
      .object({
        code: z.enum([
          "missing_token",
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
  .strict();

export const DiscoveryRunOutcomeSchema = z.discriminatedUnion("status", [
  DiscoveryQueueSchema,
  DiscoveryFailureSchema,
]);

export type DiscoveryConfig = z.infer<typeof DiscoveryConfigSchema>;
export type DiscoveryQueue = z.infer<typeof DiscoveryQueueSchema>;
export type DiscoveryQueueEntry = z.infer<typeof DiscoveryQueueEntrySchema>;
export type DiscoveryFailure = z.infer<typeof DiscoveryFailureSchema>;
export type DiscoveryRunOutcome = z.infer<typeof DiscoveryRunOutcomeSchema>;
