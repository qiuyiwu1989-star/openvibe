import type { RepositoryLocator } from "../../packages/schema/src/index.js";

export type { RepositoryLocator } from "../../packages/schema/src/index.js";

export const STAGE_ONE_REPOSITORIES: readonly RepositoryLocator[] = [
  { owner: "Nutlope", name: "roomGPT" },
  { owner: "nextjs", name: "saas-starter" },
  { owner: "browser-use", name: "web-ui" },
  { owner: "openstatusHQ", name: "openstatus" },
  { owner: "actualbudget", name: "actual" },
] as const;

export function parseRepositoryLocator(value: string): RepositoryLocator {
  const parts = value.trim().split("/");

  if (parts.length !== 2 || parts.some((part) => !/^[A-Za-z0-9_.-]+$/.test(part))) {
    throw new Error(`仓库定位符必须是 owner/name：${value}`);
  }

  return { owner: parts[0], name: parts[1] };
}
