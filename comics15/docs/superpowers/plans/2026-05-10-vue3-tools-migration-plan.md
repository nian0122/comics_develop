# 工具页Vue3迁移实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将Vanilla实现的工具页完全迁移至Vue3体系，实现单入口单页应用架构

**Architecture:** 
- **State**: Pinia store管理工具列表、执行状态、轮询逻辑
- **Components**: 功能内聚的Vue SFC组件（列表/配置/执行/历史）
- **API**: 复用现有 `tools-api.js` 服务层
- **Styling**: Tailwind CSS + 现有CSS变量系统

**Project Context:** 
- Comic Reader 前端：Vite + Vue3 + Pinia + Vue Router
- 当前混合架构：主阅读器(Vue3) + 工具页(Vanilla)
- 目标：统一为纯Vue3架构，删除独立入口

**Design Reference:** `docs/superpowers/specs/2026-05-10-vue3-tools-migration-design.md`

---

## Prerequisites

- [ ] 确认设计文档已审阅
- [ ] 确认开发分支已创建
- [ ] 后端API正常运行（用于测试工具执行）

---

## File Structure

### 新增文件
- `src/stores/tools-store.js` - Pinia状态管理
- `src/pages/ToolsPage.vue` - 工具页主组件
- `src/components/tools/ToolList.vue` - 工具列表组件
- `src/components/tools/ToolConfig.vue` - 工具配置表单
- `src/components/tools/ExecutionPanel.vue` - 执行监控面板
- `src/components/tools/ExecutionHistory.vue` - 执行历史列表

### 修改文件
- `src/router/index.js` - 添加 `/tools` 路由
- `src/App.vue` - 添加工具页导航入口（可选，视设计而定）

### 删除文件
- `tools.html` - 原Vanilla入口
- `js/tools-main.js` - 原Vanilla逻辑

---

## Phase 1: 基础架构

### Task 1.1: 创建 tools-store Pinia store
**文件:** `src/stores/tools-store.js`

```javascript
import { defineStore } from 'pinia';
import { toolsApi } from '../services/tools-api.js';

export const useToolsStore = defineStore('tools', {
    state: () => ({
        tools: [],
        selectedTool: null,
        seriesList: [],
        executions: {},
        currentExecution: null,
        pollingTimer: null,
        loading: false,
        error: null
    }),
    
    getters: {
        hasRunningExecution: (state) => {
            return state.currentExecution?.status === 'running';
        },
        executionHistory: (state) => {
            return Object.values(state.executions).sort(
                (a, b) => new Date(b.startTime) - new Date(a.startTime)
            );
        }
    },
    
    actions: {
        async loadTools() {
            this.loading = true;
            this.error = null;
            try {
                this.tools = await toolsApi.getTools();
            } catch (err) {
                this.error = '加载工具列表失败';
                console.error(err);
            } finally {
                this.loading = false;
            }
        },
        
        selectTool(tool) {
            this.selectedTool = tool;
        },
        
        async loadSeries() {
            try {
                this.seriesList = await toolsApi.getSeries();
            } catch (err) {
                console.error('加载系列列表失败:', err);
            }
        },
        
        async executeTool(params) {
            if (!this.selectedTool) return;
            
            try {
                const result = await toolsApi.executeTool(this.selectedTool.id, params);
                this.currentExecution = {
                    id: result.executionId,
                    status: 'running',
                    startTime: new Date().toISOString(),
                    logs: []
                };
                this.startPolling(result.executionId);
            } catch (err) {
                console.error('执行工具失败:', err);
                this.error = '执行工具失败';
            }
        },
        
        startPolling(executionId) {
            if (this.pollingTimer) {
                clearInterval(this.pollingTimer);
            }
            
            this.pollingTimer = setInterval(async () => {
                await this.pollExecution(executionId);
            }, 1000);
        },
        
        async pollExecution(executionId) {
            try {
                const status = await toolsApi.getExecutionStatus(executionId);
                this.currentExecution = {
                    ...this.currentExecution,
                    ...status
                };
                
                // 存储到历史记录
                this.executions[executionId] = { ...this.currentExecution };
                
                // 如果已完成，停止轮询
                if (status.status === 'completed' || status.status === 'error' || status.status === 'cancelled') {
                    this.stopPolling();
                }
            } catch (err) {
                console.error('轮询执行状态失败:', err);
            }
        },
        
        stopPolling() {
            if (this.pollingTimer) {
                clearInterval(this.pollingTimer);
                this.pollingTimer = null;
            }
        },
        
        async cancelExecution() {
            if (!this.currentExecution?.id) return;
            
            try {
                await toolsApi.cancelExecution(this.currentExecution.id);
                this.currentExecution.status = 'cancelled';
                this.stopPolling();
            } catch (err) {
                console.error('取消执行失败:', err);
            }
        },
        
        async loadExecutions() {
            try {
                const executions = await toolsApi.getAllExecutions();
                this.executions = executions;
            } catch (err) {
                console.error('加载执行历史失败:', err);
            }
        },
        
        async cleanupExecutions() {
            try {
                await toolsApi.cleanupExecutions();
                this.executions = {};
                this.currentExecution = null;
            } catch (err) {
                console.error('清理执行历史失败:', err);
            }
        },
        
        clearError() {
            this.error = null;
        }
    }
});
```

**测试:**
- [ ] 创建 `src/stores/tools-store.test.js`
- [ ] 测试 loadTools 成功/失败场景
- [ ] 测试 executeTool 和轮询逻辑
- [ ] 测试 cancelExecution
- [ ] 测试 cleanupExecutions

**验证:** `npm run test -- src/stores/tools-store.test.js` 通过

---

### Task 1.2: 添加 /tools 路由
**文件:** `src/router/index.js`

在 `routes` 数组中添加：
```javascript
{
    path: '/tools',
    name: 'tools',
    component: () => import('../pages/ToolsPage.vue')
}
```

**验证:** 
- [ ] 路由配置无语法错误
- [ ] 开发服务器启动正常 (`npm run dev`)

---

## Phase 2: 组件开发

### Task 2.1: ToolList 组件
**文件:** `src/components/tools/ToolList.vue`

```vue
<template>
  <div class="tool-list">
    <div class="section-label mb-3">可用工具</div>
    
    <div v-if="loading" class="loading-indicator">
      <svg class="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="10" stroke-width="2"></circle>
      </svg>
      正在加载...
    </div>
    
    <div v-else-if="error" class="text-red-400 p-2">
      加载失败
    </div>
    
    <div v-else-if="tools.length === 0" class="text-gray-500 p-2">
      暂无可用工具
    </div>
    
    <div v-else class="space-y-1">
      <button
        v-for="tool in tools"
        :key="tool.id"
        class="tool-item w-full text-left px-3 py-2 rounded-lg transition-colors"
        :class="{ 
          'bg-blue-500/20 border-blue-500/50': selectedTool?.id === tool.id,
          'hover:bg-white/5 border-transparent': selectedTool?.id !== tool.id
        }"
        :class="{ 'border': true }"
        @click="selectTool(tool)"
      >
        <div class="font-medium text-sm">{{ tool.name }}</div>
        <div class="text-xs text-gray-400 mt-0.5">{{ tool.description }}</div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useToolsStore } from '../../stores/tools-store.js';

const store = useToolsStore();

const tools = computed(() => store.tools);
const selectedTool = computed(() => store.selectedTool);
const loading = computed(() => store.loading);
const error = computed(() => store.error);

function selectTool(tool) {
  store.selectTool(tool);
}
</script>
```

**验证:**
- [ ] 组件渲染无错误
- [ ] 点击工具触发选中状态

---

### Task 2.2: ToolConfig 组件
**文件:** `src/components/tools/ToolConfig.vue`

```vue
<template>
  <div v-if="selectedTool" class="tool-config">
    <h2 class="text-lg font-semibold mb-2">{{ selectedTool.name }}</h2>
    <p class="text-gray-400 text-sm mb-4">{{ selectedTool.description }}</p>
    
    <div v-if="selectedTool.params && selectedTool.params.length > 0" class="space-y-3">
      <div v-for="param in selectedTool.params" :key="param.name" class="param-field">
        <label class="block text-sm font-medium mb-1">
          {{ param.label || param.name }}
          <span v-if="param.required" class="text-red-400">*</span>
        </label>
        
        <!-- 系列选择 -->
        <select
          v-if="param.type === 'series'"
          v-model="formData[param.name]"
          class="w-full glass-input px-3 py-2 rounded-lg text-sm"
        >
          <option value="">请选择系列</option>
          <option v-for="series in seriesList" :key="series" :value="series">
            {{ series }}
          </option>
        </select>
        
        <!-- 文本输入 -->
        <input
          v-else-if="param.type === 'string'"
          v-model="formData[param.name]"
          type="text"
          :placeholder="param.placeholder"
          class="w-full glass-input px-3 py-2 rounded-lg text-sm"
        />
        
        <!-- 数字输入 -->
        <input
          v-else-if="param.type === 'number'"
          v-model.number="formData[param.name]"
          type="number"
          :placeholder="param.placeholder"
          class="w-full glass-input px-3 py-2 rounded-lg text-sm"
        />
        
        <!-- 布尔选择 -->
        <label v-else-if="param.type === 'boolean'" class="flex items-center cursor-pointer">
          <input
            v-model="formData[param.name]"
            type="checkbox"
            class="mr-2"
          />
          <span class="text-sm">{{ param.label }}</span>
        </label>
      </div>
    </div>
    
    <div v-else class="text-gray-400 text-sm italic">
      此工具无需配置参数
    </div>
    
    <button
      @click="execute"
      :disabled="!canExecute || hasRunningExecution"
      class="primary-btn mt-4 w-full"
      :class="{ 'opacity-50 cursor-not-allowed': !canExecute || hasRunningExecution }"
    >
      {{ hasRunningExecution ? '执行中...' : '执行工具' }}
    </button>
  </div>
  
  <div v-else class="text-center text-gray-500 py-8">
    请从左侧选择一个工具
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useToolsStore } from '../../stores/tools-store.js';

const store = useToolsStore();
const formData = ref({});

const selectedTool = computed(() => store.selectedTool);
const seriesList = computed(() => store.seriesList);
const hasRunningExecution = computed(() => store.hasRunningExecution);

const canExecute = computed(() => {
  if (!selectedTool.value) return false;
  if (!selectedTool.value.params) return true;
  
  return selectedTool.value.params.every(param => {
    if (!param.required) return true;
    return formData.value[param.name] !== undefined && 
           formData.value[param.name] !== '' &&
           formData.value[param.name] !== null;
  });
});

watch(selectedTool, (newTool) => {
  if (newTool && newTool.params) {
    // 初始化表单数据
    formData.value = {};
    newTool.params.forEach(param => {
      if (param.type === 'boolean') {
        formData.value[param.name] = param.default || false;
      } else {
        formData.value[param.name] = param.default || '';
      }
    });
  } else {
    formData.value = {};
  }
}, { immediate: true });

function execute() {
  store.executeTool(formData.value);
}
</script>
```

**验证:**
- [ ] 根据工具参数动态渲染表单
- [ ] 必填验证正常工作
- [ ] 执行按钮状态正确

---

### Task 2.3: ExecutionPanel 组件
**文件:** `src/components/tools/ExecutionPanel.vue`

```vue
<template>
  <div v-if="currentExecution" class="execution-panel mt-6 border-t border-white/10 pt-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-medium">执行状态</h3>
      <span
        class="status-badge px-2 py-1 rounded text-xs"
        :class="statusClass"
      >
        {{ statusText }}
      </span>
    </div>
    
    <!-- 进度条 -->
    <div v-if="currentExecution.progress !== undefined" class="mb-3">
      <div class="flex justify-between text-xs text-gray-400 mb-1">
        <span>进度</span>
        <span>{{ currentExecution.progress }}%</span>
      </div>
      <div class="progress-bar h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          class="progress-fill h-full bg-blue-500 transition-all duration-300"
          :style="{ width: currentExecution.progress + '%' }"
        ></div>
      </div>
    </div>
    
    <!-- 统计信息 -->
    <div v-if="currentExecution.stats" class="text-xs text-gray-400 mb-3 space-y-1">
      <div v-for="(value, key) in currentExecution.stats" :key="key">
        {{ key }}: {{ value }}
      </div>
    </div>
    
    <!-- 日志输出 -->
    <div class="log-container bg-black/30 rounded-lg p-3 h-48 overflow-y-auto font-mono text-xs">
      <div v-if="currentExecution.logs && currentExecution.logs.length > 0">
        <div
          v-for="(log, index) in currentExecution.logs"
          :key="index"
          class="log-line mb-1"
          :class="logClass(log)"
        >
          <span class="log-time text-gray-500">{{ formatTime(log.time) }}</span>
          <span class="log-message ml-2">{{ log.message }}</span>
        </div>
      </div>
      <div v-else class="text-gray-500 italic">
        等待日志输出...
      </div>
    </div>
    
    <!-- 取消按钮 -->
    <button
      v-if="currentExecution.status === 'running'"
      @click="cancel"
      class="danger-btn mt-3 w-full"
    >
      取消执行
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useToolsStore } from '../../stores/tools-store.js';

const store = useToolsStore();

const currentExecution = computed(() => store.currentExecution);

const statusText = computed(() => {
  const status = currentExecution.value?.status;
  switch (status) {
    case 'running': return '运行中';
    case 'completed': return '已完成';
    case 'error': return '出错';
    case 'cancelled': return '已取消';
    default: return status;
  }
});

const statusClass = computed(() => {
  const status = currentExecution.value?.status;
  switch (status) {
    case 'running': return 'bg-blue-500/20 text-blue-400';
    case 'completed': return 'bg-green-500/20 text-green-400';
    case 'error': return 'bg-red-500/20 text-red-400';
    case 'cancelled': return 'bg-gray-500/20 text-gray-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
});

function logClass(log) {
  if (log.level === 'error') return 'text-red-400';
  if (log.level === 'warn') return 'text-yellow-400';
  return 'text-gray-300';
}

function formatTime(time) {
  if (!time) return '--:--:--';
  const date = new Date(time);
  return date.toLocaleTimeString('zh-CN');
}

function cancel() {
  store.cancelExecution();
}
</script>

<style scoped>
.log-container {
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.2) transparent;
}
</style>
```

**验证:**
- [ ] 进度条正确显示
- [ ] 日志自动滚动（可选）
- [ ] 状态徽章颜色正确

---

### Task 2.4: ExecutionHistory 组件
**文件:** `src/components/tools/ExecutionHistory.vue`

```vue
<template>
  <div class="execution-history">
    <div class="section-label mb-3">执行历史</div>
    
    <div v-if="executionHistory.length === 0" class="text-gray-500 text-sm p-2">
      暂无执行记录
    </div>
    
    <div v-else class="space-y-2">
      <div
        v-for="execution in executionHistory.slice(0, 10)"
        :key="execution.id"
        class="execution-item p-2 rounded-lg bg-white/5 border border-white/10"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-400">{{ formatTime(execution.startTime) }}</span>
          <span
            class="text-xs px-1.5 py-0.5 rounded"
            :class="statusClass(execution.status)"
          >
            {{ statusText(execution.status) }}
          </span>
        </div>
        <div v-if="execution.toolName" class="text-sm mt-1">
          {{ execution.toolName }}
        </div>
      </div>
      
      <button
        v-if="Object.keys(executions).length > 0"
        @click="cleanup"
        class="text-xs text-red-400 hover:text-red-300 mt-2 px-2 py-1"
      >
        清理历史记录
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useToolsStore } from '../../stores/tools-store.js';

const store = useToolsStore();

const executions = computed(() => store.executions);
const executionHistory = computed(() => store.executionHistory);

function statusText(status) {
  const map = {
    'running': '运行中',
    'completed': '完成',
    'error': '错误',
    'cancelled': '取消'
  };
  return map[status] || status;
}

function statusClass(status) {
  const map = {
    'running': 'bg-blue-500/20 text-blue-400',
    'completed': 'bg-green-500/20 text-green-400',
    'error': 'bg-red-500/20 text-red-400',
    'cancelled': 'bg-gray-500/20 text-gray-400'
  };
  return map[status] || 'bg-gray-500/20 text-gray-400';
}

function formatTime(time) {
  if (!time) return '--';
  const date = new Date(time);
  return date.toLocaleString('zh-CN', { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function cleanup() {
  store.cleanupExecutions();
}
</script>
```

**验证:**
- [ ] 历史记录正确排序（最新在前）
- [ ] 清理按钮正常工作

---

### Task 2.5: ToolsPage 主页面
**文件:** `src/pages/ToolsPage.vue`

```vue
<template>
  <section class="tools-page h-screen flex flex-col">
    <!-- Header -->
    <header class="flex items-center justify-between px-6 py-4 border-b border-white/10">
      <div>
        <h1 class="text-xl font-bold">工具管理</h1>
        <p class="text-sm text-gray-400">执行和管理系统工具</p>
      </div>
      <a href="/" class="glass-btn text-sm px-4 py-2">
        返回阅读器
      </a>
    </header>
    
    <!-- Main Content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left Sidebar: Tool List -->
      <aside class="w-64 border-r border-white/10 p-4 overflow-y-auto">
        <ToolList />
      </aside>
      
      <!-- Center: Config & Execution -->
      <main class="flex-1 p-6 overflow-y-auto">
        <ToolConfig />
        <ExecutionPanel />
      </main>
      
      <!-- Right Sidebar: Execution History -->
      <aside class="w-64 border-l border-white/10 p-4 overflow-y-auto">
        <ExecutionHistory />
      </aside>
    </div>
  </section>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useToolsStore } from '../stores/tools-store.js';
import ToolList from '../components/tools/ToolList.vue';
import ToolConfig from '../components/tools/ToolConfig.vue';
import ExecutionPanel from '../components/tools/ExecutionPanel.vue';
import ExecutionHistory from '../components/tools/ExecutionHistory.vue';

const store = useToolsStore();

onMounted(() => {
  store.loadTools();
  store.loadSeries();
  store.loadExecutions();
});

onUnmounted(() => {
  // 清理轮询
  store.stopPolling();
});
</script>
```

**验证:**
- [ ] 三栏布局正确
- [ ] 页面挂载时加载初始数据
- [ ] 页面卸载时停止轮询

---

## Phase 3: 整合与清理

### Task 3.1: 测试完整流程
**步骤:**
- [ ] 启动开发服务器: `npm run dev`
- [ ] 访问 `/tools` 路由
- [ ] 验证工具列表加载
- [ ] 选择一个工具，验证配置表单
- [ ] 执行工具，验证轮询和日志
- [ ] 测试取消功能
- [ ] 验证执行历史更新
- [ ] 测试清理功能

### Task 3.2: 运行测试套件
```bash
npm test
```
- [ ] 所有store测试通过
- [ ] 所有组件测试通过（如有）

### Task 3.3: 删除旧文件
- [ ] 删除 `tools.html`
- [ ] 删除 `js/tools-main.js`
- [ ] 删除 `js/` 目录（如果为空）

### Task 3.4: 验证构建
```bash
npm run build
```
- [ ] 构建无错误
- [ ] 检查 `dist/` 输出

---

## 验收清单

- [ ] `/tools` 路由可正常访问
- [ ] 工具列表正确显示
- [ ] 各工具可正常执行并显示进度/日志
- [ ] 取消执行功能正常
- [ ] 执行历史可查看和清理
- [ ] 移动端布局响应式正常
- [ ] 原 `tools.html` 和 `js/tools-main.js` 已删除
- [ ] `npm test` 全部通过
- [ ] `npm run build` 成功

---

## 提交记录建议

1. `feat: add tools-store Pinia store`
2. `feat: add /tools route`
3. `feat: add ToolList component`
4. `feat: add ToolConfig component`
5. `feat: add ExecutionPanel component`
6. `feat: add ExecutionHistory component`
7. `feat: add ToolsPage main component`
8. `refactor: remove vanilla tools implementation`
9. `test: add tools-store tests`

---

**计划完成。开始实施时请标记每个任务的复选框。**
