import { readFile } from "node:fs/promises";

import { DiscoveryConfigSchema, type DiscoveryConfig } from "./schema.js";

export async function readDiscoveryConfig(filePath: string): Promise<DiscoveryConfig> {
  const contents = await readFile(filePath, "utf8");
  return DiscoveryConfigSchema.parse(JSON.parse(contents) as unknown);
}

export function requireGitHubToken(value: string | undefined): string {
  const token = value?.trim();
  if (!token) {
    throw new MissingGitHubTokenError();
  }
  return token;
}

export class MissingGitHubTokenError extends Error {
  constructor() {
    super("自动发现需要 GITHUB_TOKEN；令牌只从环境变量读取且不会写入输出或日志");
    this.name = "MissingGitHubTokenError";
  }
}
