# 阅读页懒加载优化设计

## 背景

当前阅读页的媒体懒加载已经能工作，但在章节很长、快速切换章节或退出页面时，还存在两个体验问题：

- 首次进入阅读页时，多个 `ReaderMediaItem` 各自创建观察器，开销偏高。
- 退出阅读页后，页面内仍可能有图片或视频请求继续进行。

本次优化目标是在不改变阅读页现有功能的前提下，减少无效请求、降低观察器数量，并保证离开页面后彻底停止未完成请求。

## 目标

- 章节内只激活视口附近的少量页面，避免一次性触发整章图片请求。
- 阅读页切换章节或离开页面时，彻底清理旧的观察器与媒体请求。
- 保留现有的双击切 HQ、LQ 回退 HQ、视频播放与阅读进度行为。

## 范围

### 需要修改

- `frontend/src/pages/ReaderPage.vue`
- `frontend/src/components/ReaderMediaItem.vue`
- `frontend/src/utils/lazy-image.js`
- `frontend/src/components/ReaderMediaItem.test.js`
- `frontend/src/pages/ReaderPage.test.js`
- `frontend/src/utils/lazy-image.test.js`

### 不修改

- 后端 API
- 路由结构
- 目录页章节树逻辑
- 工具页实现

## 方案

### 统一页面激活窗口

阅读页由 `ReaderPage.vue` 统一维护一个“激活窗口”。默认只激活当前页前 1 页、当前页、后 2 页；超出窗口的页面保持占位，不绑定真实媒体 `src`。

### 单观察器管理可见状态

`ReaderPage.vue` 使用一个 `IntersectionObserver` 观察所有页容器，根据当前视口中最接近的页面更新 `currentPage`，并同步激活窗口。这样可以减少每页一个观察器带来的额外开销。

### 媒体卸载清理

`ReaderMediaItem.vue` 在 `active` 变为 `false` 或组件卸载时，清空 `<img>/<video>` 的 `src`，视频额外调用 `load()`，确保网络请求停止。

## 数据流

1. `ReaderPage.vue` 从路由读取当前章节路径。
2. `readerStore.loadChapter()` 拉取章节文件列表。
3. `ReaderPage.vue` 计算当前激活窗口，向每个 `ReaderMediaItem` 传入 `active`。
4. `ReaderMediaItem.vue` 仅在 `active === true` 时绑定真实媒体源。
5. 页面滚动时，`IntersectionObserver` 更新当前页并刷新激活窗口。
6. 离开页面或切换章节时，`ReaderPage.vue` 清理观察器和激活窗口，`ReaderMediaItem.vue` 清空媒体源。

## 行为细则

- `active === false` 时，图片和视频不应绑定真实 `src`。
- `active` 从 `true` 变为 `false` 时，必须清空媒体 `src`。
- 退出阅读页时，必须断开观察器并释放所有页面引用。
- 快速切换章节时，新章节应重建激活窗口，旧章节不能继续触发懒加载。

## 测试策略

- `ReaderMediaItem.test.js`
  - active 为 false 时不渲染真实媒体源
  - active 变 false 时清空媒体 `src`
  - 卸载时停止图片/视频请求
- `ReaderPage.test.js`
  - 章节路由变化时重建激活窗口
  - 滚动更新当前页后，激活窗口随之变化
- `lazy-image.test.js`
  - 观察器创建和断开行为保持正确

## 验收标准

- 进入长章节后不会一次性加载整章媒体。
- 退出阅读页后，图片和视频请求停止。
- 切换章节后，不会沿用旧章节的懒加载状态。
- 现有阅读行为与测试全部通过。
