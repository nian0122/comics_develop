# Docker Deployment Manager

专为漫画阅读器项目设计的 Docker 容器化部署管理工具，支持多服务编排和运维监控。

## 服务架构

### 核心服务组件
- **nginx**: 反向代理和静态文件服务 (端口 5000)
- **web**: Spring Boot 后端应用 (端口 500)
- **redis**: 缓存服务 (端口 6379)

### 数据卷管理
- **redis_data**: Redis 持久化数据
- **nginx_cache**: Nginx 缓存
- **comic_mount**: 漫画文件目录挂载 (E:/comics → /comics)

## 快速部署

### 一键启动
```bash
# 构建并启动所有服务
docker-compose up --build

# 后台运行
docker-compose up --build -d
```

### 服务管理
```bash
# 查看服务状态
docker-compose ps

# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f nginx
docker-compose logs -f web
docker-compose logs -f redis

# 重启服务
docker-compose restart [service-name]

# 停止所有服务
docker-compose down
```

## 配置管理

### 环境变量配置
```yaml
# web 服务环境变量
environment:
  - REDIS_HOST=redis
  - COMICS_ROOT_DIR=/comics
  - REDIS_PORT=6379
  - CACHE_EXPIRATION=3600
```

### 端口映射
- **5000**: nginx (前端访问)
- **6379**: redis (开发调试)
- **500**: web (内部服务，不对外开放)

### 卷挂载策略
```yaml
volumes:
  # 漫画文件目录 (只读挂载确保安全)
  - E:\comics:/comics:ro
  
  # nginx 配置和前端静态文件
  - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
  - ./frontend:/usr/share/nginx/html:ro
```

## 运维监控

### 健康检查
```bash
# 检查服务健康状态
check-service-health

# 检查特定端点
check-api-endpoint "/api/series"
check-frontend-accessibility
```

### 性能监控
```bash
# 查看资源使用情况
docker-stats

# 查看容器资源限制
inspect-resource-limits

# 监控缓存使用情况
monitor-redis-usage
```

### 日志管理
```bash
# 实时日志监控
stream-logs [service-name]

# 日志轮转配置
setup-log-rotation

# 错误日志提取
extract-error-logs
```

## 故障排查

### 常见问题诊断
```bash
# 服务启动失败排查
diagnose-startup-issues

# 网络连接测试
test-network-connectivity

# 文件挂载验证
verify-volume-mounts

# 缓存连接测试
test-redis-connection
```

### 性能调优
```bash
# 优化容器资源
optimize-docker-resources

# 调整 nginx 缓存策略
tune-nginx-caching

# Redis 性能优化
optimize-redis-performance
```

## 安全配置

### 安全加固
```bash
# 应用安全配置
apply-security-hardening

# 检查漏洞
security-scan

# 访问控制配置
configure-access-control
```

### 网络安全
```bash
# 防火墙配置
setup-firewall-rules

# SSL/TLS 配置
configure-ssl

# 访问日志审计
audit-access-logs
```

## 备份和恢复

### 数据备份
```bash
# Redis 数据备份
backup-redis-data

# 配置文件备份
backup-configurations

# 完整系统备份
create-system-backup
```

### 恢复操作
```bash
# Redis 数据恢复
restore-redis-data

# 服务配置恢复
restore-configurations

# 完整系统恢复
restore-system
```

## 更新和维护

### 服务更新
```bash
# 拉取最新镜像
pull-latest-images

# 重建服务
rebuild-services

# 滚动更新
rolling-update
```

### 维护任务
```bash
# 清理未使用资源
cleanup-docker-resources

# 系统维护
perform-maintenance

# 性能基准测试
benchmark-performance
```

## 开发环境

### 开发模式启动
```bash
# 启动开发环境
start-dev-environment

# 热重载配置
enable-hot-reload

# 调试模式
enable-debug-mode
```

### 测试部署
```bash
# 部署测试环境
deploy-test-environment

# 运行集成测试
run-integration-tests

# 清理测试环境
cleanup-test-environment
```

这个 Docker 部署技能为漫画阅读器提供了完整的容器化部署解决方案，支持从开发到生产的全生命周期管理。