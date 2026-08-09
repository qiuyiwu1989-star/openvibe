import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  IngestOutcomeSchema,
  RepositorySnapshotSchema,
} from "../../packages/schema/src/index.js";
import { GitHubClient } from "./github-client.js";
import { ingestRepository } from "./ingest.js";
import { readStoredSnapshot, snapshotPath, writeSnapshotAtomically } from "./storage.js";

const FIXED_NOW = new Date("2026-08-09T12:00:00.000Z");

test("produces a schema-valid snapshot and sends conditional/version headers", async () => {
  const requests: Array<{ url: string; headers: Headers; redirect: RequestRedirect | undefined }> = [];
  const responses = [
    jsonResponse(repositoryPayload(), 200, { etag: 'W/"repo-etag"' }),
    jsonResponse({ TypeScript: 1200, CSS: 80 }),
    jsonResponse({
      path: "README.md",
      sha: "abc123",
      html_url: "https://github.com/example/project/blob/main/README.md",
      encoding: "base64",
      content: Buffer.from(`# Example\n\n${"a".repeat(1300)}`).toString("base64"),
    }),
  ];
  const client = new GitHubClient({
    token: "secret-that-must-not-appear",
    now: () => FIXED_NOW,
    fetchImpl: async (input, init) => {
      requests.push({
        url: String(input),
        headers: new Headers(init?.headers),
        redirect: init?.redirect,
      });
      const response = responses.shift();
      assert.ok(response);
      return response;
    },
  });

  const outcome = await ingestRepository(
    {
      locator: { owner: "example", name: "project" },
      ifNoneMatch: 'W/"old-etag"',
      force: false,
    },
    client,
    () => FIXED_NOW,
  );

  IngestOutcomeSchema.parse(outcome);
  assert.equal(outcome.status, "changed");
  if (outcome.status !== "changed") return;
  RepositorySnapshotSchema.parse(outcome.snapshot);
  assert.equal(outcome.snapshot.readme?.excerpt?.length, 1200);
  assert.equal(outcome.snapshot.readme?.truncated, true);
  assert.equal(requests.length, 3);
  assert.equal(requests[0].headers.get("if-none-match"), 'W/"old-etag"');
  assert.equal(requests[0].headers.get("x-github-api-version"), "2026-03-10");
  assert.equal(requests[0].headers.get("authorization"), "Bearer secret-that-must-not-appear");
  assert.equal(requests[0].redirect, "follow");
  assert.equal(requests[1].headers.get("if-none-match"), null);
});

test("returns not_modified after one request on a 304", async () => {
  let requestCount = 0;
  const client = new GitHubClient({
    fetchImpl: async () => {
      requestCount += 1;
      return new Response(null, { status: 304, headers: { etag: 'W/"same"' } });
    },
  });

  const outcome = await ingestRepository(
    {
      locator: { owner: "example", name: "project" },
      ifNoneMatch: 'W/"same"',
      knownRepositoryId: 123,
      force: false,
    },
    client,
    () => FIXED_NOW,
  );

  IngestOutcomeSchema.parse(outcome);
  assert.deepEqual(outcome, {
    status: "not_modified",
    repositoryId: 123,
    checkedAt: "2026-08-09T12:00:00.000Z",
    etag: 'W/"same"',
  });
  assert.equal(requestCount, 1);
});

test("turns an incomplete 304 into a public invalid_response outcome", async () => {
  const client = new GitHubClient({
    fetchImpl: async () => new Response(null, { status: 304 }),
  });

  const outcome = await ingestRepository(
    { locator: { owner: "example", name: "project" }, force: false },
    client,
    () => FIXED_NOW,
  );

  IngestOutcomeSchema.parse(outcome);
  assert.equal(outcome.status, "failed");
  if (outcome.status !== "failed") return;
  assert.equal(outcome.error.code, "invalid_response");
  assert.equal(outcome.error.status, 304);
});

test("force mode omits If-None-Match", async () => {
  let requestHeaders: Headers | undefined;
  const client = new GitHubClient({
    fetchImpl: async (_input, init) => {
      requestHeaders = new Headers(init?.headers);
      return new Response(null, { status: 404 });
    },
  });

  const outcome = await ingestRepository(
    {
      locator: { owner: "example", name: "project" },
      ifNoneMatch: 'W/"same"',
      force: true,
    },
    client,
  );

  IngestOutcomeSchema.parse(outcome);
  assert.equal(requestHeaders?.get("if-none-match"), null);
});

test("returns machine-readable backoff data for rate limits", async () => {
  const resetAtSeconds = Math.floor(FIXED_NOW.getTime() / 1000) + 90;
  const client = new GitHubClient({
    now: () => FIXED_NOW,
    fetchImpl: async () =>
      new Response(null, {
        status: 403,
        headers: {
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": String(resetAtSeconds),
        },
      }),
  });

  const outcome = await ingestRepository(
    { locator: { owner: "example", name: "project" }, force: false },
    client,
  );

  IngestOutcomeSchema.parse(outcome);
  assert.equal(outcome.status, "failed");
  if (outcome.status !== "failed") return;
  assert.equal(outcome.error.code, "rate_limited");
  assert.equal(outcome.error.retryable, true);
  assert.equal(outcome.error.retryAfterSeconds, 90);
  assert.equal(outcome.error.retryAt, "2026-08-09T12:01:30.000Z");
});

test("uses a safe default backoff when a 429 omits rate-limit headers", async () => {
  const client = new GitHubClient({
    now: () => FIXED_NOW,
    fetchImpl: async () => new Response(null, { status: 429 }),
  });

  const outcome = await ingestRepository(
    { locator: { owner: "example", name: "project" }, force: false },
    client,
  );

  IngestOutcomeSchema.parse(outcome);
  assert.equal(outcome.status, "failed");
  if (outcome.status !== "failed") return;
  assert.equal(outcome.error.code, "rate_limited");
  assert.equal(outcome.error.retryAfterSeconds, 60);
  assert.equal(outcome.error.retryAt, "2026-08-09T12:01:00.000Z");
});

test("a failed ingest leaves the previous snapshot file untouched", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "radar-ingest-"));
  const locator = { owner: "example", name: "project" };
  const filePath = snapshotPath(directory, locator);
  const previous = snapshotPayload();
  await writeSnapshotAtomically(filePath, previous);
  const before = await readFile(filePath, "utf8");

  const client = new GitHubClient({
    fetchImpl: async () => new Response(null, { status: 503 }),
  });
  const outcome = await ingestRepository({ locator, force: false }, client);

  IngestOutcomeSchema.parse(outcome);
  assert.equal(outcome.status, "failed");
  assert.equal(await readFile(filePath, "utf8"), before);
  assert.deepEqual(await readStoredSnapshot(filePath), previous);
});

function jsonResponse(
  value: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function repositoryPayload() {
  return {
    id: 123,
    node_id: "R_example",
    name: "project",
    full_name: "example/project",
    html_url: "https://github.com/example/project",
    description: "An example project",
    homepage: "https://example.com",
    default_branch: "main",
    visibility: "public",
    fork: false,
    is_template: false,
    archived: false,
    disabled: false,
    stargazers_count: 10,
    forks_count: 2,
    open_issues_count: 1,
    subscribers_count: 3,
    language: "TypeScript",
    topics: ["example"],
    license: {
      spdx_id: "MIT",
      name: "MIT License",
      url: "https://api.github.com/licenses/mit",
    },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    pushed_at: "2026-08-01T00:00:00Z",
    owner: {
      login: "example",
      id: 456,
      node_id: "U_example",
      avatar_url: "https://avatars.githubusercontent.com/u/456?v=4",
      type: "Organization",
    },
  };
}

function snapshotPayload() {
  return {
    schemaVersion: "1.0.0" as const,
    repositoryId: 123,
    nodeId: "R_example",
    owner: {
      login: "example",
      id: 456,
      type: "Organization" as const,
      avatarUrl: "https://avatars.githubusercontent.com/u/456?v=4",
    },
    name: "project",
    fullName: "example/project",
    htmlUrl: "https://github.com/example/project",
    description: "An example project",
    homepageUrl: "https://example.com/",
    defaultBranch: "main",
    visibility: "public" as const,
    isFork: false,
    isTemplate: false,
    archived: false,
    disabled: false,
    metrics: { stars: 10, forks: 2, openIssues: 1, subscribers: 3 },
    primaryLanguage: "TypeScript",
    languages: { TypeScript: 1200 },
    topics: ["example"],
    license: { spdxId: "MIT", name: "MIT License", url: "https://api.github.com/licenses/mit" },
    timestamps: {
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2026-08-01T00:00:00Z",
      pushedAt: "2026-08-01T00:00:00Z",
      fetchedAt: "2026-08-09T12:00:00Z",
    },
    readme: null,
    source: { provider: "github" as const, apiVersion: "2026-03-10" as const, etag: 'W/"old"' },
  };
}
