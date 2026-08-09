# 数据契约

可执行定义位于 `packages/schema/src/schemas.ts`，本文说明语义和 Agent 之间的输入输出边界。

## 三层模型

### RepositorySnapshot

GitHub 可验证事实的时间切片。抓取器可以覆盖旧快照，但不能写入编辑判断。关键字段：

- `repositoryId`：稳定关联键。
- `fullName`：当前 `owner/name`，允许随仓库转移而变化。
- `metrics`、`languages`、`license`、`timestamps`：GitHub 事实。
- `readme.excerpt`：最多 1200 字符；不能存整篇 README。
- `source.apiVersion`、`etag`、`fetchedAt`：可追溯性与条件请求依据。

### EditorialProfile

面向中文学习者的策展判断。包括适合人群、难度、学习目标、技术栈证据、三段学习路径、风险、评分和审核信息。

事实性判断必须放入 `sources` 或具体字段的 `evidencePaths`；不能把模型猜测包装成 GitHub 事实。

### PublicationRecord

控制当前工作流状态、slug、精选标记和发布时间。允许状态：

```text
discovered → fetched → evaluated → review → published
                                      ↘ rejected
```

状态迁移由服务层实施；Schema 负责阻止无审核发布。

## 聚合模型

`RadarProjectBundle` 将三层组合供测试、构建和页面消费，并校验三个 `repositoryId` 相同。状态为 `published` 时，还要求：

- 编辑审核状态为 `approved`。
- `publishedAt`、`lastReviewedAt` 存在。
- 编辑版本号大于 0。

## 服务接口

### 抓取 Agent

输入：`IngestCommand`

```ts
{
  locator: { owner: string; name: string };
  ifNoneMatch?: string;
  knownRepositoryId?: number;
  force: boolean;
}
```

输出：`IngestOutcome`

- `changed`：返回新快照。
- `not_modified`：GitHub 返回 304，返回已知 repository ID、检查时间与 ETag，不改写文件。
- `failed`：返回 HTTP 状态、是否可重试及退避信息，不删除旧快照。

### 策展 Agent

输入：合法 `RepositorySnapshot`。

输出：审核状态为 `pending` 的 `EditorialProfile`。策展 Agent 不得创建 `published` 状态。

### Web Agent

输入：仅接受校验通过且状态为 `published` 的 bundle。开发 fixture 可例外，但必须来自 `data/fixtures/`。

### QA Agent

输入：全部候选和发布数据。

输出：Schema、交叉字段、链接、构建和页面行为的校验报告；不得静默修复策展内容。

## 版本规则

- 三层对象各自带 `schemaVersion`。
- 破坏性字段变化提升主版本，并提供迁移脚本。
- 新增可选字段提升次版本。
- Agent 不得在未修改 Schema 和 fixture 的情况下私自增加字段。
