# image-optimizer

将 HQ 图片转换为 LQ WebP 格式。

## 功能

- 递归扫描图片目录
- 转换为 WebP 格式
- 基于时间戳增量处理
- 支持自定义目录或系列选择

## 编译

```bash
go build -o image-optimizer.exe .
```

## 使用

```bash
# 方式1: 使用 root + series
image-optimizer.exe -root "F:\games\comics" -series "MySeries"

# 方式2: 自定义扫描目录
image-optimizer.exe -scan-dir "F:\games\comics\h_photograph\MySeries\Chapter1"

# 调整参数
image-optimizer.exe -root "F:\games\comics" -workers 16 -quality 80

# 强制重新处理
image-optimizer.exe -root "F:\games\comics" -force
```

## 参数

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `-root` | 否* | - | 漫画根目录 |
| `-scan-dir` | 否* | - | 自定义扫描目录 |
| `-hq` | 否 | h_photograph | HQ 子目录名 |
| `-lq` | 否 | l_photograph | LQ 子目录名 |
| `-series` | 否 | - | 指定系列名称 |
| `-ext` | 否 | .jpg,.jpeg,.png,.gif,.bmp | 文件扩展名 |
| `-workers` | 否 | 8 | 并发数 |
| `-quality` | 否 | 15 | WebP 质量 (1-100) |
| `-force` | 否 | false | 强制重新处理 |
| `-quiet` | 否 | false | 安静模式 |

\* `-root` 或 `-scan-dir` 必须提供其中一个

## 路径对应

| 扫描目录 | 输出目录 |
|----------|----------|
| `h_photograph/series1/chapter1/` | `l_photograph/series1/chapter1/` |
| `h_photograph/series1/001.jpg` | `l_photograph/series1/001.webp` |

## 输出示例

```
--------------------------------------------------
--- 图片优化工具 ---
扫描目录: F:\games\comics\h_photograph\MySeries
输出目录: F:\games\comics\l_photograph\MySeries
并发数:   8
质量:     15
--------------------------------------------------
跳过: chapter1/001.jpg | 已存在最新版本 (150.2KB)
完成: chapter1/002.jpg | 2.5MB → 150.5KB (6.0%)
完成: chapter1/003.png | 3.2MB → 180.3KB (5.6%)
跳过: chapter2/empty.jpg | 空文件
失败: chapter2/bad.jpg → 解码图片失败: unsupported format
--------------------------------------------------
--- 任务完成 ---
总耗时:   5.23 秒
扫描文件: 100
处理成功: 95
跳过文件: 5
失败数量: 0
平均速度: 18 文件/秒
--------------------------------------------------
```