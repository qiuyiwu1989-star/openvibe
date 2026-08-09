import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { GitHubClient } from "../ingest/github-client.js";
import { MissingGitHubTokenError, requireGitHubToken } from "./config.js";
import { discoverRepositories } from "./discover.js";
import {
  DiscoveryConfigSchema,
  DiscoveryQueueEntrySchema,
  DiscoveryRunOutcomeSchema,
  type DiscoveryConfig,
} from "./schema.js";

const FIXED_NOW = new Date("2026-08-10T00:00:00.000Z");

test("deduplicates seed/search results deterministically and merges source IDs", async () => {
  const repositoryA = repository({ id: 1, full_name: "Example/Alpha", stargazers_count: 900 });
  const repositoryB = repository({ id: 2, full_name: "Example/Beta", stargazers_count: 500 });
  const responses = [
    { status: "ok" as const, data: repositoryA, etag: null },
    {
      status: "ok" as const,
      data: { items: [repositoryB, { ...repositoryA, updated_at: "2026-08-09T00:00:00Z" }] },
      etag: null,
    },
  ];
  const client = {
    async getJson<T>() {
      const response = responses.shift();
      assert.ok(response);
      return response as { status: "ok"; data: T; etag: string | null };
    },
  };

  const outcome = await discoverRepositories(config(), client, () => FIXED_NOW);

  DiscoveryRunOutcomeSchema.parse(outcome);
  assert.equal(outcome.status, "success");
  if (outcome.status !== "success") return;
  assert.equal(outcome.entries.length, 2);
  assert.deepEqual(outcome.entries.map((entry) => entry.repositoryId), [1, 2]);
  assert.deepEqual(outcome.entries[0].sourceIds, ["search:example-search", "seed:Example/Alpha"]);
  assert.deepEqual(outcome.summary, { total: 2, review: 2, rejected: 0 });
});

test("applies hard gates and emits machine-readable rejection reasons", async () => {
  const rejected = repository({
    id: 3,
    full_name: "Example/Rejected",
    archived: true,
    fork: true,
    description: null,
    stargazers_count: 2,
    license: null,
    pushed_at: "2020-01-01T00:00:00Z",
  });
  const client = {
    async getJson<T>() {
      return {
        status: "ok" as const,
        data: { items: [rejected] } as T,
        etag: null,
      };
    },
  };
  const onlySearch = config({ seeds: [] });

  const outcome = await discoverRepositories(onlySearch, client, () => FIXED_NOW);

  DiscoveryRunOutcomeSchema.parse(outcome);
  assert.equal(outcome.status, "success");
  if (outcome.status !== "success") return;
  assert.equal(outcome.entries[0].reviewState, "rejected");
  assert.deepEqual(outcome.entries[0].rejectionReasons, [
    "archived_not_allowed",
    "description_missing",
    "fork_not_allowed",
    "last_push_too_old",
    "license_missing",
    "stars_below_minimum",
  ]);
  assert.deepEqual(outcome.summary, { total: 1, review: 0, rejected: 1 });
});

test("returns structured rate-limit backoff and no partial queue", async () => {
  const client = new GitHubClient({
    now: () => FIXED_NOW,
    fetchImpl: async () =>
      new Response(null, {
        status: 429,
        headers: { "retry-after": "120" },
      }),
  });

  const outcome = await discoverRepositories(config(), client, () => FIXED_NOW);

  DiscoveryRunOutcomeSchema.parse(outcome);
  assert.equal(outcome.status, "failed");
  if (outcome.status !== "failed") return;
  assert.equal(outcome.error.code, "rate_limited");
  assert.equal(outcome.error.retryAfterSeconds, 120);
  assert.equal(outcome.error.retryAt, "2026-08-10T00:02:00.000Z");
  assert.equal("entries" in outcome, false);
});

test("requires a token without exposing its value", () => {
  assert.throws(
    () => requireGitHubToken("  "),
    (error) =>
      error instanceof MissingGitHubTokenError &&
      error.message.includes("GITHUB_TOKEN") &&
      !error.message.includes("Bearer"),
  );
  assert.equal(requireGitHubToken("token-value"), "token-value");
});

test("CLI reports missing token and preserves an existing queue", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "radar-discovery-"));
  const configPath = path.join(directory, "config.json");
  const outputPath = path.join(directory, "queue.json");
  const previousQueue = "previous-review-queue\n";
  await writeFile(configPath, `${JSON.stringify(config({ seeds: [] }))}\n`, "utf8");
  await writeFile(outputPath, previousQueue, "utf8");
  const environment = { ...process.env };
  delete environment.GITHUB_TOKEN;

  const result = spawnSync(
    process.execPath,
    [
      path.resolve("node_modules/tsx/dist/cli.mjs"),
      path.resolve("scripts/discover/cli.ts"),
      "--config",
      configPath,
      "--output",
      outputPath,
    ],
    { cwd: path.resolve("."), env: environment, encoding: "utf8" },
  );

  assert.equal(result.status, 1);
  const failure = JSON.parse(result.stderr.trim()) as unknown;
  const parsed = DiscoveryRunOutcomeSchema.parse(failure);
  assert.equal(parsed.status, "failed");
  if (parsed.status !== "failed") return;
  assert.equal(parsed.error.code, "missing_token");
  assert.equal(result.stderr.includes("token-value"), false);
  assert.equal(await readFile(outputPath, "utf8"), previousQueue);
});

test("queue schema cannot represent published state", () => {
  const invalid = {
    ...queueEntry(),
    reviewState: "published",
  };
  assert.equal(DiscoveryQueueEntrySchema.safeParse(invalid).success, false);
});

function config(overrides: Partial<DiscoveryConfig> = {}): DiscoveryConfig {
  return DiscoveryConfigSchema.parse({
    schemaVersion: "1.0.0",
    seeds: [{ owner: "Example", name: "Alpha" }],
    searches: [{ id: "example-search", query: "topic:example", maxResults: 20 }],
    gates: {
      minStars: 100,
      requireLicense: true,
      requireDescription: true,
      allowForks: false,
      allowArchived: false,
      maxPushedAgeDays: 1095,
    },
    ...overrides,
  });
}

function repository(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    full_name: "Example/Alpha",
    html_url: "https://github.com/Example/Alpha",
    description: "Example project",
    stargazers_count: 500,
    forks_count: 20,
    open_issues_count: 3,
    default_branch: "main",
    archived: false,
    disabled: false,
    fork: false,
    visibility: "public",
    license: { spdx_id: "MIT" },
    pushed_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    topics: ["example"],
    ...overrides,
  };
}

function queueEntry() {
  return {
    repositoryId: 1,
    fullName: "Example/Alpha",
    normalizedFullName: "example/alpha",
    htmlUrl: "https://github.com/Example/Alpha",
    description: "Example project",
    stars: 500,
    forks: 20,
    openIssues: 3,
    defaultBranch: "main",
    archived: false,
    disabled: false,
    isFork: false,
    licenseSpdxId: "MIT",
    pushedAt: "2026-08-01T00:00:00Z",
    topics: ["example"],
    sourceIds: ["search:example-search"],
    reviewState: "review",
    rejectionReasons: [],
  };
}
