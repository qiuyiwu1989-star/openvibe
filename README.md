# OpenVibe Atlas：Vibe Coding 探索者

面向 vibe coding 初学者的 GitHub 开源项目学习导航。产品不以 Star 榜单为终点，而是回答：项目是否值得学、适合谁学、应该从哪里开始复刻。

OpenVibe Atlas 的目标，是把散落在 GitHub 上的优秀开源项目整理成一张可探索、可理解、可动手复刻的学习地图。

当前状态：**阶段 3 已完成：13 个低门槛作品任务构成新手入口，30 个经过事实、策展与审核门的项目保留为进阶库；尚未部署公网。**

## 阶段 0 产物

- [产品范围](docs/product-scope.md)
- [架构决策](docs/architecture-decisions.md)
- [数据契约](docs/data-contract.md)
- [评分规则](docs/scoring.md)
- [Agent 协作契约](docs/agent-contracts.md)
- [阶段 1 派工单](docs/stage-1-dispatch.md)
- [可执行 Schema](packages/schema/src/index.ts)
- [合成 fixture](data/fixtures/projects/example-project.json)

## 本地校验

```bash
npm install
npm test
npm run validate:snapshots
npm run validate:candidates
npm run build
```

`npm test` 同时执行 TypeScript 类型检查与 fixture 运行时 Schema 校验。

## 本地浏览

```bash
npm run dev
```

当前包含 13 个新手作品任务和 30 个进阶学习案例。`/start` 提供无后端、无付费服务的小作品入口；`/explore` 保留成熟开源项目，可组合使用关键词、难度、类型、学习目标和技术栈筛选。

如需生成正确的绝对社交分享地址，在构建或部署环境中设置：

```bash
NEXT_PUBLIC_SITE_URL=https://你的站点域名
```

## 内容工作流

```bash
# 自动发现只产生 review/rejected 队列，需要 GITHUB_TOKEN
npm run discover

# 将已复核的策展草案绑定快照，保持 pending
npm run catalog:materialize -- --generated-at 2026-08-10T01:15:00+09:00

# 生成本地发布 bundle；不会覆盖已有 bundle
npm run catalog:approve -- --reviewer <审核者> --reviewed-at <ISO 时间>
```

自动发现不会提交文件，也无法生成 `published` 状态；定时 GitHub Actions 只上传候选队列 artifact。

## 阶段报告

- [阶段 1 实施报告](docs/stage-1-report.md)
- [MVP 完成报告](docs/mvp-report.md)
- [阶段 3：新手作品入口](docs/stage-3-report.md)

## 许可证

项目代码以 [MIT License](LICENSE) 开源。收录项目仍分别遵循各自仓库的许可证。
