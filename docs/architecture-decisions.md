# 架构决策记录

## ADR-001：静态优先

**决定**：MVP 使用版本化 JSON 内容构建静态页面，不引入生产数据库。

**原因**：30～200 个项目范围内，文件更易审核、回滚、测试与多 Agent 协作；线上页面不依赖 GitHub 实时可用性。

**复审条件**：需要用户收藏、投稿工作流或内容规模显著超过文件索引承载范围时。

## ADR-002：事实、判断、发布三层分离

**决定**：使用 `RepositorySnapshot`、`EditorialProfile`、`PublicationRecord` 三个独立对象，通过 `repositoryId` 关联。

**原因**：GitHub 更新不能覆盖编辑判断，编辑更新也不能伪造仓库事实；发布状态必须独立控制。

## ADR-003：稳定身份

**决定**：以 GitHub 数字 `repositoryId` 为实体主键，`owner/name` 只是可变化快照。

**原因**：仓库可以改名或转移所有者，但数字 ID 保持实体连续性。

## ADR-004：审核门

**决定**：自动流程最高只能把项目推进到 `review`；`published` 必须同时满足编辑内容已批准、发布时间存在、数据完整。

**原因**：模型评分用于缩小候选范围，不应替代发布责任。

## ADR-005：GitHub API 使用边界

**决定**：抓取端使用版本化 REST API、条件请求和串行队列；处理 `ETag`、`304`、`403`、`429`、重定向及指数退避。

**原因**：GitHub 官方建议避免轮询和并发请求，优先认证、缓存及条件请求。当前契约基于 `X-GitHub-Api-Version: 2026-03-10`，实现阶段若官方版本变化必须先更新 fixture 与契约测试。

参考：

- <https://docs.github.com/en/rest/repos/repos>
- <https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api>
- <https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api>

## ADR-006：摘要而非复制

**决定**：仅保存有限长度 README 摘要、证据路径与来源链接，不保存整篇 README 用于公开展示。

**原因**：降低内容过期、版权和数据膨胀风险，同时保留判断依据。

