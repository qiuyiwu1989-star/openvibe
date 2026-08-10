import historyData from "../../data/updates/history.json";

import {
  UpdateHistorySchema,
  type UpdateHistoryEntry,
} from "../../packages/schema/src/index";

const history = UpdateHistorySchema.parse(historyData);

export const updateChangeLabels: Record<
  UpdateHistoryEntry["changeKinds"][number],
  string
> = {
  repository_renamed: "仓库改名",
  default_branch_changed: "默认分支",
  description_changed: "项目介绍",
  license_changed: "许可证",
  readme_changed: "README",
  technology_changed: "技术栈",
  activity_changed: "活跃信息",
  metrics_changed: "GitHub 指标",
  availability_changed: "可用状态",
  maintenance_risk: "维护风险",
};

export function getUpdateHistory(): UpdateHistoryEntry[] {
  return [...history.entries].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
}
