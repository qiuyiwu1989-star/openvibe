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

默认抓取通过 GitHub REST 获取仓库、语言和 README；批量初始化可使用 `--raw-readme`，README 只允许来自受信任的 GitHub Raw HTTPS 地址，限制为 2 MiB，并按 Git blob 算法记录 SHA。GitHub 无法识别多许可证仓库时，抓取器可从根目录 `LICENSE`、`LICENSE.md` 或 `LICENSE.txt` 识别常见 SPDX 许可证；无法可靠识别时仍保持 `null`，由准入门拒绝或人工复核。

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

## 学习进度模型

### BeginnerMission 1.1.0 与 K12LearningDesign

普通新手任务继续兼容 `1.0.0`；包含分龄学习设计的试点使用 `1.1.0`，并必须提供 `k12` 对象：

- `primaryAgeBand` 与 `ageBands`：小学低段、小学高段、初中、高中的推荐关系；主要年龄段必须包含在推荐范围中。
- `subjectLinks` 与 `learningContext`：学科连接，以及家庭、课堂或社团使用场景。
- `adultSupport` 与 `safetyNotes`：成人介入程度、具体角色和未成年人安全提示；小学低段不能标记为完全无需支持。
- `creatorLoop`：问题、知识、工具、作品、反馈、身份六个环节，不能只记录技术操作。
- `aiBoundary`：学习者亲自决定、AI 可以帮助、完成前必须验证三条边界。

年龄标签只存在于任务内容中。`MakerProgressRecord` 不保存生日、年龄、学校、班级或监护关系，因此选择分龄入口不会形成儿童画像。

### LearningPath 1.0.0

`LearningPath` 把同一主要年龄段的 5 个任务组织为一条四周学习路线：

- `missionSlugs`：恰好 5 个互不重复的任务引用；数据完整性测试要求任务存在且主要年龄段与路线一致。
- `weeks`：恰好 4 周并按 1–4 排序；每周包含焦点、行动、学习证据和引导者动作。
- `guide`：教师/家长的准备、追问、观察、反馈协议、隐私提示和最终展示方式。
- `successCriteria`：以作品真实性、判断证据和反思为标准，不使用积分和同伴排名。

路线只是一组静态学习建议，不是五项任务清单。当前 `MakerProgressRecord` 仍按单个作品任务记录，本地不会保存年龄入口、路线完成度或学习者画像。

### MakerProgressRecord

记录一个新手任务在当前设备上的制作状态。它不是打卡分数，而是最小作者记录：

- `completedStepIndexes`：已完成的三段路径索引。
- `authorName`：作品署名。
- `makerDecision`：学习者亲自做出的关键决定，不能只描述 AI 做了什么。
- `reflection`：下一次想继续修改的地方。
- `workUrl`：可选的 HTTP/HTTPS 作品地址。
- `startedAt`、`updatedAt`、`completedAt`：制作时间线。

只有三步全部完成、作者署名非空、作者决定不少于 10 个字符时，状态才允许为 `completed`。完成后若撤销步骤或清空必要作者信息，客户端会将记录退回 `in_progress`。

### MakerProgressCollection

当前浏览器中的进度集合，每个任务只允许一份记录，最多 100 份。现阶段保存在 `openvibe:maker-progress:v1`，页面可导出完整 JSON。未来接入账号与数据库时，以这个已版本化 Schema 作为迁移输入，不直接读取任意浏览器对象。

### PilotSessionRecord 与 PilotSessionCollection

`PilotSessionRecord` 记录一次家庭、课堂或社团活动的匿名整场汇总，不记录单个儿童：

- `pathSlug`、`missionSlug`、`sessionDate`、`context`：所使用的路线、作品、日期和活动场景。
- `participantCount`、`firstVisibleCount`、`completedCount`、`authorEvidenceCount`：整场人数统计，后三项都不能超过参与人数。
- `blockers` 与 `interventions`：最多 4 个主要卡点和 4 个成人介入动作，不写个体归因。
- `evidence`：分别观察意图所有权、亲身投入、第一人称意义和署名担责，只有“未观察到、正在形成、有清楚证据”三级，不形成个人分数。
- `workedWell` 与 `changeNext`：各 10–300 字的活动反思；Schema 拒绝网址、邮箱和手机号，界面持续提示不得填写其他可识别信息。
- `privacyConfirmed`：保存前必须显式确认不含姓名、学校、联系方式、私密作品链接或其他未成年人身份信息。

集合最多保存 100 场，每条 UUID 唯一，存储键为 `openvibe:pilot-sessions:v1`。页面支持修改、确认后删除和主动导出 JSON，不会自动上传到服务器。

## 持续更新模型

### UpdateQueue

每周扫描已发布仓库后产生的待审队列。自动流程只能生成 `review` 状态，候选快照与已发布快照物理隔离。

变更类型包括仓库改名、默认分支、介绍、许可证、README、技术栈、活跃度、GitHub 指标、可用性与长期停更风险。

- 许可证和可用性变化为高风险。
- README、技术栈、改名、默认分支和长期停更为中风险。
- 指标、介绍和活跃时间变化为低风险。

### UpdateDecision

人工或已授权 Agent 对单个更新做出的批准或拒绝记录。高风险更新需要额外的显式参数，不能由普通批准路径误触发。

### UpdateHistory

只包含已审核并应用的公开更新。站点的更新日志与 RSS 共享这一数据源，待审队列和失败信息不会被公开。

## 版本规则

- 三层对象各自带 `schemaVersion`。
- 破坏性字段变化提升主版本，并提供迁移脚本。
- 新增可选字段提升次版本。
- Agent 不得在未修改 Schema 和 fixture 的情况下私自增加字段。
