# 生产部署

目标域名：`https://vibe.yongle.school`。

## 运行形态

- Next.js 16 standalone Node.js 服务。
- Docker 多阶段构建，最终容器以非 root 用户运行。
- 宿主机只暴露 `127.0.0.1:3100`，公网请求必须经过已有的 Nginx 或 Caddy。
- `/api/health` 作为容器、反向代理和部署后验证的统一健康检查。

## 发布步骤

1. 从 GitHub 获取已通过 CI 的确定提交。
2. 运行 `docker compose -f compose.production.yml build`。
3. 容器构建成功后运行 `docker compose -f compose.production.yml up -d`。
4. 首先验证 `http://127.0.0.1:3100/api/health`，再更新反向代理。
5. 从公网验证首页、新手任务、进阶项目、更新日志和 RSS。

## 回滚

生产机保留上一个已验证的镜像标签。新容器健康检查失败时不切换反向代理；公网出现 `000` 或 `5xx` 时切回上一镜像。

## 密钥边界

仓库和镜像不包含 GitHub 令牌、服务器密码、COS 密钥或数据库凭据。生产凭据只能放在服务器环境文件或密钥管理中。
