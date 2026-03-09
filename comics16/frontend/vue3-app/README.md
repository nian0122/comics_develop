# 本地漫画阅读器 - Vue 3 重构版

## 项目说明

这是将原有单一 HTML 文件项目重构为基于 **Vite + Vue 3 + TypeScript** 的规范化工程。

## 技术栈

- **构建工具**: Vite 5.x
- **框架**: Vue 3.4+ (Composition API, `<script setup>`)
- **语言**: TypeScript 5.x
- **状态管理**: Pinia 2.x
- **路由**: Vue Router 4.x (暂未使用，保留扩展)
- **样式**: Tailwind CSS 3.x + 自定义 CSS 变量

## 项目结构

```
frontend/vue3-app/
├── src/
│   ├── main.ts                    # 应用入口
│   ├── App.vue                    # 根组件
│   ├── components/                # UI 组件
│   │   ├── Sidebar.vue            # 侧边栏（系列 + 章节）
│   │   ├── Reader.vue             # 阅读器核心（懒加载）
│   │   ├── Header.vue             # 顶部控制栏
│   │   ├── Footer.vue             # 底部状态栏
│   │   ├── EmptyState.vue         # 空状态
│   │   └── JumpModal.vue          # 跳转页码弹窗
│   ├── stores/                    # Pinia 状态管理
│   │   ├── series.ts              # 系列数据
│   │   ├── chapter.ts             # 章节数据
│   │   └── reader.ts              # 阅读器状态
│   ├── composables/               # 组合式函数
│   │   ├── useApi.ts              # API 调用封装
│   │   ├── useLazyLoad.ts         # 懒加载逻辑
│   │   └── useKeyboard.ts         # 键盘事件
│   ├── utils/                     # 工具函数
│   │   ├── fileType.ts            # 文件类型判断
│   │   ├── naturalSort.ts         # 自然排序
│   │   └── storage.ts             # localStorage 封装
│   └── styles/                    # 全局样式
│       └── main.css               # 主题样式（保持原有 UI 风格）
├── public/                        # 静态资源
├── index.html                     # Vite 入口
├── vite.config.ts                 # Vite 配置（含代理）
├── tsconfig.json                  # TypeScript 配置
└── package.json                   # 依赖配置
```

## 开发命令

### 安装依赖
```bash
cd frontend/vue3-app
npm install
```

### 开发模式
```bash
npm run dev
```
访问：http://localhost:5173

**注意**: 需要后端服务运行在 `http://localhost:5000`，或通过 Vite 代理转发 API 请求。

### 构建生产版本
```bash
npm run build
```

## 核心功能

### 已实现
- ✅ 漫画系列列表加载
- ✅ 章节树形结构展示
- ✅ 图片懒加载（Intersection Observer）
- ✅ 骨架屏加载动画
- ✅ 图片加载重试机制
- ✅ 双击加载 HQ 图片
- ✅ 阅读进度本地存储
- ✅ 缩放控制
- ✅ 键盘快捷键（方向键、G 跳转等）
- ✅ 响应式 UI（保持原有燕麦色/象牙白主题）

### 待完善
- ⏳ 剩余 TypeScript 类型错误修复（约 17 个）
- ⏳ 预加载下一章功能
- ⏳ 无限滚动优化
- ⏳ 移动端触摸手势支持

## 配置说明

### Vite 代理配置

在 `vite.config.ts` 中已配置 API 代理：

```typescript
server: {
  port: 5173,
  proxy: {
    '/api': { target: 'http://localhost:5000', changeOrigin: true },
    '/hq_image': { target: 'http://localhost:5000', changeOrigin: true },
    '/video': { target: 'http://localhost:5000', changeOrigin: true },
  },
}
```

## 后续优化建议

1. **性能优化**
   - 图片预加载策略优化
   - 虚拟滚动大列表
   - 图片 CDN 支持

2. **功能增强**
   - 阅读历史统计
   - 收藏功能
   - 主题切换

3. **测试**
   - 单元测试（Vitest）
   - 端到端测试（Playwright）

## 许可证

MIT License
