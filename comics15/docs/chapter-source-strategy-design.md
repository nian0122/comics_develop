# 章节图片源策略设计

## 背景

当前项目有两条图片加载链路：

- 目录首图：后端在 `/api/chapters/{series}` 中返回 `cover_file` 和 `cover_source`，前端直接根据 `cover_source` 构建 LQ/HQ URL，不发 HEAD 请求。
- 阅读器图片：打开章节后 `/api/chapter/{series}` 只返回 `files`，前端每张普通图片调用 `api.resolveImageUrl()`，通过 `HEAD /lq_image/...` 判断 LQ 是否存在。

实际数据规律是：如果章节首张普通图片存在 LQ，则该章节绝大多数普通图片都有 LQ；如果首张普通图片只在 HQ，则该章节基本没有对应压缩 LQ。因此阅读器可以复用章节列表已有的 `cover_source`，避免每张图片都探测 LQ。

## 目标

- 减少阅读器普通图片加载前的逐张 HEAD 请求。
- 复用已有 `cover_source`，不新增冗余字段。
- 保持纯视频/GIF 章节现有“无预览”行为。
- 保持旧接口、旧缓存和异常数据的兼容兜底。

## 不做事项

本设计明确不引入以下内容：

- 不新增 `preferredSource`。
- 不新增 `sourceProbeFile`。
- 不新增 `media_kind`。
- 不逐文件返回 `lqExists`。
- 不为纯视频章节强行生成封面。
- 不做“扫描前 N 个视频后默认纯视频”的查找上限规则。

原因：当前后端已经会收集自然排序后的完整 `mediaFiles`。在该列表里寻找第一张普通图片简单且准确；限制查找数量收益很小，还可能误判第 N 个之后才出现图片的混合章节。

## 后端规则

后端 `/api/chapters/{series}` 继续使用现有章节元数据结构。

### 普通图片与混合章节

普通图片定义为：

```text
.jpg / .jpeg / .png / .webp
```

视频/GIF 定义为：

```text
.mp4 / .mov / .gif
```

对于包含普通图片的章节，后端从自然排序后的媒体文件中寻找第一张普通图片。视频和 GIF 会被跳过，不影响首图选择。

返回示例：

```json
{
  "path_id": "第 1 话",
  "name": "第 1 话",
  "total_files": "120",
  "cover_file": "001.jpg",
  "cover_source": "lq"
}
```

`cover_source` 计算规则：

```text
检查 l_photograph/{series}/{chapter}/001.webp 是否存在

存在  → cover_source = lq
不存在 → cover_source = hq
```

`cover_source` 同时服务两个用途：

1. 目录页首图加载。
2. 阅读器普通图片默认加载源。

### 纯视频/GIF 章节

如果章节没有普通图片，只有 `.mp4`、`.mov`、`.gif`，后端不返回 `cover_file` 和 `cover_source`。

返回示例：

```json
{
  "path_id": "PV",
  "name": "PV",
  "total_files": "2"
}
```

前端目录页继续显示“无预览”。阅读器打开后按文件类型正常加载视频/GIF。

## 前端目录首图逻辑

目录首图逻辑保持现状：

```text
cover_file + cover_source 存在
→ 根据 cover_source 构建 LQ/HQ 首图 URL

cover_file 或 cover_source 任一缺失
→ 显示“无预览”
```

纯视频/GIF 章节不增加特殊视频图标，也不生成额外封面。

## 前端阅读器逻辑

阅读器打开章节后，读取当前 `chapter.cover_source` 作为普通图片的章节级默认源。

普通图片加载规则：

```text
cover_source = lq
→ 直接 buildLQImageUrl()

cover_source = hq
→ 直接 buildHQImageUrl()

cover_source 缺失或值异常
→ 回退旧 resolveImageUrl()，逐张 HEAD 探测
```

视频/GIF 加载规则保持不变：

```text
.mp4 / .mov / .gif
→ 永远 buildVideoUrl()
→ 不读取 cover_source
→ 不参与 LQ/HQ 策略
```

因此，纯视频/GIF 章节虽然缺少 `cover_source`，但其中没有普通图片，不会触发图片源策略问题。

## LQ 单图缺失兜底

即使 `cover_source = lq`，仍可能存在极少数图片缺少 LQ。阅读器应保留现有图片错误兜底：

```text
默认加载 LQ
→ 某张 LQ onerror
→ 回退 HQ
```

这符合“首图有 LQ，则本章 99% 图片有 LQ”的数据规律，同时保证少数异常图片仍可显示。

## 双击 HQ 逻辑

双击切 HQ 逻辑保持现状：

```text
当前图片是 /lq_image/
→ 用户双击
→ checkHQImageUsable()
→ HQ 可用则切换 HQ
```

如果章节默认 `cover_source = hq`，图片已经以 HQ 加载，双击不会触发切换。

## 兼容策略

为兼容旧缓存、旧接口或异常数据，前端使用以下优先级：

目录首图：

```text
1. cover_file + cover_source 存在 → 显示首图
2. 任一缺失 → 显示“无预览”
```

阅读器普通图片：

```text
1. cover_source = lq/hq → 使用章节级策略
2. cover_source 缺失或异常 → 使用旧 resolveImageUrl() 逐张 HEAD 兜底
```

视频/GIF：

```text
始终走 /video/，不受 cover_source 影响
```

## 预期收益

- 后端基本无需新增接口字段。
- 复用已有 `cover_source` 和 `cover_file` 判断。
- 目录封面与阅读器默认图片源保持一致。
- 纯视频/GIF 章节继续保持“无预览”默认表现。
- 阅读器普通图片可避免大量 `HEAD /lq_image/...` 请求。
- 图片+视频混合章节保持安全：首图选择会跳过视频/GIF，找到第一张普通图片。

## 需要补充的测试

实现该设计时建议补充：

1. 后端：图片+视频混合章节仍返回第一张普通图片的 `cover_file` 和 `cover_source`。
2. 后端：纯视频/GIF 章节返回 `total_files`，但不返回 `cover_file`/`cover_source`。
3. 前端：阅读器在 `cover_source = lq` 时普通图片直接构建 LQ URL，不触发 LQ HEAD。
4. 前端：阅读器在 `cover_source = hq` 时普通图片直接构建 HQ URL。
5. 前端：`cover_source` 缺失时普通图片回退旧 `resolveImageUrl()`。
6. 前端：视频/GIF 始终走 `buildVideoUrl()`，不读取 `cover_source`。
