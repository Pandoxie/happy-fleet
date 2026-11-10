# Original Happy 构建与安装留档

整理日期：2026-10-24。

本文针对 **Original Happy CLI**，统一使用仓库：

<https://github.com/slopus/happy>

命令已按整理时的源码核对，未在目标机器实际执行。`main` 会变化，建议保存构建时的 commit SHA。

| 组件 | 构建入口 | 用途 |
| --- | --- | --- |
| Web | `Dockerfile.webapp` | 浏览器客户端 |
| Relay | `Dockerfile.server` | Happy 消息中转服务器 |
| happy-agent CLI | `packages/happy-agent` | 控制 Original Happy session，发送消息、读取历史 |

本文的 `happy-agent` 是上述 monorepo 内的远程控制 CLI，不是独立仓库 `slopus/happy-agent` 的新版运行时，也不需要安装 `@slopus/happy-terminal`。

## 1. 下载源码

在本地构建电脑上执行：

```bash
mkdir -p ~/src
cd ~/src

git clone https://github.com/slopus/happy.git
cd happy

# 保存源码版本，方便以后复现
git rev-parse HEAD > ../happy-build-commit.txt
```

以下两个 Docker 构建命令均在 **happy 仓库根目录**执行。依赖安装和编译在 Docker 内完成，宿主机不需要先运行 `pnpm install`。

## 2. 构建 Relay Docker 镜像

沿用当前群晖部署的目标架构 `linux/amd64`。构建电脑需要安装并启动 Docker，且支持 `docker buildx`。

```bash
docker buildx build \
  --platform linux/amd64 \
  -f Dockerfile.server \
  -t happy-relay:build1 \
  --load \
  .
```

该镜像默认暴露容器端口 `3000`。数据库、Redis、存储等继续使用已有 Compose 配置；该镜像本身不是整套服务。

来源：[Relay Dockerfile](https://github.com/slopus/happy/blob/main/Dockerfile.server)。

## 3. 构建 Web Docker 镜像

`HAPPY_SERVER_URL` 填写浏览器和 iOS 能访问的 **Relay HTTPS 地址**。当前部署沿用 `https://yuutsuki.com:3005`：

```bash
docker buildx build \
  --platform linux/amd64 \
  -f Dockerfile.webapp \
  --build-arg HAPPY_SERVER_URL="https://yuutsuki.com:3005" \
  -t happy-web:build1 \
  --load \
  .
```

- `3005` 是当前 Relay 的对外地址端口。
- Web 镜像内部通过 Nginx 监听 `80`。
- HTTPS 由已有反向代理提供，Dockerfile 本身不配置证书。
- 默认服务器地址在构建时写入前端。修改这个构建默认值需要重新构建，仅修改容器运行时环境变量不会重写前端文件。

来源：[Web Dockerfile](https://github.com/slopus/happy/blob/main/Dockerfile.webapp)。

## 4. 导出镜像并导入群晖

在构建电脑上执行：

```bash
docker image save \
  -o happy-relay-build1.tar \
  happy-relay:build1

docker image save \
  -o happy-web-build1.tar \
  happy-web:build1
```

上传两个 `.tar` 文件到群晖，在 **Container Manager → 映像 → 导入 → 从文件添加** 中导入。

也可以通过群晖 SSH 导入，路径按实际文件位置修改：

```bash
sudo docker image load -i /volume1/docker/happy/happy-relay-build1.tar
sudo docker image load -i /volume1/docker/happy/happy-web-build1.tar
```

在现有 Compose 的 Relay 服务下设置：

```yaml
image: happy-relay:build1
```

在现有 Compose 的 Web 服务下设置：

```yaml
image: happy-web:build1
```

以上仅为需要修改的字段，不是完整 Compose 文件。保留已有环境变量、数据库配置和持久化卷，然后重新创建对应容器。

## 5. 在 Ubuntu 编译 happy-agent CLI

编译目标为 `slopus/happy/packages/happy-agent`，提供 `send`、`history`、`list` 等命令。

准备 Node.js，建议使用 Node.js 22，并在 Ubuntu 获取同一份仓库：

```bash
mkdir -p ~/src
cd ~/src

git clone https://github.com/slopus/happy.git
cd happy
```

如果目录已经存在，直接进入，跳过克隆。需要与 Docker 构建使用相同源码时，可根据保存的 `happy-build-commit.txt` 检出对应 commit。

安装仓库指定的 pnpm：

```bash
corepack enable
corepack prepare pnpm@10.11.0 --activate

node --version
pnpm --version
```

安装依赖，并依次编译共享库和 CLI：

```bash
SKIP_HAPPY_WIRE_BUILD=1 pnpm install --frozen-lockfile

pnpm --filter @slopus/happy-wire build
pnpm --filter happy-agent build
```

这里先跳过安装阶段自动编译 `happy-wire`，再显式编译。`happy-agent` 依赖该共享库。

先直接验证编译结果：

```bash
node packages/happy-agent/bin/happy-agent.mjs --help
```

再按官方 README 注册全局命令：

```bash
cd packages/happy-agent
npm link

happy-agent --help
```

`npm link` 链接本地源码目录，安装后需要保留该目录及依赖。如果全局链接失败，仍可直接通过以下路径运行已构建的 CLI：

```bash
node ~/src/happy/packages/happy-agent/bin/happy-agent.mjs --help
```

README 中的 `yarn workspace happy-agent build` 是 Yarn 写法；本文按照当前仓库声明的 `pnpm@10.11.0` 使用 `pnpm --filter happy-agent build`。

此流程从源码构建，不依赖同名 npm 包的发布状态。

来源：

- [happy-agent README](https://github.com/slopus/happy/blob/main/packages/happy-agent/README.md)
- [CLI 依赖与构建配置](https://github.com/slopus/happy/blob/main/packages/happy-agent/package.json)
- [仓库包管理器配置](https://github.com/slopus/happy/blob/main/package.json)
- [安装后构建脚本](https://github.com/slopus/happy/blob/main/scripts/postinstall.cjs)

## 6. 连接自建服务器并登录

在 Ubuntu 的 `~/.bashrc` 中确认已有以下设置，没有再添加：

```bash
export HAPPY_SERVER_URL="https://yuutsuki.com:3005"
```

在 Bash 中加载配置并登录：

```bash
source ~/.bashrc

happy-agent auth login
happy-agent auth status
```

使用连接同一自建服务器的 Happy iOS 客户端扫描二维码。

常用命令：

```bash
# 查看在线机器
happy-agent machines --active

# 查看活跃 session
happy-agent list --active

# 发送任务并等待
happy-agent send <session-id> "请检查项目并运行测试" --wait

# 读取结果
happy-agent history <session-id> --limit 20
```

将 `<session-id>` 替换为 `happy-agent list` 返回的 **Happy session ID**。

`happy-agent` 按需运行，不需要 tmux 或 systemd。远程启动 session 由 Ubuntu 上现有的 Original `happy daemon` 负责。持续运行的编排脚本或需要跨 SSH 断线等待的 `--wait` 命令可以自行放进 tmux。

默认凭据位置：

| 程序 | 凭据路径 |
| --- | --- |
| Original Happy CLI / daemon | `~/.happy/access.key` |
| 本文的 happy-agent 远程控制 CLI | `~/.happy/agent.key` |

设置 `HAPPY_HOME_DIR` 时，以该目录替代默认的 `~/.happy`。

来源：[命令、认证及环境变量说明](https://github.com/slopus/happy/blob/main/packages/happy-agent/README.md)。

## 7. 后续升级

源码目录在跟踪分支上且没有本地修改时：

```bash
cd ~/src/happy
git pull --ff-only
git rev-parse HEAD > ../happy-build-commit.txt
```

如果此前检出了固定 commit，需要先明确选择要升级到的分支或 commit。

### Web / Relay

1. 重新执行 Docker 构建，将标签换成 `build2` 等新标签。
2. 使用相应的新标签执行 `docker image save`。
3. 上传并导入群晖。
4. 修改已有 Compose 的镜像标签，再重新创建对应容器。
5. 保留持久化数据；涉及服务器升级时，检查目标版本是否要求数据库迁移。

### happy-agent CLI

在仓库根目录执行：

```bash
SKIP_HAPPY_WIRE_BUILD=1 pnpm install --frozen-lockfile
pnpm --filter @slopus/happy-wire build
pnpm --filter happy-agent build

happy-agent --help
```

源码仍在原路径、全局链接仍有效时，一般无需重新 `npm link`，也无需重新登录。
