# 工具页Vue3迁移设计文档

**日期**: 2026-05-10  
**状态**: 待确认  
**作者**: Sisyphus  

---

## 1. 背景与目标

### 1.1 当前架构

前端目前采用**混合架构**：

- **Vue3主阅读器** (`index.html` → `src/`): 系列列表、目录浏览、阅读器
- **Vanilla工具页** (`tools.html` → `js/tools-main.js`): 工具管理、执行、状态监控

### 1.2 问题

1. **技术债务**: 维护两套不同的状态管理模式（Pinia vs 手动DOM）
2. **代码重复**: `tools-main.js` 已引用 `src/services/tools-api.js`，但状态逻辑无法复用
3. **开发体验**: 新增功能需要学习两种技术栈
4. **一致性**: UI组件无法复用（Vue组件 vs 原生DOM）

### 1.3 目标

将工具页完全迁移至Vue3体系，实现：
- 统一的单页应用架构
- 复用现有Vue组件和样式系统
- 利用Pinia进行状态管理
- 保持原有功能和用户体验

---

## 2. 架构设计

### 2.1 迁移策略: 渐进式迁移（方案A）

**核心思路**: 在现有Vue3应用中新增 `/tools` 路由，完全重写工具页逻辑，直接替换Vanilla实现。

**优势**:
- 利用现有基础设施（Router、Pinia、Tailwind）
- 代码复用最大化
- 可并行开发、独立测试
- 上线时直接切换，无过渡态

### 2.2 路由设计

```javascript
// src/router/index.js
{
    path: '/tools',
    name: 'tools',
    component: () => import('../pages/ToolsPage.vue')
}
```

**导航入口**: 从主阅读器的底部导航栏或顶部菜单进入

### 2.3 目录结构调整

```
frontend/
├── index.html                 # 单一入口（移除 tools.html）
├── src/
│   ├── router/index.js        # 新增 /tools 路由
│   ├── stores/
│   │   └── tools-store.js     # 新建：工具状态管理
│   ├── pages/
│   │   └── ToolsPage.vue      # 新建：工具页主组件
│   └── components/tools/      # 新建：工具相关子组件
│       ├── ToolList.vue       # 工具列表
│       ├── ToolConfig.vue     # 工具配置面板
│       ├── ExecutionPanel.vue # 执行监控面板
│       └── ExecutionHistory.vue # 执行历史
```

### 2.4 状态管理设计

```javascript
// stores/tools-store.js
export const useToolsStore = defineStore('tools', {
    state: () => ({
        tools: [],                    // 可用工具列表
        selectedTool: null,           // 当前选中工具
        seriesList: [],               // 系列列表（用于工具参数）
        executions: {},               // 执行记录
        currentExecution: null,       // 当前执行
        pollingInterval: null,      // 轮询定时器
    }),
    actions: {
        loadTools(),                  // 加载工具列表
        selectTool(tool),            // 选择工具
        loadSeries(),                // 加载系列列表
        executeTool(config),         // 执行工具
        pollExecution(id),          // 轮询执行状态
        cancelExecution(),          // 取消执行
        cleanupExecutions(),        // 清理执行记录
    }
})
```

**状态流转**:
```
loadTools → selectTool → executeTool → pollExecution → complete/error
                              ↓
                         cancelExecution
```

### 2.5 组件拆分

#### ToolsPage.vue (主页面)
- 三栏布局：工具列表 | 配置/执行面板 | 执行历史
- 使用现有CSS变量和Tailwind类
- 响应式：移动端堆叠布局

#### ToolList.vue (左栏)
- 渲染 `tools-store.tools`
- 点击选中，高亮当前
- 空状态处理

#### ToolConfig.vue (中栏-配置)
- 动态表单生成（根据工具参数配置）
- 系列选择下拉框
- 执行按钮

#### ExecutionPanel.vue (中栏-执行)
- 状态徽章（运行中/完成/错误）
- 进度条
- 日志输出（滚动区域）
- 取消按钮

#### ExecutionHistory.vue (右栏)
- 执行记录列表
- 状态过滤
- 清理按钮

---

## 3. 数据流设计

### 3.1 工具加载流程

```
ToolsPage.vue (onMounted)
    ↓
useToolsStore.loadTools()
    ↓
toolsApi.getTools()
    ↓
Backend API /api/tools
    ↓
Store.tools = response
    ↓
ToolList.vue (响应式更新)
```

### 3.2 工具执行流程

```
ToolConfig.vue (点击执行)
    ↓
useToolsStore.executeTool(config)
    ↓
toolsApi.executeTool(toolId, params)
    ↓
Store.currentExecution = { id, status: 'running' }
    ↓
useToolsStore.pollExecution(id)  // 1秒间隔
    ↓
toolsApi.getExecutionStatus(id)
    ↓
更新 Store.currentExecution
    ↓
ExecutionPanel.vue (响应式更新)
    ↓
状态为 'completed'/'error' → 停止轮询
```

### 3.3 取消执行流程

```
ExecutionPanel.vue (点击取消)
    ↓
useToolsStore.cancelExecution()
    ↓
toolsApi.cancelExecution(id)
    ↓
停止轮询
    ↓
更新 Store.currentExecution.status = 'cancelled'
```

---

## 4. UI设计

### 4.1 布局

参考现有 `tools.html` 的三栏布局，使用Vue组件化：

**桌面端**:
```
┌─────────────────────────────────────────────────────────────┐
│  Header: 漫画阅读器 > 工具管理                               │
├──────────────┬────────────────────────────┬─────────────────┤
│              │                            │                 │
│  工具列表    │    配置面板 / 执行面板     │   执行历史      │
│              │                            │                 │
│  - 图片优化  │    [参数表单]              │   - 最近执行    │
│  - 查找叶子  │    [执行按钮]              │   - 状态过滤    │
│  - 清空文件  │                            │   [清理按钮]    │
│              │    ──────────────────────    │                 │
│              │                            │                 │
│              │    进度条                    │                 │
│              │    日志输出                  │                 │
│              │    [取消按钮]                │                 │
│              │                            │                 │
└──────────────┴────────────────────────────┴─────────────────┘
```

**移动端**: 垂直堆叠，工具列表折叠为下拉选择

### 4.2 样式复用

- **Tailwind CDN**: 已统一在 `index.html` 引入
- **CSS变量**: 复用 `css/variables.css` 和 `css/components.css`
- **组件样式**: 参考现有Vue组件的 `mobile-*` 类名规范

### 4.3 交互保持

与原Vanilla实现保持一致：
- 工具选择即时切换配置面板
- 执行后自动显示执行面板并轮询
- 日志自动滚动到底部
- 取消/清理操作需确认

---

## 5. API复用

### 5.1 已有服务

```javascript
// src/services/tools-api.js（已存在）
export const toolsApi = {
    getTools(),
    getSeries(),
    executeTool(toolId, params),
    getExecutionStatus(executionId),
    cancelExecution(executionId),
    getAllExecutions(),
    cleanupExecutions(),
}
```

### 5.2 无需修改

所有API调用逻辑已封装在 `tools-api.js`，Vue组件直接复用。

---

## 6. 测试策略

### 6.1 单元测试

```
src/stores/tools-store.test.js    # Pinia store测试
src/pages/ToolsPage.test.js       # 页面组件测试
src/components/tools/*.test.js    # 子组件测试
```

### 6.2 集成测试

- 工具列表加载
- 工具执行流程（完整轮询周期）
- 取消执行
- 执行历史清理

### 6.3 手动验证

- 各工具实际执行（图片优化、查找叶子、清空文件）
- 移动端响应式布局
- 与原Vanilla版本功能对比

---

## 7. 迁移清单

### 7.1 新增文件

- [ ] `src/stores/tools-store.js` - Pinia状态管理
- [ ] `src/pages/ToolsPage.vue` - 工具页主组件
- [ ] `src/components/tools/ToolList.vue`
- [ ] `src/components/tools/ToolConfig.vue`
- [ ] `src/components/tools/ExecutionPanel.vue`
- [ ] `src/components/tools/ExecutionHistory.vue`

### 7.2 修改文件

- [ ] `src/router/index.js` - 添加 `/tools` 路由
- [ ] `src/App.vue` - 添加工具页导航入口（可选）

### 7.3 删除文件

- [ ] `tools.html` - 原Vanilla入口
- [ ] `js/tools-main.js` - 原Vanilla逻辑

### 7.4 配置更新

- [ ] `vite.config.js` - 检查是否需要调整（如有多入口配置）
- [ ] `nginx.conf` - 移除 `tools.html` 特定配置（如有）

---

## 8. 风险与缓解

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| 工具执行逻辑bug | 中 | 高 | 完整回归测试所有工具 |
| 移动端样式问题 | 中 | 中 | 真机测试，参考现有移动端规范 |
| 轮询性能问题 | 低 | 中 | 使用Pinia的$onAction控制并发 |
| 导航体验差异 | 低 | 低 | 添加返回按钮，保持面包屑 |

---

## 9. 验收标准

- [ ] `/tools` 路由可正常访问
- [ ] 工具列表正确显示（与原版一致）
- [ ] 各工具可正常执行并显示进度/日志
- [ ] 取消执行功能正常
- [ ] 执行历史可查看和清理
- [ ] 移动端布局正常
- [ ] 原 `tools.html` 已删除
- [ ] 所有测试通过

---

## 10. 后续优化（可选）

1. **实时日志**: WebSocket替代轮询
2. **执行统计**: 执行时长、成功率展示
3. **批量操作**: 多系列批量执行工具
4. **权限控制**: 工具执行权限管理

---

**请确认以上设计方案，确认后我将创建详细的实施计划。**
