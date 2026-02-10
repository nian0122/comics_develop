# AGENTS.md - Comic Reader Development Guide

## 语言设置 (Language Settings)
**请始终使用中文与用户对话**，包括所有回复、错误信息、代码注释和提交信息。

## Project Overview
Spring Boot 4.0.2 + Java 21 后端，vanilla JavaScript + Tailwind CSS 前端，Redis 缓存的漫画阅读器。

## Build & Test Commands

### Backend (从 backend/comic/ 目录运行)
```bash
# 编译
./mvnw clean compile

# 打包
./mvnw clean package

# 跳过测试打包
./mvnw clean package -DskipTests

# 运行应用
./mvnw spring-boot:run

# 运行所有测试
./mvnw test

# 运行单个测试类
./mvnw test -Dtest=ComicApplicationTests

# 运行特定测试方法
./mvnw test -Dtest=ComicApplicationTests#contextLoads

# 生成覆盖率报告
./mvnw test jacoco:report

# 集成测试
./mvnw verify
```

### Frontend Lint (JavaScript)
```bash
# 安装依赖 (如果需要)
npm install

# 运行 ESLint 检查代码
npx eslint frontend/index.html

# 或检查整个 frontend 目录
npx eslint frontend/

# 自动修复格式问题
npx eslint frontend/ --fix
```

### Docker
```bash
# 启动所有服务
docker compose up --build

# 后台运行
docker compose up --build -d

# 查看日志
docker compose logs -f [service-name]

# 停止服务
docker compose down
```

### Frontend
```bash
cd frontend && python -m http.server 8080
# 或
cd frontend && npx serve .
```

## Code Style Guidelines

### Java 后端规范
- **包结构**: `com.nianer.comic.*` (Controller/, Config/, Component/)
- **命名**: 类 PascalCase，方法和变量 camelCase，常量 UPPER_SNAKE_CASE
- **注解**: 使用 Lombok (`@Slf4j`, `@Data`, `@Builder`)
- **API**: 完整的 Swagger/OpenAPI 注解，中文描述 (必须包含 `@Operation`, `@Parameter`, `@ApiResponse`)
- **导入顺序**: java.* → jakarta.* → org.* → com.* → static imports (分组间空行分隔)
- **错误处理**: 文件存在性验证，适当 HTTP 状态码，结构化日志
  - 禁止: `catch (Exception e) {}` (必须记录或抛出具体异常)
  - 推荐: 自定义业务异常 + 全局异常处理器
- **缓存**: Redis 为主，文件系统降级
- **文件操作**: 必须使用 NIO `Path`/`Files` API，禁止 `File` 类
- **日志**: 使用 `@Slf4j`，日志消息使用 `{}` 占位符，禁止字符串拼接
- **REST**: 返回 `ResponseEntity<T>` 或具体类型，统一错误响应结构

### JavaScript 前端规范
- **语法**: ES6+ (async/await, 箭头函数，解构)
  - 禁止: `var`，使用 `const` 或 `let`
  - 推荐: 优先使用 `const`，仅在需要重新赋值时用 `let`
- **模块化**: 功能分离，一致的 try-catch 错误处理
  - 全局错误监听: `window.onerror` 和 `Promise.reject` 处理
- **样式**: Tailwind 为主，自定义 CSS 仅用于动画和复杂视觉效果
  - CSS 类名使用 kebab-case
  - 避免内联样式 (除动态计算值外)
- **性能**: 图片懒加载，虚拟滚动，本地存储进度
  - 大列表使用 Intersection Observer
  - 图片使用 `<picture>` 或 `srcset` (如适用)
- **命名**: 变量和函数 camelCase，常量 UPPER_SNAKE_CASE，CSS 类 kebab-case
  - DOM 元素变量名以 `El` 或 `Element` 后缀 (例如: `readerEl`, `chapterElement`)
  - 事件处理函数以 `on` 前缀 (例如: `onClick`, `onScroll`)
- **注释**: 复杂逻辑必须注释，API 调用说明参数用途
  - JSDoc for public functions
  - 单行注释 `//` (空格后内容)，多行注释 `/** */`

### CSS 规范
- **变量**: 使用 CSS 自定义属性 (`:root`) 定义颜色、字体、间距
- **单位**: 字体 `rem`，布局 `flex/grid`，动画 `ms/s`
- **选择器**: 避免嵌套过深 (不超过 3 层)，使用 BEM 命名约定 (可选)
- **响应式**: 移动优先，使用 Tailwind 响应式前缀 (`sm:`, `md:`, `lg:`)

### 配置管理
- **环境变量**: REDIS_HOST, REDIS_PORT, COMICS_ROOT, CACHE_EXPIRATION
- **Spring Boot**: @ConfigurationProperties 类型安全绑定
- **默认值**: 支持容器化部署

## 开发工作流

### 本地开发
1. Redis: `docker run -p 6379:6379 redis:7-alpine`
2. 后端: `cd backend/comic && ./mvnw spring-boot:run`
3. 前端: `cd frontend && python -m http.server 8080`

### Docker 开发
1. `docker compose up --build`
2. 访问: http://localhost:5000

### API 测试
- Swagger UI: http://localhost:500/swagger-ui.html
- 接口前缀: `/api/`
- 图片服务: `/api/image/` (动态)，HQ静态图片: `/hq_image/`，视频: `/video/`

## 架构模式

### 缓存策略
- Redis 缓存 + 文件系统降级
- 缓存键: `series_list`, `chapters_list:{series}`, `chapter_files:{series}:{chapter}`

### 文件组织
- HQ 图片: `COMICS_ROOT/HQ_SUB_DIR/{series}/{chapter}/{files}`
- LQ WebP: `COMICS_ROOT/LQ_SUB_DIR/{series}/{chapter}/{files}.webp`

### API 设计
- RESTful 接口 + OpenAPI 文档
- 自然排序文件目录列表
- 递归章节发现 + 媒体文件检测

## 测试要求
新功能必须包含:
1. Controller 方法单元测试
2. Redis 缓存行为测试
3. 文件系统降级测试
4. Swagger 文档更新
5. Docker 容器化测试

## 安全考虑
- Spring AntPathMatcher 路径遍历保护
- 输入验证
- 限制在配置的漫画目录内访问
- 日志中不含敏感数据

## 常见任务

### 添加新媒体支持
1. 更新 ComicController 中的 SUPPORTED_EXT
2. 修改 serveImage() 内容类型检测
3. 前端适配新媒体类型

### 修改缓存行为
1. 更新缓存键模式
2. 调整 ComicConfig.getCacheExpiration()
3. 测试 Redis vs 文件系统降级

## Nginx 静态文件服务

### 路径映射规则
- **HQ 图片**: `/hq_image/{series}/{path}/{filename}` → `/comics/h_photograph/{series}/{path}/{filename}`
- **视频文件**: `/video/{series}/{path}/{filename}` → `/comics/h_photograph/{series}/{path}/{filename}`

### Nginx 配置要点
```nginx
# HQ 图片静态服务 - 使用 alias 指令
location /hq_image/ {
    alias /comics/h_photograph/;
    try_files $uri =404;
}

# 视频静态服务 - 使用 alias 指令
location /video/ {
    alias /comics/h_photograph/;
    try_files $uri =404;
}
```

### 常见问题解决
1. **404 错误**: 检查 nginx 配置是否使用 `alias` 而不是 `rewrite + root`
2. **路径编码**: 前端使用 `encodeURIComponent()` 处理中文路径
3. **容器重启**: 修改 nginx.conf 后需要 `docker compose restart nginx`

### 前端 HQ 图片加载逻辑
- 用户双击图片触发 HQ 加载
- `getHQImageUrl()` 函数将 `/api/image/` 转换为 `/hq_image/` 路径
- 支持 URL 编码的中文字符路径

项目采用现代 Java 实践，完整 Docker 支持，Spring Boot 后端与原生 JavaScript 前端清晰分离。