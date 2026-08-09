# 阶段 1 实施报告

完成日期：2026-08-10（Asia/Seoul）

## 结果

五个仓库已跑通完整纵向链路：

```text
GitHub → RepositorySnapshot → pending EditorialProfile
       → 主 Agent 复核 → published bundle → 静态项目页
```

已收录：

- `Nutlope/roomGPT`
- `nextjs/saas-starter`
- `browser-use/web-ui`
- `openstatusHQ/openstatus`
- `actualbudget/actual`

## 四路交付

### 抓取

- 版本化 GitHub REST API、串行请求、ETag 与 304。
- 403/429 退避、README 404 降级、重定向和原子写入。
- 失败时保留上一版快照，不执行目标仓库代码。
- 七项抓取单元测试通过。

### 策展

- 五份中文学习卡候选，均保持 `pending`。
- 包含证据、难度、风险、评分与三段学习路径。
- 主 Agent 逐份复核后生成独立的本地发布 bundle，原候选不被覆盖。

### Web

- 首页、发现页、项目详情页与筛选方法页。
- 支持关键词、难度、项目类型和学习目标筛选。
- 五个详情页静态生成，浏览器端不调用 GitHub API。

### QA 与集成

- 公共 Schema、fixture、快照、候选和发布 bundle 数据门。
- GitHub 抓取器测试与失败保护。
- GitHub Actions CI：安装、测试、构建。
- 桌面与 390px 移动端浏览器验收。

## 契约调整

抓取实现暴露出 304 结果必须携带既有仓库身份，因此 `IngestCommand` 增加可选 `knownRepositoryId`。失败结果正式纳入 HTTP 状态与退避秒数。抓取器随后删除自定义重复类型，所有结果直接通过公共 `IngestOutcomeSchema`。

## 验收结果

- TypeScript 类型检查：通过。
- Schema 防线：6/6 通过。
- 数据完整性：3/3 通过。
- 抓取器：7/7 通过。
- 五份快照与五份候选批量校验：通过。
- Next.js 生产构建：通过，五个详情页完成 SSG。
- 浏览器：5 个项目可见；关键词筛选与难度筛选正确；详情页三段路径完整；无控制台错误。
- 移动端：390px 首页和详情页无横向溢出。

## 未授权事项

- 未部署到公网。
- 未推送远程仓库。
- 未创建外部定时任务。
- 阶段 1 变更尚未提交 Git，等待明确提交授权。
