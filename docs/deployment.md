# 生产部署

目标域名：`https://vibe.yongle.school`。

## 运行形态

- Next.js 16 standalone Node.js 服务。
- Docker 多阶段构建，最终容器以非 root 用户运行。
- 宿主机只暴露 `127.0.0.1:3210`，公网请求必须经过已有的 Nginx 或 Caddy。该端口在首次生产取证时确认未被共享服务器上的其他服务占用。
- `/api/health` 作为容器、反向代理和部署后验证的统一健康检查。

## 发布步骤

### 一次性服务器准备

1. 安装 Docker Engine、Compose 插件、Nginx、Certbot 和 curl。
2. 将新的专用部署公钥加入 `ubuntu` 的 `authorized_keys`，不要启用密码自动登录。
3. 在仓库根目录执行 `sudo bash scripts/ops/bootstrap-server.sh ubuntu /srv/openvibe`。
4. 将 `deploy/nginx/openvibe.conf` 安装到 Nginx，检查配置后再 reload。
5. 使用 Certbot 为 `vibe.yongle.school` 申请证书并启用 HTTPS。

执行前应先检查服务器已有站点与端口占用，不能直接覆盖共享配置。

### GitHub 生产环境

创建受保护的 `production` Environment，并配置：

- Secret `PRODUCTION_HOST`：服务器主机名或 IP。
- Secret `PRODUCTION_USER`：专用部署用户，当前规划为 `ubuntu`。
- Secret `PRODUCTION_SSH_KEY`：与服务器公钥对应的新私钥。
- Secret `PRODUCTION_KNOWN_HOSTS`：人工核对过的服务器 SSH 主机公钥记录。
- Variable `PRODUCTION_DEPLOY_ROOT`：默认 `/srv/openvibe`。

不要把服务器密码、GitHub 令牌、COS 密钥或数据库密码放进仓库变量。生产 Environment 建议启用人工批准。

### 每次发布

1. CI 对确定提交执行测试、构建和容器定义校验。
2. 人工触发 `Deploy production`，选择已经通过 CI 的 Git ref。
3. 工作流只打包 Git 已跟踪文件，在服务器建立独立 SHA 版本目录和镜像。
4. 新容器先通过 `127.0.0.1:3210/api/health`，再切换 `current` 版本链接。
5. GitHub 从公网检查首页、新手入口、学习路线及其详情、匿名试教工作台与执行单、发现页、作品页、更新日志与 RSS。
6. 公网出现无法连接、传输不完整或 5xx 时，只复核一次失败路由；复核仍失败才恢复上一已验证版本。

`Monitor production` 每小时两次执行同一组公网检查，并对 `/api/health` 连续采样 5 次。默认超过 3 秒记提醒，5 次中至少 3 次不可用或超过 8 秒才将延迟任务标记失败。它只报告故障，不在无人审核时修改服务器。

延迟检查独立于部署冒烟和自动回滚。部署把无法连接、传输不完整或 5xx 视为失败，但会对失败路由做一次有界复核，避免单次公网或 TLS 抖动造成不必要回滚；持续失败仍然回滚。本地可执行 `npm run ops:latency` 复核当前公网延迟。

## 回滚

生产机按 Git SHA 保留不可变版本和镜像。新容器健康检查失败时自动恢复上一版本；已经上线后也可执行 `bash /srv/openvibe/current/scripts/ops/rollback-release.sh /srv/openvibe`。健康判据统一为：`000` 或 `5xx` 视为服务故障，其他 HTTP 响应说明服务器仍可达。

## 数据与备份

当前生产站点没有服务端用户数据：项目目录和审核后的内容都在 Git，作品进度和试教汇总只在用户浏览器。服务器因此不需要伪造一套数据库备份。发布包保留为不可变版本；只有真实试教证明跨设备数据不可替代时，才设计数据库快照、恢复演练和大文件生命周期策略。

## 密钥边界

仓库和镜像不包含 GitHub 令牌、服务器密码、COS 密钥或数据库凭据。生产凭据只能放在服务器环境文件或密钥管理中。
