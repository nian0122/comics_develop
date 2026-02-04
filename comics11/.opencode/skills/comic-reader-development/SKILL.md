# Comic Reader Development Toolkit

专为漫画阅读器项目开发的综合工具包，支持 Spring Boot 后端和原生 JavaScript 前端的完整开发工作流。

## 功能特性

### 后端开发支持
- **Spring Boot 4.0.2 + Java 21**: 现代化后端架构支持
- **Redis 缓存管理**: 智能缓存策略和降级机制
- **REST API 开发**: OpenAPI/Swagger 文档自动生成
- **文件系统处理**: 安全的漫画目录扫描和媒体文件服务
- **自然排序**: 章节和文件名智能排序
- **配置管理**: 环境变量和类型安全配置绑定

### 前端开发支持
- **原生 JavaScript**: ES6+ 现代 JavaScript 开发
- **Tailwind CSS**: 实用优先的 CSS 框架
- **响应式设计**: 移动端优化的阅读体验
- **懒加载**: 图片和视频的智能加载策略
- **虚拟滚动**: 大量文件的性能优化
- **本地存储**: 阅读进度持久化

### API 接口
- `/api/series` - 获取漫画系列列表
- `/api/chapters/{series}` - 获取章节目录
- `/api/chapter/{series}` - 获取章节文件列表
- `/api/image/{series}/{filename}` - 智能图片服务（LQ/HQ切换）

## 使用方法

### 初始化项目结构
```bash
# 检查项目结构
validate-project-structure

# 安装依赖
install-dependencies

# 配置开发环境
setup-development-environment
```

### 后端开发
```bash
# 编译和运行后端
compile-backend
run-backend

# 运行测试
run-tests

# 生成 API 文档
generate-api-docs

# Redis 缓存调试
debug-redis-cache
```

### 前端开发
```bash
# 启动前端开发服务器
start-frontend-dev

# 构建前端生产版本
build-frontend

# 前端性能优化
optimize-frontend-performance

# 检查响应式设计
test-responsive-design
```

### Docker 部署
```bash
# 构建和启动所有服务
docker-deploy

# 查看服务状态
docker-status

# 重启特定服务
restart-service [service-name]

# 查看日志
view-logs [service-name]
```

## 开发最佳实践

### 代码规范
- **Java**: Lombok 注解，中文 Swagger 描述，包结构 `com.nianer.comic.*`
- **JavaScript**: ES6+ 语法，模块化架构，一致的错误处理
- **CSS**: Tailwind 为主，自定义 CSS 仅用于动画

### 缓存策略
- Redis 为主缓存，文件系统为降级备选
- 缓存键模式: `series_list`, `chapters_list:{series}`, `chapter_files:{series}:{chapter}`
- 支持缓存过期时间配置

### 文件组织
- HQ 原图: `COMICS_ROOT/HQ/{series}/{chapter}/files`
- LQ WebP: `COMICS_ROOT/LQ/{series}/{chapter}/files.webp`
- 支持的媒体格式: `.jpg`, `.jpeg`, `.png`, `.webp`, `.mp4`, `.mov`

### 性能优化
- 图片懒加载和预加载策略
- 虚拟滚动处理大量文件
- 自然排序提升用户体验
- 响应式设计适配各种设备

## 测试支持
- 单元测试和集成测试
- Redis 缓存行为测试
- 文件系统降级测试
- API 接口测试
- 前端功能测试

## 常见任务
- 添加新媒体格式支持
- 修改缓存行为
- 优化前端性能
- 调整 API 接口
- 部署配置更新

## 安全考虑
- 路径遍历攻击防护
- 输入验证和清理
- 文件访问权限控制
- 敏感信息保护

这个技能为漫画阅读器项目提供了从开发到部署的完整工具链支持。