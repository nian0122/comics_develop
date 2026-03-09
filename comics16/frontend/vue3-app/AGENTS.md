# Vue 3 App - 开发指南

**位置**: `frontend/vue3-app/`  
**技术栈**: Vue 3.5 + TypeScript 5.9 + Vite 7 + Pinia 3 + Tailwind CSS 4

## 开发命令

```bash
# 安装依赖
npm install

# 开发模式 (http://localhost:5173)
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 测试命令

**注意**: 当前项目未配置测试框架。建议添加 Vitest：

```bash
# 安装 Vitest
npm install -D vitest @vitejs/plugin-vue @vue/test-utils jsdom

# 运行所有测试
npx vitest

# 运行单个测试文件
npx vitest tests/unit/example.test.ts

# 运行特定测试用例
npx vitest -t "测试名称"

# 生成覆盖率报告
npx vitest --coverage
```

## 代码风格指南

### TypeScript 配置 (强制执行)

```json
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noFallthroughCasesInSwitch": true
}
```

### 导入顺序

```typescript
// 1. Vue 核心
import { ref, computed } from 'vue'

// 2. 第三方库
import { defineStore } from 'pinia'

// 3. 项目组件 (字母顺序)
import Header from '@/components/Header.vue'

// 4. Stores/Composables (字母顺序)
import { useChapterStore } from '@/stores/chapter'

// 5. 工具函数
import { naturalSort } from '@/utils/naturalSort'

// 6. 样式
import '@/styles/main.css'
```

### 命名约定

- **文件**: 组件 `PascalCase.vue`, Composables `useXxx.ts`, Stores `entity.ts`
- **标识符**: 类 `PascalCase`, 变量/函数 `camelCase`, 常量 `UPPER_SNAKE_CASE`
- **DOM 元素**: `xxxEl` (例：`readerEl`)
- **事件处理**: `onXxx` (例：`onClick`)
- **CSS 类**: `kebab-case` (例：`.chapter-tree`)

### 组件结构

```vue
<script setup lang="ts">
// 1. 导入
import { ref, computed } from 'vue'
import { useChapterStore } from '@/stores/chapter'

// 2. Props (使用类型)
interface Props {
  seriesName: string
  initialExpanded?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  initialExpanded: false
})

// 3. Emits
const emit = defineEmits<{
  (e: 'update', value: string): void
}>()

// 4. 状态
const store = useChapterStore()
const isLoading = ref(false)

// 5. Computed
const hasData = computed(() => store.items.length > 0)

// 6. 方法
async function loadData(): Promise<void> {
  try {
    isLoading.value = true
    await store.fetch(props.seriesName)
  } catch (e) {
    console.error('加载失败:', e instanceof Error ? e.message : '未知错误')
  } finally {
    isLoading.value = false
  }
}

// 7. 生命周期
onMounted(() => loadData())
</script>

<template>
  <!-- 模板 -->
</template>

<style scoped>
/* 样式 */
</style>
```

### 错误处理 (必须遵守)

```typescript
// ✅ 推荐
try {
  const data = await fetchApi(url)
} catch (e) {
  const message = e instanceof Error ? e.message : '操作失败'
  error.value = message
  console.error('[组件名] 操作:', e)
}

// ❌ 禁止：空 catch
try { doSomething() } catch (e) {}

// ❌ 禁止：any 类型
catch (error: any) { }
```

### 类型定义

```typescript
// ✅ 推荐：interface 定义对象
export interface ChapterData {
  name: string
  path_id: string
  children?: ChapterData[]
}

// ✅ 推荐：联合类型
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

// ❌ 禁止：any
const data: any  // ❌
const data: unknown  // ✅
```

### Pinia Store 规范

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useChapterStore = defineStore('chapter', () => {
  // State
  const chapters = ref<ChapterData[]>([])
  const isLoading = ref(false)
  
  // Computed
  const hasChapters = computed(() => chapters.value.length > 0)
  
  // Actions
  async function loadChapters(seriesName: string): Promise<void> {
    isLoading.value = true
    try {
      const response = await fetch(`/api/chapters/${seriesName}`)
      if (!response.ok) throw new Error('加载失败')
      chapters.value = await response.json()
    } finally {
      isLoading.value = false
    }
  }
  
  return { chapters, isLoading, hasChapters, loadChapters }
})
```

### CSS 规范

**Tailwind CSS 优先**:
```vue
<!-- ✅ 推荐 -->
<button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">

<!-- ✅ 自定义 CSS 用于复杂效果 -->
<style scoped>
.glass-effect {
  background: rgba(255, 255, 250, 0.2);
  backdrop-filter: blur(12px);
}
</style>

<!-- ❌ 避免：内联样式 -->
<div style="margin: 10px;">
```

## 项目结构

```
src/
├── main.ts                 # 入口
├── App.vue                 # 根组件
├── components/             # UI 组件
├── stores/                 # Pinia stores
├── composables/            # 组合式函数
├── utils/                  # 工具函数
└── styles/                 # 全局样式
```

## 禁止模式

- ❌ 使用 `var` - 必须 `const`/`let`
- ❌ 使用 `any` - 使用具体类型或 `unknown`
- ❌ 空 catch 块 - 必须记录或处理
- ❌ 直接操作 DOM - 使用 `ref`/`computed`
- ❌ template 中复杂逻辑 - 移至 computed/方法
- ❌ 忘记清理副作用 - `onUnmounted` 清理
- ❌ `as any` 强制转换 - 使用类型守卫

## 调试技巧

**Vite 代理配置** (vite.config.ts):
- `/api` → http://localhost:5000
- `/hq_image` → http://localhost:5000
- `/video` → http://localhost:5000

```typescript
// 调试日志
console.log('[组件名] 状态:', { isLoading, data, error })

// Pinia store 调试
store.$subscribe((mutation, state) => {
  console.log('[Store]', mutation, state)
})
```

## 相关文档

- 项目全局：[`../../AGENTS.md`](../../AGENTS.md)
- 后端 API：[`../../backend/comic/AGENTS.md`](../../backend/comic/AGENTS.md)
- 前端架构：[`../AGENTS.md`](../AGENTS.md)
