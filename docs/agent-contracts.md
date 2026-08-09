# 多 Agent 协作契约

## 公共规则

- 主 Agent 独占根 `package.json`、锁文件、TypeScript 配置、公共 Schema 与最终合并权。
- 子 Agent 只修改明确分配的目录；需要跨区修改时先向主 Agent 报告。
- 先通过 fixture 对齐接口，再连接真实数据。
- 不擅自加入数据库、云服务、登录系统或新的产品范围。
- 不执行被抓取仓库中的脚本、安装命令或构建命令。
- 任何密钥仅从环境变量读取，不写入文件、日志或对话。
- 本地开发授权不包含部署和对外发布。

## 目录所有权

| 角色 | 独占目录 | 禁止直接修改 |
|---|---|---|
| 主 Agent | 根配置、`packages/schema/`、`docs/` | 无 |
| Agent A：抓取 | `scripts/discover/`、`scripts/ingest/`、`data/snapshots/` | Schema、页面、发布数据 |
| Agent B：策展 | `scripts/evaluate/`、`data/candidates/` | 快照、页面、发布状态 |
| Agent C：Web | `src/app/`、`src/components/`、`src/features/` | 抓取脚本、Schema |
| Agent D：QA | `tests/`、`.github/workflows/` | 策展正文、产品范围 |

## 交付格式

每个 Agent 返回：

1. 修改文件清单。
2. 已通过的验收项和运行命令。
3. 未完成项及阻塞原因。
4. 新增依赖或公共接口变更请求。
5. 禁止把“建议以后做”悬空；标记为现在做、不做或择期候选。

## 冲突处理

- Schema 与实现冲突：实现适配 Schema；确需改契约时由主 Agent决策。
- fixture 与真实 GitHub 响应冲突：保留原始响应样本，提交契约变更提案。
- 页面需要新字段：先给出用户价值和降级方式，再请求 Schema 变更。
- 自动化发现低质量内容：进入 `rejected` 或保持 `review`，不能绕过审核门。

