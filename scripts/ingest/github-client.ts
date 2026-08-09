import { Buffer } from "node:buffer";

import type { IngestFailure } from "./types.js";
import { GITHUB_API_VERSION } from "./types.js";

const API_ROOT = "https://api.github.com";

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

type GitHubClientOptions = {
  token?: string;
  fetchImpl?: FetchLike;
  now?: () => Date;
};

export class GitHubRequestError extends Error {
  readonly failure: IngestFailure;

  constructor(failure: IngestFailure) {
    super(failure.message);
    this.name = "GitHubRequestError";
    this.failure = failure;
  }
}

type RequestOptions = {
  etag?: string;
  accept?: string;
};

export type GitHubJsonResponse<T> = {
  status: "ok";
  data: T;
  etag: string | null;
};

export type GitHubNotModifiedResponse = {
  status: "not_modified";
  etag: string | null;
};

export class GitHubClient {
  private readonly token?: string;
  private readonly fetchImpl: FetchLike;
  private readonly now: () => Date;

  constructor(options: GitHubClientOptions = {}) {
    this.token = options.token;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? (() => new Date());
  }

  async getJson<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<GitHubJsonResponse<T> | GitHubNotModifiedResponse> {
    const headers = new Headers({
      Accept: options.accept ?? "application/vnd.github+json",
      "User-Agent": "open-source-radar-ingest",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
    });

    if (this.token) {
      headers.set("Authorization", `Bearer ${this.token}`);
    }

    if (options.etag) {
      headers.set("If-None-Match", options.etag);
    }

    let response: Response;
    try {
      response = await this.fetchImpl(new URL(path, API_ROOT), {
        method: "GET",
        headers,
        redirect: "follow",
      });
    } catch {
      throw new GitHubRequestError({
        code: "network",
        message: "无法连接 GitHub API",
        status: null,
        retryable: true,
        retryAt: null,
        retryAfterSeconds: null,
      });
    }

    const etag = response.headers.get("etag");
    if (response.status === 304) {
      return { status: "not_modified", etag };
    }

    if (!response.ok) {
      throw new GitHubRequestError(this.toFailure(response));
    }

    try {
      return {
        status: "ok",
        data: (await response.json()) as T,
        etag,
      };
    } catch {
      throw new GitHubRequestError({
        code: "invalid_response",
        message: "GitHub API 返回了无法解析的 JSON",
        status: response.status,
        retryable: false,
        retryAt: null,
        retryAfterSeconds: null,
      });
    }
  }

  private toFailure(response: Response): IngestFailure {
    const retryAfterHeader = response.headers.get("retry-after");
    const resetHeader = response.headers.get("x-ratelimit-reset");
    const remaining = response.headers.get("x-ratelimit-remaining");
    const parsedRetryAfterSeconds = parseRetryAfter(retryAfterHeader, this.now());
    const resetDate = parseRateLimitReset(resetHeader);
    const isRateLimited =
      response.status === 429 ||
      (response.status === 403 &&
        (remaining === "0" || parsedRetryAfterSeconds !== null || resetDate !== null));
    const retryAfterSeconds =
      isRateLimited && parsedRetryAfterSeconds === null && resetDate === null
        ? 60
        : parsedRetryAfterSeconds;
    const fallbackRetryAt = retryAfterSeconds === null
      ? resetDate
      : new Date(this.now().getTime() + retryAfterSeconds * 1000);

    if (isRateLimited) {
      return {
        code: "rate_limited",
        message: "GitHub API 请求受限，请在退避时间后重试",
        status: response.status,
        retryable: true,
        retryAt: fallbackRetryAt?.toISOString() ?? null,
        retryAfterSeconds:
          retryAfterSeconds ??
          (resetDate ? Math.max(0, Math.ceil((resetDate.getTime() - this.now().getTime()) / 1000)) : null),
      };
    }

    if (response.status === 403) {
      return {
        code: "forbidden",
        message: "GitHub API 拒绝了请求",
        status: response.status,
        retryable: retryAfterSeconds !== null,
        retryAt: fallbackRetryAt?.toISOString() ?? null,
        retryAfterSeconds,
      };
    }

    if (response.status === 404) {
      return {
        code: "not_found",
        message: "GitHub 仓库或资源不存在",
        status: response.status,
        retryable: false,
        retryAt: null,
        retryAfterSeconds: null,
      };
    }

    return {
      code: "github_error",
      message: `GitHub API 请求失败（HTTP ${response.status}）`,
      status: response.status,
      retryable: response.status >= 500,
      retryAt: null,
      retryAfterSeconds: null,
    };
  }
}

export function decodeBase64Text(content: string): string {
  return Buffer.from(content.replace(/\s/g, ""), "base64").toString("utf8");
}

function parseRetryAfter(value: string | null, now: Date): number | null {
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.ceil((date.getTime() - now.getTime()) / 1000));
}

function parseRateLimitReset(value: string | null): Date | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const date = new Date(Number(value) * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}
