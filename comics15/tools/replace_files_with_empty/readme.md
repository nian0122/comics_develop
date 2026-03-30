# clean_files - 文件清空工具

将指定目录下的文件截断为 0 字节（删除内容但保留文件）。

## 功能

- 递归扫描目标目录
- 按扩展名过滤文件
- 并发处理，高性能
- 支持干跑模式（预览）
- 支持最小文件大小过滤
- 支持排除特定目录

## 编译

```bash
go build -o clean_files.exe .
```

## 使用

```bash
# 基本用法
clean_files.exe -dir "F:\games\comics\h_photograph\series"

# 指定扩展名
clean_files.exe -dir "F:\games\comics" -ext ".jpg,.png,.webp"

# 调整并发数
clean_files.exe -dir "F:\games\comics" -workers 16

# 干跑模式（只预览不执行）
clean_files.exe -dir "F:\games\comics" -dry-run

# 只处理大于 1KB 的文件
clean_files.exe -dir "F:\games\comics" -min-size 1024

# 排除特定目录
clean_files.exe -dir "F:\games\comics" -exclude "backup,tmp"

# 安静模式（只输出结果）
clean_files.exe -dir "F:\games\comics" -quiet
```

## 参数

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `-dir` | 是 | - | 目标目录路径 |
| `-ext` | 否 | `.jpg,.jpeg,.png,.gif,.bmp,.webp` | 文件扩展名，逗号分隔 |
| `-workers` | 否 | 8 | 并发数 |
| `-dry-run` | 否 | false | 干跑模式，只显示不执行 |
| `-min-size` | 否 | 0 | 最小文件大小(字节) |
| `-exclude` | 否 | - | 排除的目录名，逗号分隔 |
| `-quiet` | 否 | false | 安静模式，只输出结果 |

## 输出示例

```
--------------------------------------------------
--- 文件清空工具 ---
目标目录: F:\games\comics\series
文件类型: .jpg,.jpeg,.png,.gif,.bmp,.webp
并发数:   8
--------------------------------------------------
--------------------------------------------------
--- 任务完成 ---
总耗时:   2.35 秒
扫描文件: 1234
处理成功: 1200
跳过文件: 30
失败数量: 4
平均速度: 510 文件/秒
--------------------------------------------------
```

## 注意事项

- 文件大小为 0 的文件会被自动跳过
- 使用 `-dry-run` 可以先预览将要处理的文件
- 排除目录时不区分大小写