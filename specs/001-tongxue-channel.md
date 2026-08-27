# OpenVibe 同学频道规格

状态：已批准  
批准日期：2026-08-27  
目标地址：`https://tongxue.yongle.school/openvibe`

## 意图

把 OpenVibe 作为“同学”的一个全年龄 Vibe Coding 学习频道，让学习者可以从案例发现进入创作，同时保留 OpenVibe 已验证的采集、审核、更新与回滚能力。

## 用户故事

- 作为刚接触 Vibe Coding 的学习者，我能从同学首页进入 OpenVibe，并先完成一个低门槛作品。
- 作为已经有经验的学习者，我能浏览已审核的开源案例和持续更新记录。
- 作为学习者，我能从 OpenVibe 返回同学，或直接进入同学创作中心继续做作品。
- 作为运营者，我能单独发布或回滚 OpenVibe，而不影响同学主站。

## 已批准方案

1. 同域路由：OpenVibe 固定使用 Next.js `basePath=/openvibe`。
2. 同学 Nginx 将 `/openvibe` 与 `/openvibe/` 子树原样反向代理到 `127.0.0.1:3210`。
3. 两个仓库、容器、CI、内容审核与回滚继续独立。
4. OpenVibe 不接入同学账号、数据库或作品表；跨区跳转使用普通 `<a>`。
5. 原域名 `vibe.yongle.school` 作为迁移别名，发布后重定向到新频道。

## 非目标

- 不使用 iframe 嵌入。
- 不合并两个代码仓库或前端构建。
- 不开放通用“同学频道”投稿、上传或数据库模型。
- 不迁移用户身份；OpenVibe 当前本机作品数据仍保存在浏览器。
- 本规格不授权修改生产服务器。

## 验收标准

- 本地生产构建能从 `/openvibe` 及全部代表性子路由访问。
- RSS 中的绝对链接包含 `/openvibe`。
- OpenVibe 顶栏可返回同学，页脚可进入同学创作中心。
- 同学桌面、移动导航、首页与页脚均有 OpenVibe 入口。
- Nginx 示例保留 URI，不剥离 `/openvibe` 前缀。
- OpenVibe 测试、构建、容器配置校验与同学前端构建全部通过。
- 生产变更、旧域名切换和公网验证必须另行批准。

## 发布顺序

1. 合并并发布支持 `/openvibe` 的 OpenVibe 容器。
2. 在服务器本机验证 `http://127.0.0.1:3210/openvibe/api/health`。
3. 更新同学 HTTPS Nginx server 块并 `nginx -t`。
4. 先验证新频道，再启用同学入口。
5. 最后把旧域名改为 308 迁移别名；失败时恢复旧 Nginx 配置和上一 OpenVibe 镜像。
