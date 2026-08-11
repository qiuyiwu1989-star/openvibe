# 持续更新运维手册

## 每周自动流程

`.github/workflows/discover.yml` 每周一运行两个彼此独立的只读任务：

1. 搜索新候选，生成 `discovery-review-queue` artifact。
2. 对已发布的仓库发起串行条件请求，生成 `catalog-update-review-queue` artifact。

工作流只有 `contents: read` 权限，不提交文件、不修改发布内容、不部署站点。

新建或升级工作流后，应由负责人手动运行一次并下载两个 artifact，确认 GitHub Token 配额、查询规则和上传步骤都正常。首次运行仍是外部写操作，必须取得明确授权；在它成功前不能把“已配置定时任务”表述成“已验证持续运行”。

## 本地扫描

```bash
GITHUB_TOKEN=... npm run updates:scan
```

默认读取 `data/snapshots`，将一次完整成功的队列原子写入 `data/updates/latest`。任一仓库失败时命令返回非零状态，保留上一版队列和全部公开快照。

## 审核单个更新

```bash
npm run updates:review -- \
  --repository-id <GitHub 数字 ID> \
  --decision approve \
  --reviewer <审核者 ID> \
  --reviewer-kind human \
  --reviewed-at <ISO 时间> \
  --notes "<核对结论>"
```

拒绝时将 `approve` 改为 `reject`。高风险更新即使使用 `approve` 也会失败；只有在独立核对后显式增加 `--allow-high-risk` 才能应用。

批准会在一组原子写入中同步：

- GitHub 事实快照。
- 站点使用的发布 bundle。
- 审核决定日志。
- 公开更新历史与 RSS 数据源。

## 订阅

`/updates/feed.xml` 是不收集个人数据的 RSS 2.0 订阅源。它只显示已审核并应用的更新，不会暴露待审队列或失败细节。
