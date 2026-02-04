# Redis Cache Management Toolkit

专为漫画阅读器设计的高级缓存管理系统，支持 Redis 主缓存 + 文件系统降级的双重保障策略。

## 缓存架构设计

### 双层缓存策略
- **Redis 主缓存**: 高性能内存缓存，支持 TTL
- **文件系统降级**: Redis 不可用时的本地备份
- **智能切换**: 自动检测 Redis 可用性
- **数据一致性**: 缓存失效时自动更新

### 缓存键模式
```
series_list                    # 漫画系列列表
chapters_list:{series}         # 特定系列章节列表
chapter_files:{series}:{chapter}  # 章节文件列表
```

## 缓存操作

### 基础缓存操作
```bash
# 设置缓存
set-cache "key" "value" ttl_seconds

# 获取缓存
get-cache "key"

# 删除缓存
delete-cache "key"

# 检查缓存存在性
check-cache-exists "key"
```

### 批量操作
```bash
# 批量设置
batch-set- caches

# 批量获取
batch-get caches

# 模式匹配删除
delete-by-pattern "pattern:*"

# 清空所有缓存
flush-all-cache
```

## 漫画数据缓存

### 系列列表缓存
```bash
# 更新系列列表缓存
update-series-cache

# 获取系列列表（优先从缓存）
get-series-from-cache

# 强制刷新系列缓存
refresh-series-cache

# 设置系列缓存过期时间
set-series-cache-ttl seconds
```

### 章节缓存管理
```bash
# 更新章节列表缓存
update-chapters-cache [series_name]

# 获取章节列表（优先从缓存）
get-chapters-from-cache [series_name]

# 清除特定系列缓存
clear-series-cache [series_name]

# 预热章节缓存
warmup-chapters-cache [series_name]
```

### 文件列表缓存
```bash
# 更新文件列表缓存
update-files-cache [series_name] [chapter_path]

# 获取文件列表（优先从缓存）
get-files-from-cache [series_name] [chapter_path]

# 清除特定章节缓存
clear-chapter-cache [series_name] [chapter_path]

# 预加载文件列表
preload-file-lists [series_name]
```

## 缓存监控

### 性能监控
```bash
# 监控缓存命中率
monitor-cache-hit-rate

# 查看缓存内存使用
monitor-memory-usage

# 检查缓存连接状态
check-redis-connection

# 实时性能指标
real-time-cache-metrics
```

### 缓存分析
```bash
# 分析缓存键分布
analyze-key-distribution

# 统计缓存大小
cache-size-statistics

# 查找过期键
find-expired-keys

# 缓存热点分析
cache-hotspot-analysis
```

## 缓存策略优化

### TTL 策略
```bash
# 设置默认 TTL
set-default-ttl seconds

# 动态调整 TTL
adjust-ttl-by-pattern "pattern:*" ttl_seconds

# 基于访问频率的 TTL
adaptive-ttl-strategy

# 预热时延长 TTL
extend-ttl-for-hot-keys
```

### 预热策略
```bash
# 预热所有缓存
warmup-all-cache

# 按系列预热
warmup-series-cache [series_name]

# 预热热门内容
warmup-popular-content

# 定时预热任务
schedule-warmup-task
```

## 故障处理

### Redis 故障降级
```bash
# 检测 Redis 可用性
test-redis-availability

# 启用文件系统降级
enable-fs-fallback

# 测试降级机制
test-fallback-mechanism

# 恢复 Redis 后同步
sync-after-recovery
```

### 数据恢复
```bash
# 从文件系统恢复
recover-from-filesystem

# 验证数据完整性
validate-cache-integrity

# 重建损坏缓存
rebuild-corrupted-cache

# 数据一致性检查
consistency-check
```

## 缓存清理

### 定期清理
```bash
# 清理过期缓存
cleanup-expired-cache

# 清理低频访问缓存
cleanup-low-frequency-cache

# 清理大键占用
cleanup-large-keys

# 清理模式匹配缓存
cleanup-by-pattern "pattern:*"
```

### 手动清理
```bash
# 清空特定系列缓存
clear-series-data [series_name]

# 重置所有缓存
reset-all-cache

# 清理测试缓存
clear-test-cache

# 紧急缓存清理
emergency-cache-cleanup
```

## 开发调试

### 调试工具
```bash
# 查看缓存内容
inspect-cache-key "key"

# 搜索缓存键
search-cache-keys "pattern"

# 查看缓存元数据
show-cache-metadata "key"

# 模拟缓存操作
simulate-cache-operations
```

### 测试支持
```bash
# 缓存性能测试
cache-performance-test

# 并发访问测试
concurrent-access-test

# 故障注入测试
fault-injection-test

# 降级机制测试
fallback-mechanism-test
```

## 配置管理

### Redis 配置
```bash
# 配置 Redis 连接
configure-redis-connection host port password

# 设置连接池参数
set-connection-pool-settings

# 配置超时设置
configure-timeouts

# 启用 SSL 连接
enable-ssl-connection
```

### 缓存策略配置
```bash
# 设置默认缓存策略
configure-default-strategy

# 配置特定键策略
configure-key-strategy "pattern:*" strategy

# 设置内存限制
set-memory-limit size

# 配置淘汰策略
configure-eviction-policy
```

## 监控告警

### 性能告警
```bash
# 设置命中率告警
configure-hit-rate-alert threshold

# 内存使用告警
configure-memory-alert threshold

# 响应时间告警
configure-response-time-alert threshold

# 连接数告警
configure-connection-alert threshold
```

### 健康检查
```bash
# 定期健康检查
schedule-health-check

# 自动恢复机制
enable-auto-recovery

# 状态报告生成
generate-health-report

# 问题诊断
diagnose-cache-issues
```

这个缓存管理技能为漫画阅读器提供了企业级的缓存解决方案，确保高性能和数据可靠性。