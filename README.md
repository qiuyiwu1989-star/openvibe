# OpenVibe：Vibe Coding 探索者

面向全年龄学习者的 Vibe Coding 开源学习地图。无论是儿童、青少年、大学生、职场人还是退休后的探索者，都可以从一个自己真正在意的小作品开始，再逐步看懂和改造成熟的 GitHub 项目。

OpenVibe 不以 Star 榜单或年龄分类为终点，而是回答：我想做什么、哪个案例适合我现在的经验、应该从哪里开始，以及怎样让作品真正属于自己。年龄只在需要时帮助推荐起点，不构成使用门槛或能力判断。

当前状态：**全年龄产品定位已经明确；OpenVibe 正在接入“同学”成为独立频道，阶段 11 的 K12 真实试教执行单仍等待完成两场专项试教。**目标生产地址为 [tongxue.yongle.school/openvibe](https://tongxue.yongle.school/openvibe)。

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

当前包含 20 个全年龄可用的新手作品任务，以及 30 个经过审核的进阶学习案例。学习者可以按兴趣直接选择，也可以使用针对 K12 场景补充的四个年龄入口、四周路线和教师/家长引导卡。年龄标签只是额外的学习设计，不把 OpenVibe 限定为儿童产品。`/pilot/guide` 提供两套 K12 场景的 90 分钟试教执行单，`/pilot` 记录匿名整场汇总、卡点、成人介入与作者证据；数据只保存在当前浏览器并可导出 JSON。

如需生成正确的绝对社交分享地址，在构建或部署环境中设置：

```bash
NEXT_PUBLIC_SITE_URL=https://你的站点域名/openvibe
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

## 持续更新

```bash
# 扫描 30 个已发布仓库，只生成待审队列
GITHUB_TOKEN=... npm run updates:scan

# 审核单个更新；高风险变更需额外显式授权
npm run updates:review -- --repository-id <id> --decision approve \
  --reviewer <审核者> --reviewed-at <ISO 时间> --notes "<核对结论>"
```

更新日志位于 `/updates`，RSS 2.0 订阅源位于 `/updates/feed.xml`。完整操作和风险分类见 [持续更新运维手册](docs/update-operations.md)。

## 生产运行

生产发布使用 GitHub 的受保护 `production` Environment。每次发布先重新测试和构建，再在服务器创建独立 Git SHA 版本；本机及公网健康检查失败都会恢复上一版本。服务器准备、密钥名称、Nginx 和回滚流程见 [生产部署手册](docs/deployment.md)。

## 阶段报告

- [人机协作开发总结报告](docs/collaboration-retrospective.md)
- [阶段 1 实施报告](docs/stage-1-report.md)
- [MVP 完成报告](docs/mvp-report.md)
- [阶段 3：新手作品入口](docs/stage-3-report.md)
- [阶段 4：持续更新闭环](docs/stage-4-report.md)
- [阶段 6：作品学习闭环](docs/stage-6-report.md)
- [阶段 7：上线与运营基础](docs/stage-7-report.md)
- [阶段 8：K12 创造者学习路径试点](docs/stage-8-report.md)
- [阶段 9：K12 案例扩展与四周学习路线](docs/stage-9-report.md)
- [阶段 10：匿名试教与反馈闭环](docs/stage-10-report.md)
- [阶段 11：真实试教验证冲刺](docs/stage-11-report.md)
- [真实试教协议](docs/pilot-sprint-protocol.md)

## 许可证

项目代码以 [MIT License](LICENSE) 开源。收录项目仍分别遵循各自仓库的许可证。
