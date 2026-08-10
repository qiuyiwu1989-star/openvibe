# MVP 完成报告

完成日期：2026-08-10。

## 结果

OpenVibe Atlas 已经从 5 个纵向样板扩展为 30 个经过审核的真实案例。每个案例都包含独立的 GitHub 事实快照、中文策展学习卡、审核记录和静态详情页。

内容覆盖：

- 30 个公开、未归档、非 fork 仓库。
- 9 类项目，超过 MVP 的 6 类目标。
- 9 种学习目标，超过 MVP 的 8 种目标。
- 2 个简单、9 个中等、19 个较难案例；默认排序会优先展示学习价值更高且较易上手的 Slidev、PocketBase、NextChat 等项目。
- 每个项目都有 30 分钟、2 小时和 1 天三段学习路径。

## 准入复核

扩容时对仓库重定向和许可证做了独立处理：

- `vercel/ai-chatbot` 已按 GitHub 当前事实绑定为 `vercel/chatbot`，稳定 repository ID 不变。
- `calcom/cal.com` 和 `plane-software/plane` 的旧定位保留拒绝审计，正式内容使用 `calcom/cal.diy` 和 `makeplane/plane`。
- NocoDB 当前使用 Sustainable Use License，未作为开源案例发布，替换为 Apache-2.0 的 Grist Core。
- AFFiNE 的生产使用范围存在混合许可证限制，未作为本批案例发布，替换为 AGPL-3.0 的 AppFlowy。
- 多许可证仓库在学习卡中单独标注商业目录或例外，避免把“源码可见”简化成无限制使用。

拒绝记录保存在 `data/editorial-drafts/*/rejections.json`，不会被物化为候选或发布 bundle。

## 自动发现

新增的发现流程从外部 JSON 读取 seeds 和 GitHub 搜索规则，串行请求后按数字 repository ID 与规范仓库名去重，再应用公开性、许可证、归档、fork、描述、热度和最近推送硬门槛。

输出队列只有：

```text
review | rejected
```

Schema 无法表达 `published`，失败或限流也不会覆盖上一版队列。定时工作流只有 `contents: read` 权限，只上传 14 天候选 artifact，不提交内容、不部署站点。

## 站点

- 首页统计和精选数量由数据驱动。
- 发现页支持关键词、难度、类型、学习目标和归一化技术栈组合筛选。
- 30 个详情页在构建期静态生成，运行时不调用 GitHub API。
- 社交分享图使用与产品一致的纸张、雷达和荧光绿视觉语言，并通过 Next 元数据文件约定接入。

## 质量门

最终验收命令：

```bash
npm test
npm run validate:snapshots
npm run validate:candidates
npm run build
git diff --check
```

覆盖范围：

- Schema：6 项。
- 自动发现：6 项。
- GitHub 抓取：11 项。
- 全量数据完整性：3 项。
- 30 份快照、30 份 pending 候选和 30 份 approved bundle。
- 36 个静态页面生成目标，其中包含 30 个项目详情页。

## 发布边界

本报告只确认本地 MVP 完成。尚未执行公网部署、远程推送或外部内容发布；这些操作仍需要单独明确授权。
