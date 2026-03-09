# Image Optimizer 工具开发指南

**位置**: `tools/image-optimizer/`  
**语言**: Go 1.x  
**用途**: 批量图片优化和格式转换工具

## 工具概述
Go 语言实现的命令行图片优化工具，用于批量处理漫画图片，生成 WebP 格式低质量预览图。

## 目录结构
```
image-optimizer/
├── go.mod                  # Go 模块定义
├── go.sum                  # 依赖校验
├── image_optimizer.go      # 核心优化逻辑
├── main.go                 # 程序入口 + CLI 参数解析
├── readme.md               # 使用说明
├── image-optimizer-go16.exe  # Go 1.16 编译版本
└── image-optimizer-go4.exe   # Go 1.4 编译版本 (历史遗留)
```

## 核心文件

### main.go
**职责**: CLI 入口 + 参数解析 + 批量处理调度

**关键功能**:
- 解析命令行参数 (输入目录、输出目录、质量参数)
- 递归遍历输入目录
- 并发处理图片文件
- 进度显示和错误报告

### image_optimizer.go
**职责**: 图片编码转换 + 质量压缩

**支持格式**:
- 输入：`.jpg`, `.jpeg`, `.png`, `.bmp`
- 输出：`.webp` (默认), `.jpg` (可选)

**优化策略**:
- WebP 有损压缩 (可配置质量 0-100)
- PNG 转 WebP 自动优化
- EXIF 元数据保留/移除选项

## 使用方法

### 基本用法
```bash
# 编译
go build -o image-optimizer.exe

# 运行
./image-optimizer-go16.exe -input <输入目录> -output <输出目录> [选项]
```

### 命令行参数
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `-input` | string | 必需 | 输入图片根目录 |
| `-output` | string | 必需 | 输出目录 |
| `-quality` | int | 80 | WebP 质量 (0-100) |
| `-concurrency` | int | 4 | 并发处理数 |
| `-preserve-exif` | bool | false | 保留 EXIF 元数据 |

### 示例
```bash
# 批量转换漫画图片为 WebP (质量 75)
./image-optimizer-go16.exe \
  -input "F:/comics/h_photograph" \
  -output "F:/comics/l_photograph" \
  -quality 75 \
  -concurrency 8

# 保留 EXIF 元数据
./image-optimizer-go16.exe \
  -input "./source" \
  -output "./optimized" \
  -preserve-exif=true
```

## 目录映射规则

### 输入 → 输出结构
```
输入目录/
└── {series}/
    └── {chapter}/
        ├── image001.jpg
        └── image002.png

输出目录/
└── {series}/
    └── {chapter}/
        ├── image001.webp
        └── image002.webp
```

### 与主项目集成
```
COMICS_ROOT/
├── h_photograph/     # HQ 原图 (JPG/PNG)
└── l_photograph/     # LQ WebP (由本工具生成)
```

## 开发规范

### Go 代码风格
- 使用 `go fmt` 格式化代码
- 遵循 Go 命名约定 (驼峰式)
- 错误处理必须检查 `if err != nil`
- 使用 `defer` 清理资源 (文件关闭等)

### 构建要求
```bash
# 本地编译 (Go 1.16+)
go build -o image-optimizer.exe

# 交叉编译 (Windows)
GOOS=windows GOARCH=amd64 go build -o image-optimizer.exe

# 静态编译 (无 CGO)
CGO_ENABLED=0 go build -o image-optimizer.exe
```

### 依赖管理
```bash
# 初始化模块
go mod init image-optimizer

# 添加依赖
go get github.com/chai2010/webp  # WebP 编码库

# 清理未使用依赖
go mod tidy
```

## 性能优化

### 并发策略
- 使用 goroutine 并发处理文件
- 通过 `-concurrency` 参数控制并发数
- 避免内存溢出 (大批量时限制并发数)

### 内存管理
- 流式处理大文件
- 及时释放图片对象
- 使用 `runtime.GC()` 强制回收 (可选)

## 测试指南

### 单元测试
```bash
# 运行测试
go test -v ./...

# 覆盖率
go test -cover ./...
```

### 集成测试
1. 准备测试图片目录
2. 运行工具处理
3. 验证输出文件存在性和质量
4. 检查目录结构一致性

## 常见问题

### 编译失败
```bash
# 检查 Go 版本
go version  # 需要 Go 1.16+

# 清理模块缓存
go clean -modcache

# 重新下载依赖
go mod download
```

### 转换质量不佳
- 调整 `-quality` 参数 (建议 70-85)
- 检查源图片质量
- 验证 WebP 编码器参数

### 内存溢出
- 降低 `-concurrency` 并发数
- 分批处理大目录
- 检查图片尺寸 (超大图片需预处理)

## 与主项目集成流程

### 1. 生成 LQ 预览图
```bash
cd tools/image-optimizer
./image-optimizer-go16.exe \
  -input "../../comics/h_photograph" \
  -output "../../comics/l_photograph" \
  -quality 75
```

### 2. 验证目录结构
```bash
# 检查 HQ/LQ 目录对应关系
ls comics/h_photograph/{series}/{chapter}/
ls comics/l_photograph/{series}/{chapter}/
```

### 3. 启动应用
```bash
# 后端会自动检测 LQ WebP 文件
# 优先返回 WebP，不存在则回退 HQ 原图
cd backend/comic && ./mvnw spring-boot:run
```

## 相关文档
- 主项目 [`../../AGENTS.md`](../../AGENTS.md)
- 使用说明 [`readme.md`](readme.md)
- 主项目 README [`../../README.md`](../../README.md)

## 已知问题
1. **历史遗留编译版本**: `image-optimizer-go4.exe` 为旧版本，建议使用 go16 版本
2. **无进度显示**: 大批量处理时缺少进度条 (可优化)
3. **错误处理粗糙**: 部分错误未详细记录 (待改进)

## 项目层级
```
./AGENTS.md (根)
└── tools/image-optimizer/AGENTS.md (本文件 - 223 行)
```
