import { createHash } from "node:crypto";

import { GitHubClient, GitHubRequestError } from "../ingest/github-client.js";
import {
  DiscoveryRunOutcomeSchema,
  type DiscoveryConfig,
  type DiscoveryQueueEntry,
  type DiscoveryRunOutcome,
} from "./schema.js";

type GitHubRepositorySummary = {
  id: number;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
  archived: boolean;
  disabled: boolean;
  fork: boolean;
  visibility?: string;
  license: { spdx_id: string } | null;
  pushed_at: string | null;
  updated_at: string;
  topics?: string[];
};

type GitHubSearchResponse = {
  items: GitHubRepositorySummary[];
};

type DiscoveryClient = Pick<GitHubClient, "getJson">;

type CollectedRepository = {
  repository: GitHubRepositorySummary;
  sourceIds: Set<string>;
};

export async function discoverRepositories(
  config: DiscoveryConfig,
  client: DiscoveryClient,
  now: () => Date = () => new Date(),
): Promise<DiscoveryRunOutcome> {
  const generatedAt = now().toISOString();
  const checkedAt = new Date(generatedAt);

  try {
    const collected: CollectedRepository[] = [];

    for (const seed of config.seeds) {
      const owner = encodeURIComponent(seed.owner);
      const name = encodeURIComponent(seed.name);
      const response = await client.getJson<GitHubRepositorySummary>(`/repos/${owner}/${name}`);
      if (response.status === "not_modified") {
        throw new Error("发现请求未使用条件头，不应返回 304");
      }
      collected.push({ repository: response.data, sourceIds: new Set([`seed:${seed.owner}/${seed.name}`]) });
    }

    for (const search of config.searches) {
      const parameters = new URLSearchParams({
        q: search.query,
        sort: "updated",
        order: "desc",
        per_page: String(search.maxResults),
        page: "1",
      });
      const response = await client.getJson<GitHubSearchResponse>(
        `/search/repositories?${parameters.toString()}`,
      );
      if (response.status === "not_modified") {
        throw new Error("发现请求未使用条件头，不应返回 304");
      }
      if (!Array.isArray(response.data.items)) {
        throw new Error("GitHub Search 响应缺少 items");
      }

      for (const repository of response.data.items.slice(0, search.maxResults)) {
        collected.push({ repository, sourceIds: new Set([`search:${search.id}`]) });
      }
    }

    const entries = deduplicateRepositories(collected)
      .map((item) => toQueueEntry(item, config, checkedAt))
      .sort(compareEntries);
    const review = entries.filter((entry) => entry.reviewState === "review").length;

    return DiscoveryRunOutcomeSchema.parse({
      schemaVersion: "1.0.0",
      status: "success",
      generatedAt,
      configFingerprint: fingerprintConfig(config),
      summary: {
        total: entries.length,
        review,
        rejected: entries.length - review,
      },
      entries,
    });
  } catch (error) {
    const failure = error instanceof GitHubRequestError
      ? error.failure
      : {
          code: "invalid_response" as const,
          message: error instanceof Error ? error.message : "自动发现出现未知错误",
          status: null,
          retryable: false,
          retryAt: null,
          retryAfterSeconds: null,
        };

    return DiscoveryRunOutcomeSchema.parse({
      schemaVersion: "1.0.0",
      status: "failed",
      generatedAt,
      error: failure,
    });
  }
}

export function createDiscoveryClient(token: string): GitHubClient {
  return new GitHubClient({ token });
}

function deduplicateRepositories(items: CollectedRepository[]): CollectedRepository[] {
  const groups: CollectedRepository[] = [];
  const byId = new Map<number, CollectedRepository>();
  const byName = new Map<string, CollectedRepository>();

  for (const item of items) {
    assertRepository(item.repository);
    const normalizedName = item.repository.full_name.toLowerCase();
    const existing = byId.get(item.repository.id) ?? byName.get(normalizedName);

    if (existing) {
      for (const sourceId of item.sourceIds) existing.sourceIds.add(sourceId);
      existing.repository = chooseCanonicalRepository(existing.repository, item.repository);
      byId.set(item.repository.id, existing);
      byName.set(normalizedName, existing);
      continue;
    }

    const group = { repository: item.repository, sourceIds: new Set(item.sourceIds) };
    groups.push(group);
    byId.set(item.repository.id, group);
    byName.set(normalizedName, group);
  }

  return groups;
}

function chooseCanonicalRepository(
  left: GitHubRepositorySummary,
  right: GitHubRepositorySummary,
): GitHubRepositorySummary {
  const byUpdatedAt = right.updated_at.localeCompare(left.updated_at);
  if (byUpdatedAt !== 0) return byUpdatedAt > 0 ? right : left;
  return right.full_name.localeCompare(left.full_name) < 0 ? right : left;
}

function toQueueEntry(
  item: CollectedRepository,
  config: DiscoveryConfig,
  checkedAt: Date,
): DiscoveryQueueEntry {
  const repository = item.repository;
  const rejectionReasons = applyHardGates(repository, config, checkedAt);

  return {
    repositoryId: repository.id,
    fullName: repository.full_name,
    normalizedFullName: repository.full_name.toLowerCase(),
    htmlUrl: repository.html_url,
    description: repository.description?.trim().slice(0, 500) || null,
    stars: repository.stargazers_count,
    forks: repository.forks_count,
    openIssues: repository.open_issues_count,
    defaultBranch: repository.default_branch,
    archived: repository.archived,
    disabled: repository.disabled,
    isFork: repository.fork,
    licenseSpdxId: normalizeLicense(repository.license?.spdx_id),
    pushedAt: repository.pushed_at,
    topics: [...(repository.topics ?? [])].sort().slice(0, 50),
    sourceIds: [...item.sourceIds].sort(),
    reviewState: rejectionReasons.length === 0 ? "review" : "rejected",
    rejectionReasons,
  };
}

function applyHardGates(
  repository: GitHubRepositorySummary,
  config: DiscoveryConfig,
  checkedAt: Date,
): string[] {
  const reasons: string[] = [];
  const license = normalizeLicense(repository.license?.spdx_id);

  if (repository.visibility !== "public") reasons.push("repository_not_public");
  if (repository.disabled) reasons.push("repository_disabled");
  if (!config.gates.allowForks && repository.fork) reasons.push("fork_not_allowed");
  if (!config.gates.allowArchived && repository.archived) reasons.push("archived_not_allowed");
  if (repository.stargazers_count < config.gates.minStars) reasons.push("stars_below_minimum");
  if (config.gates.requireLicense && !license) reasons.push("license_missing");
  if (config.gates.requireDescription && !repository.description?.trim()) {
    reasons.push("description_missing");
  }

  if (config.gates.maxPushedAgeDays !== null) {
    const pushedAt = repository.pushed_at ? new Date(repository.pushed_at) : null;
    const oldestAllowed = checkedAt.getTime() - config.gates.maxPushedAgeDays * 86_400_000;
    if (!pushedAt || Number.isNaN(pushedAt.getTime()) || pushedAt.getTime() < oldestAllowed) {
      reasons.push("last_push_too_old");
    }
  }

  return reasons.sort();
}

function assertRepository(repository: GitHubRepositorySummary): void {
  if (
    !Number.isInteger(repository.id) ||
    repository.id <= 0 ||
    !/^[^/\s]+\/[^/\s]+$/.test(repository.full_name) ||
    !repository.html_url ||
    !repository.default_branch ||
    !repository.updated_at
  ) {
    throw new Error("GitHub 仓库响应缺少发现队列所需字段");
  }
}

function normalizeLicense(value: string | undefined): string | null {
  if (!value || value === "NOASSERTION" || value === "OTHER") return null;
  return value;
}

function compareEntries(left: DiscoveryQueueEntry, right: DiscoveryQueueEntry): number {
  if (left.reviewState !== right.reviewState) return left.reviewState === "review" ? -1 : 1;
  if (left.stars !== right.stars) return right.stars - left.stars;
  return left.normalizedFullName.localeCompare(right.normalizedFullName);
}

function fingerprintConfig(config: DiscoveryConfig): string {
  return `sha256:${createHash("sha256").update(JSON.stringify(config)).digest("hex")}`;
}
