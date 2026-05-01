# 前后端启动指南

本文档说明如何在本机启动漫画阅读器的后端和前端开发服务。以下命令默认在项目根目录 `D:/projects/comics_develop/comics15` 下执行。

## 端口说明

| 服务 | 默认端口 | 访问地址 |
|------|----------|----------|
| 后端 Spring Boot | 500 | http://localhost:500 |
| Swagger UI | 500 | http://localhost:500/swagger-ui.html |
| 前端 Vite Dev Server | 3000 | http://localhost:3000 |
| Redis | 6379 | 本地缓存服务 |
| Docker Nginx 前端 | 5000 | http://localhost:5000 |

## 方式一：本地开发启动（推荐）

### 1. 启动 Redis

后端会优先使用 Redis 缓存。Redis 不可用时项目会降级到文件系统扫描，但开发时建议启动 Redis。

```bash
docker run --name comic15-redis -p 6379:6379 -d redis:7-alpine
```

如果容器已经存在但停止了：

```bash
docker start comic15-redis
```

### 2. 启动后端

Windows PowerShell：

```powershell
cd D:/projects/comics_develop/comics15/backend
.\mvnw.cmd spring-boot:run
```

Git Bash / Linux / macOS：

```bash
cd backend
./mvnw spring-boot:run
```

后端默认读取漫画目录：

```text
F:/games/comics
```

如需临时指定漫画目录：

Windows PowerShell：

```powershell
$env:COMICS_ROOT_DIR='F:/games/comics'
.\mvnw.cmd spring-boot:run
```

Git Bash / Linux / macOS：

```bash
COMICS_ROOT_DIR="/path/to/comics" ./mvnw spring-boot:run
```

启动成功后可检查：

```text
http://localhost:500/swagger-ui.html
http://localhost:500/api/series
```

### 3. 启动前端

新开一个终端：

```bash
cd frontend
npm install
npm run dev
```

访问：

```text
http://localhost:3000
```

前端开发服务器已在 `vite.config.js` 中处理本地开发代理：

- `/api` → `http://localhost:500`，由 Spring Boot 提供目录和文件名接口。
- `/hq_image` → 本地 `COMICS_ROOT_DIR/HQ_SUB_DIR`，默认 `F:/games/comics/h_photograph`。
- `/lq_image` → 本地 `COMICS_ROOT_DIR/LQ_SUB_DIR`，默认 `F:/games/comics/l_photograph`。
- `/video` → 本地 `COMICS_ROOT_DIR/HQ_SUB_DIR`，默认 `F:/games/comics/h_photograph`。

注意：本地开发不经过 Nginx，后端也不提供静态图片服务。图片由 Vite middleware 从本地漫画目录直接读取，不使用 `file://` proxy。

如果漫画目录不是默认路径，启动前端前设置环境变量：

Windows PowerShell：

```powershell
$env:COMICS_ROOT_DIR='F:/games/comics'
npm run dev
```

Git Bash / Linux / macOS：

```bash
COMICS_ROOT_DIR="/path/to/comics" npm run dev
```

因此本地开发时浏览器访问前端端口 `3000` 即可。

## 方式二：Docker Compose 一键启动

如果希望用容器启动前端 Nginx、后端和 Redis：

```bash
docker compose up --build
```

访问：

```text
http://localhost:5000
```

Docker Compose 当前会把宿主机目录挂载到容器：

```yaml
F:/games/comics:/comics:ro
```

如果你的漫画目录不同，请先修改 `docker-compose.yml` 中的挂载路径。

## 常用开发命令

### 前端

```bash
cd frontend
npm run dev      # 启动开发服务
npm test         # 运行测试
npm run lint     # ESLint 检查
npm run build    # 生产构建
```

### 后端

```bash
cd backend
./mvnw spring-boot:run           # 启动后端
./mvnw test                      # 运行测试
./mvnw clean package -DskipTests # 打包
```

Windows PowerShell 下使用 `mvnw.cmd`：

```powershell
.\mvnw.cmd spring-boot:run
.\mvnw.cmd test
```

## 停止服务

### 本地开发

- 前端、后端终端中按 `Ctrl + C`。
- Redis 容器停止：

```bash
docker stop comic15-redis
```

### Docker Compose

```bash
docker compose down
```

## 常见问题

### 1. 前端能打开，但系列列表加载失败

检查后端是否启动：

```text
http://localhost:500/api/series
```

如果后端没启动，先启动 `backend`。如果后端已启动但仍失败，检查 Vite 代理配置和浏览器控制台错误。

### 2. 后端启动成功，但没有漫画数据

检查漫画目录结构是否符合项目约定：

```text
COMICS_ROOT/
├── h_photograph/{series}/{chapter}/
└── l_photograph/{series}/{chapter}/
```

默认 `COMICS_ROOT_DIR` 是：

```text
F:/games/comics
```

### 3. Redis 连接失败

确认 Redis 是否在 `6379` 端口运行：

```bash
docker ps
```

Redis 不可用时后端会降级文件扫描，但首次加载可能更慢。

### 4. 端口被占用

- 后端默认端口：`500`
- 前端默认端口：`3000`
- Docker Nginx 默认端口：`5000`

先停止占用端口的进程，或调整对应配置。
