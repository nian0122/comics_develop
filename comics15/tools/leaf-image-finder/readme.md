# leaf-image-finder

查找目标路径下所有叶目录（最底层目录）的第一张图片。

## 功能

- 递归遍历目标目录
- 识别所有叶目录（没有子目录的目录）
- 在每个叶目录中找到第一张图片（按自然排序）
- 支持文本或 JSON 格式输出

## 编译

```bash
go build -o leaf-image-finder.exe
```

## 使用

```bash
# 基本用法
leaf-image-finder.exe -dir "F:\games\comics\h_photograph"

# 指定扩展名
leaf-image-finder.exe -dir "F:\games\comics" -ext ".jpg,.png,.webp"

# JSON 格式输出
leaf-image-finder.exe -dir "F:\games\comics" -json
```

## 参数说明

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `-dir` | 是 | - | 目标根目录路径 |
| `-ext` | 否 | `.jpg,.jpeg,.png,.webp,.gif,.bmp` | 支持的图片扩展名 |
| `-json` | 否 | false | 输出 JSON 格式 |

## 输出格式

### 文本格式（默认）

```
相对路径/叶目录|相对路径/图片文件
```

示例：
```
series1/chapter1|series1/chapter1/001.jpg
series1/chapter2|series1/chapter2/cover.png
```

### JSON 格式（-json）

```json
[
  {
    "leafDir": "series1/chapter1",
    "imagePath": "series1/chapter1/001.jpg",
    "imageName": "001.jpg"
  }
]
```

## 自然排序

图片文件按自然排序（natural sort）排列，例如：
- `image1.jpg, image2.jpg, image10.jpg` （正确顺序）
- 而非 `image1.jpg, image10.jpg, image2.jpg` （字典序）