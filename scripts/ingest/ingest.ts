import { createHash } from "node:crypto";

import { decodeBase64Text, GitHubClient, GitHubRequestError } from "./github-client.js";
import {
  IngestOutcomeSchema,
  type IngestCommand,
  type IngestOutcome,
  type RepositorySnapshot,
} from "../../packages/schema/src/index.js";
import { GITHUB_API_VERSION } from "./types.js";

type GitHubRepository = {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  homepage: string | null;
  default_branch: string;
  visibility: string;
  fork: boolean;
  is_template?: boolean;
  archived: boolean;
  disabled: boolean;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  subscribers_count?: number;
  language: string | null;
  topics?: string[];
  license: {
    spdx_id: string;
    name: string;
    url: string | null;
  } | null;
  created_at: string;
  updated_at: string;
  pushed_at: string | null;
  owner: {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    type: string;
  };
};

type GitHubReadme = {
  path: string;
  sha: string;
  html_url: string | null;
  content?: string;
  encoding?: string;
  truncated?: boolean;
};

type SnapshotLicense = RepositorySnapshot["license"];

export async function ingestRepository(
  command: IngestCommand,
  client = new GitHubClient({ token: process.env.GITHUB_TOKEN }),
  now: () => Date = () => new Date(),
  options: { readmeMode?: "api" | "raw" } = {},
): Promise<IngestOutcome> {
  const encodedOwner = encodeURIComponent(command.locator.owner);
  const encodedName = encodeURIComponent(command.locator.name);
  const repositoryPath = `/repos/${encodedOwner}/${encodedName}`;

  try {
    const repositoryResponse = await client.getJson<GitHubRepository>(repositoryPath, {
      etag: command.force ? undefined : command.ifNoneMatch,
    });

    if (repositoryResponse.status === "not_modified") {
      const etag = repositoryResponse.etag ?? command.ifNoneMatch;
      if (!command.knownRepositoryId || !etag) {
        return parseOutcome({
          status: "failed",
          error: {
            code: "invalid_response",
            message: "GitHub 返回 304，但缺少已知 repositoryId 或 ETag",
            status: 304,
            retryable: false,
            retryAt: null,
            retryAfterSeconds: null,
          },
        });
      }

      return parseOutcome({
        status: "not_modified",
        repositoryId: command.knownRepositoryId,
        checkedAt: now().toISOString(),
        etag,
      });
    }

    const repository = repositoryResponse.data;
    assertRepositoryResponse(repository);

    // These calls deliberately remain sequential to keep rate-limit behavior predictable.
    const languagesResponse = await client.getJson<Record<string, number>>(
      `/repos/${encodeURIComponent(repository.owner.login)}/${encodeURIComponent(repository.name)}/languages`,
    );
    if (languagesResponse.status === "not_modified") {
      throw new Error("languages 请求意外返回 304");
    }

    const readme = options.readmeMode === "raw"
      ? await fetchRawReadme(client, repository)
      : await fetchApiReadme(client, repository);
    const license = normalizeApiLicense(repository.license) ?? await detectRawLicense(client, repository);

    return parseOutcome({
      status: "changed",
      snapshot: normalizeSnapshot(
        repository,
        languagesResponse.data,
        readme,
        license,
        repositoryResponse.etag,
        now().toISOString(),
      ),
    });
  } catch (error) {
    if (error instanceof GitHubRequestError) {
      return parseOutcome({ status: "failed", error: error.failure });
    }

    return parseOutcome({
      status: "failed",
      error: {
        code: "invalid_response",
        message: error instanceof Error ? error.message : "抓取过程中出现未知错误",
        status: null,
        retryable: false,
        retryAt: null,
        retryAfterSeconds: null,
      },
    });
  }
}

async function detectRawLicense(
  client: GitHubClient,
  repository: GitHubRepository,
): Promise<SnapshotLicense> {
  const owner = encodeURIComponent(repository.owner.login);
  const name = encodeURIComponent(repository.name);
  const branch = encodeURIComponent(repository.default_branch);

  for (const licensePath of ["LICENSE", "LICENSE.md", "LICENSE.txt"]) {
    try {
      const response = await client.getText(
        `https://raw.githubusercontent.com/${owner}/${name}/${branch}/${licensePath}`,
      );
      const detected = detectLicenseText(response.data);
      if (!detected) return null;
      return {
        ...detected,
        url: `${repository.html_url}/blob/${branch}/${licensePath}`,
      };
    } catch (error) {
      if (error instanceof GitHubRequestError && error.failure.code === "not_found") continue;
      throw error;
    }
  }

  return null;
}

function detectLicenseText(value: string): Omit<NonNullable<SnapshotLicense>, "url"> | null {
  const text = value.slice(0, 30_000);
  if (/GNU AFFERO GENERAL PUBLIC LICENSE|\bAGPLv?3\b/i.test(text)) {
    return { spdxId: "AGPL-3.0", name: "GNU Affero General Public License v3.0" };
  }
  if (/Apache License[\s\S]{0,100}Version 2\.0/i.test(text)) {
    return { spdxId: "Apache-2.0", name: "Apache License 2.0" };
  }
  if (/Mozilla Public License[\s\S]{0,100}2\.0/i.test(text)) {
    return { spdxId: "MPL-2.0", name: "Mozilla Public License 2.0" };
  }
  if (/MIT License|Permission is hereby granted, free of charge/i.test(text)) {
    return { spdxId: "MIT", name: "MIT License" };
  }
  if (/BSD 3-Clause/i.test(text)) {
    return { spdxId: "BSD-3-Clause", name: "BSD 3-Clause License" };
  }
  return null;
}

async function fetchApiReadme(
  client: GitHubClient,
  repository: GitHubRepository,
): Promise<RepositorySnapshot["readme"]> {
  try {
    const readmeResponse = await client.getJson<GitHubReadme>(
      `/repos/${encodeURIComponent(repository.owner.login)}/${encodeURIComponent(repository.name)}/readme`,
    );
    if (readmeResponse.status === "not_modified") {
      throw new Error("README 请求意外返回 304");
    }
    return normalizeReadme(readmeResponse.data, repository);
  } catch (error) {
    if (error instanceof GitHubRequestError && error.failure.code === "not_found") return null;
    throw error;
  }
}

async function fetchRawReadme(
  client: GitHubClient,
  repository: GitHubRepository,
): Promise<RepositorySnapshot["readme"]> {
  const owner = encodeURIComponent(repository.owner.login);
  const name = encodeURIComponent(repository.name);
  const branch = encodeURIComponent(repository.default_branch);
  const readmePath = "README.md";

  try {
    const response = await client.getText(
      `https://raw.githubusercontent.com/${owner}/${name}/${branch}/${readmePath}`,
    );
    const normalized = response.data.replace(/\r\n/g, "\n").trim();
    const excerpt = normalized ? normalized.slice(0, 1200).trim() : null;
    const contentSha = gitBlobSha(response.bytes);

    return {
      path: readmePath,
      sha: contentSha,
      htmlUrl: `${repository.html_url}/blob/${branch}/${readmePath}`,
      excerpt,
      truncated: normalized.length > 1200,
    };
  } catch (error) {
    if (error instanceof GitHubRequestError && error.failure.code === "not_found") return null;
    throw error;
  }
}

function gitBlobSha(bytes: Uint8Array): string {
  return createHash("sha1")
    .update(`blob ${bytes.byteLength}\0`, "utf8")
    .update(bytes)
    .digest("hex");
}

function parseOutcome(value: unknown): IngestOutcome {
  return IngestOutcomeSchema.parse(value);
}

function normalizeSnapshot(
  repository: GitHubRepository,
  languages: Record<string, number>,
  readme: RepositorySnapshot["readme"],
  license: SnapshotLicense,
  etag: string | null,
  fetchedAt: string,
): RepositorySnapshot {
  return {
    schemaVersion: "1.0.0",
    repositoryId: repository.id,
    nodeId: repository.node_id,
    owner: {
      login: repository.owner.login,
      id: repository.owner.id,
      type: repository.owner.type as "User" | "Organization",
      avatarUrl: repository.owner.avatar_url,
    },
    name: repository.name,
    fullName: repository.full_name,
    htmlUrl: repository.html_url,
    description: repository.description?.trim().slice(0, 500) || null,
    homepageUrl: normalizeUrl(repository.homepage),
    defaultBranch: repository.default_branch,
    visibility: "public",
    isFork: repository.fork,
    isTemplate: repository.is_template ?? false,
    archived: repository.archived,
    disabled: repository.disabled,
    metrics: {
      stars: repository.stargazers_count,
      forks: repository.forks_count,
      openIssues: repository.open_issues_count,
      subscribers: repository.subscribers_count ?? null,
    },
    primaryLanguage: repository.language,
    languages,
    topics: (repository.topics ?? []).slice(0, 50),
    license,
    timestamps: {
      createdAt: repository.created_at,
      updatedAt: repository.updated_at,
      pushedAt: repository.pushed_at,
      fetchedAt,
    },
    readme,
    source: {
      provider: "github",
      apiVersion: GITHUB_API_VERSION,
      etag,
    },
  };
}

function normalizeApiLicense(license: GitHubRepository["license"]): SnapshotLicense {
  if (!license || license.spdx_id === "NOASSERTION") return null;
  return {
    spdxId: license.spdx_id,
    name: license.name,
    url: license.url,
  };
}

function normalizeReadme(
  readme: GitHubReadme,
  repository: GitHubRepository,
): RepositorySnapshot["readme"] {
  if (!readme.path || !readme.sha) throw new Error("README 响应缺少 path 或 sha");

  const decoded = readme.content && readme.encoding === "base64" ? decodeBase64Text(readme.content) : "";
  const normalized = decoded.replace(/\r\n/g, "\n").trim();
  const excerpt = normalized ? normalized.slice(0, 1200).trim() : null;

  return {
    path: readme.path,
    sha: readme.sha,
    htmlUrl:
      readme.html_url ??
      `${repository.html_url}/blob/${encodeURIComponent(repository.default_branch)}/${readme.path
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`,
    excerpt,
    truncated: Boolean(readme.truncated) || normalized.length > 1200,
  };
}

function normalizeUrl(value: string | null): string | null {
  if (!value?.trim()) return null;
  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
}

function assertRepositoryResponse(repository: GitHubRepository): void {
  if (
    !Number.isInteger(repository.id) ||
    repository.id <= 0 ||
    !repository.node_id ||
    !repository.full_name ||
    !repository.owner?.login ||
    !["User", "Organization"].includes(repository.owner.type)
  ) {
    throw new Error("GitHub 仓库响应缺少必需字段");
  }

  if (repository.visibility !== "public") {
    throw new Error("只允许抓取公开仓库");
  }
}
