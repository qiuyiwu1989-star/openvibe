export const GITHUB_API_VERSION = "2026-03-10" as const;

export type {
  IngestCommand,
  IngestOutcome,
  RepositorySnapshot,
} from "../../packages/schema/src/index.js";

import type { IngestOutcome } from "../../packages/schema/src/index.js";

export type IngestFailure = Extract<IngestOutcome, { status: "failed" }>["error"];
