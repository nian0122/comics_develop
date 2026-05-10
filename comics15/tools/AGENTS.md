# AGENTS.md - Tools

## OVERVIEW
`tools/` 是三个独立 Go CLI 工具目录。后端 `ToolController` 暴露工具列表，`ToolExecutor` 调用对应 exe 并解析输出进度。

## STRUCTURE
```text
tools/
├── image-optimizer/             # HQ 图片转 LQ WebP；Go 1.22.1；依赖 chai2010/webp
├── leaf-image-finder/           # 查找叶目录第一张图片；Go 1.21
└── replace_files_with_empty/    # 截断文件内容但保留文件；Go 1.21；危险操作
```

## WHERE TO LOOK
| 工具 | 目录 | 可执行文件 | 后端 toolName |
|------|------|------------|---------------|
| 图片优化器 | `image-optimizer/` | `image-optimizer.exe` | `image-optimizer` |
| 叶目录图片查找 | `leaf-image-finder/` | `leaf-image-finder.exe` | `leaf-image-finder` |
| 清空文件内容 | `replace_files_with_empty/` | `clean_files.exe` | `replace_files_with_empty` |

## BUILD COMMANDS
```bash
# from tools/image-optimizer/
go build -o image-optimizer.exe .

# from tools/leaf-image-finder/
go build -o leaf-image-finder.exe

# from tools/replace_files_with_empty/
go build -o clean_files.exe .
```

## TOOL CONTRACTS
### image-optimizer
- 用途：递归扫描 HQ 图片，输出 LQ WebP。
- `-root` 或 `-scan-dir` 必须提供其一。
- 常用参数：`-hq h_photograph`, `-lq l_photograph`, `-series`, `-workers`, `-quality`, `-force`。
- 路径映射：`h_photograph/series/chapter/001.jpg` → `l_photograph/series/chapter/001.webp`。

### leaf-image-finder
- 用途：查找每个叶目录的第一张图片。
- 必填：`-dir`。
- 可选：`-ext`, `-json`。
- 输出 JSON 时字段：`leafDir`, `imagePath`, `imageName`。

### replace_files_with_empty
- 用途：递归截断匹配文件为 0 字节；危险操作。
- 必填：`-dir`。
- 强烈建议先用 `-dry-run`。
- 可选：`-ext`, `-workers`, `-min-size`, `-exclude`, `-quiet`。

## BACKEND INTEGRATION
- 工具根目录：`TOOL_ROOT_DIR`，默认 `D:/projects/comics_develop/comics15/tools`。
- 后端按 OS 选择 `.exe` 或无扩展名二进制。
- `application.yml` 中 exe 名必须和本目录构建产物一致：`clean_files.exe` 是特殊名。
- `ToolExecutor.parseProgress()` 通过中文输出关键词解析：`处理`, `跳过`, `失败数量`。
- 改工具输出格式时，同步改 `ToolExecutor` 的进度解析。
- 工具参数契约同时被 `ToolController` 元数据、前端 `tools-api`/工具页表单、各工具 `readme.md` 约束。

## TESTS
- 当前没有 Go `_test.go` 文件。
- 新增参数解析、路径过滤、破坏性操作前应补对应工具目录内测试。
- `replace_files_with_empty` 的新行为优先测试 dry-run 和排除规则。

## ANTI-PATTERNS
- 不要改 exe 文件名而不同步 `ToolExecutor.resolveToolPath()` 和 `application.yml`。
- 不要让工具默认修改全盘目录；UI/后端默认应限制在漫画根目录或用户显式路径。
- `replace_files_with_empty` 是破坏性工具：新参数默认必须安全，优先支持 dry-run。
- 不要删除各工具 `readme.md`；它是 UI/后端参数契约的来源。

## NOTES
- 每个工具是独立 Go module，有自己的 `go.mod`；不是 workspace。
- Windows 本地使用 `.exe`；容器/Linux 需要对应无扩展名二进制。
- 输出给后端读取时使用 UTF-8；避免改成非 UTF-8 编码日志。
