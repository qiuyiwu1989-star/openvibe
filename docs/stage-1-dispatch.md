# 阶段 1 派工单

目标：用 5 个项目跑通首条纵向链路，而不是直接扩展到 30 个项目。

## 开始条件

- `npm test` 通过。
- 主 Agent 冻结 Schema v1。
- 选定 5 个覆盖不同类型和难度的测试仓库。

## 已锁定的 5 个样板仓库

核对日期：2026-08-09。它们只是纵向样板，不因入选样板而自动获得最终发布资格。

| 仓库 | 样板角色 | 预期难度 |
|---|---|---|
| `Nutlope/roomGPT` | 单功能 AI 图片应用，验证新手级学习路径 | 简单 |
| `nextjs/saas-starter` | 登录、数据库、支付的 SaaS 骨架 | 中等 |
| `browser-use/web-ui` | Python 浏览器 Agent 与多模型配置 | 中等 |
| `openstatusHQ/openstatus` | 监控平台与多应用工程结构 | 较难 |
| `actualbudget/actual` | local-first 个人财务产品与成熟工程 | 较难 |

来源：

- <https://github.com/Nutlope/roomGPT>
- <https://github.com/nextjs/saas-starter>
- <https://github.com/browser-use/web-ui>
- <https://github.com/openstatusHQ/openstatus>
- <https://github.com/actualbudget/actual>

## 可并行工作包

### A：GitHub 抓取器

实现 `IngestCommand → IngestOutcome`，支持仓库详情、语言、README 摘要、ETag、304、限流退避和旧数据保护。

完成判据：5 个仓库可重复抓取；第二次可利用条件请求；失败不删除旧快照。

### B：策展与评分

基于 snapshot 为 5 个项目生成 pending editorial profile，校准七维评分，并记录证据路径。

完成判据：5 份内容通过 Schema；总分一致；没有无依据的技术栈断言。

### C：Web 纵向页面

使用 fixture 完成首页项目卡、发现页筛选和项目详情页；不得在浏览器端调用 GitHub API。

完成判据：合成 fixture 可完整展示；搜索和筛选有空状态；移动端可用。

### D：验证基线

建立数据、服务和页面测试以及 CI 骨架；非法数据必须阻断构建。

完成判据：覆盖 repositoryId 不一致、分数错误、未审核发布、缺失来源四类失败样例。

## 汇合点

主 Agent 按以下顺序集成：

1. 抓取器产出合法 snapshot。
2. 策展器产出合法 editorial profile。
3. 主 Agent 批准 publication record。
4. Web 只消费合法 published bundle。
5. QA 对整条链路执行回归。

## 阶段 1 结束条件

```text
GitHub URL → 快照 → 评分 → 学习卡 → 审核 → 页面展示
```

5 个样板全部跑通且测试为绿，才进入 30 项目扩展。
