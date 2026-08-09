# 开源雷达

面向 vibe coding 初学者的 GitHub 开源项目学习导航。产品不以 Star 榜单为终点，而是回答：项目是否值得学、适合谁学、应该从哪里开始复刻。

当前状态：**阶段 1 的 5 项目纵向样板已经跑通；抓取、策展、审核、静态页面与质量门均已落地，尚未部署。**

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
npm run build
```

`npm test` 同时执行 TypeScript 类型检查与 fixture 运行时 Schema 校验。

## 本地浏览

```bash
npm run dev
```

当前包含 RoomGPT、Next.js SaaS Starter、Browser Use Web UI、openstatus 和 Actual Budget 五个真实学习样板。

## 阶段报告

- [阶段 1 实施报告](docs/stage-1-report.md)
