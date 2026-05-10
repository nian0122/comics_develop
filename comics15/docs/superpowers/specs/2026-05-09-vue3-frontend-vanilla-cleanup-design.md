# Vue3 前端目录收敛设计

## 背景

前端主阅读器已经从 Vanilla ES6/Vite 迁移到 Vue3：`frontend/index.html` 当前加载 `/src/main.js`，Vue3 页面、组件、Pinia store 和 Vue Router 已位于 `frontend/src/`。

迁移后仍遗留一批 `frontend/js/**` 模块。它们分为两类：

- 已被 Vue3 主阅读器替代的旧 Vanilla 主阅读器代码。
- Vue3 主阅读器仍复用的服务、工具函数、状态兼容层和配置。

工具页不参与本次 Vue 化：`frontend/tools.html` 仍加载 `js/tools-main.js`，它和工具页专属依赖继续保留 Vanilla。

## 目标

采用“全量 Vue 化，除了 tool”的目录收敛策略：

- 主阅读器相关代码全部归入 `frontend/src/**`。
- Vue3 主阅读器需要的共享模块从 `frontend/js/**` 迁入 `frontend/src/shared/**`。
- 删除不再被入口、测试、工具页或共享模块引用的旧 Vanilla 主阅读器代码。
- `frontend/js/**` 最终只表达工具页 Vanilla 入口及其专属依赖。

## 硬边界

- 不迁移工具页到 Vue3。
- 不删除 `frontend/tools.html`、`frontend/js/tools-main.js` 或工具页运行所需模块。
- 不删除 `frontend/css/**`，也不改 Tailwind CDN、全局 CSS token 和现有组件 class 使用方式。
- 不改后端 API、媒体 URL 契约、localStorage 键名和中文路径编码策略。
- 不重写业务逻辑；目录整理只做文件归位、导入修正、失效旧代码删除。
- 不提交 Git commit，除非用户明确要求。

## 目标目录结构

```text
frontend/
├── index.html
├── tools.html
├── src/
│   ├── main.js
│   ├── App.vue
│   ├── router/
│   ├── stores/
│   ├── pages/
│   ├── components/
│   └── shared/
│       ├── cache/
│       │   └── chapter-meta-cache.js
│       ├── config/
│       │   └── constants.js
│       ├── services/
│       │   ├── api.js
│       │   ├── catalog-api.js
│       │   ├── index.js
│       │   ├── media-url.js
│       │   ├── persistence.js
│       │   └── storage.js
│       ├── state/
│       │   ├── progress-state.js
│       │   └── store.js
│       └── utils/
│           ├── chapter-cover-meta.js
│           ├── chapter-tree.js
│           ├── file-type.js
│           ├── natural-sort.js
│           └── request-queue.js
├── js/
│   ├── tools-main.js
│   └── services/
│       └── tools-api.js
└── css/
```

说明：`src/shared/state/store.js` 只作为过渡兼容层保留。如果迁移后确认没有 Vue3 或共享模块继续需要旧全局 store，应在实施阶段删除它，而不是为了目录完整强行保留。

## 迁移范围

### 迁入 `src/shared/**`

以下模块属于 Vue3 主阅读器或跨主阅读器共享能力，应迁到 `src/shared/**`：

- `frontend/js/services/api.js`
- `frontend/js/services/catalog-api.js`
- `frontend/js/services/index.js`
- `frontend/js/services/media-url.js`
- `frontend/js/services/persistence.js`
- `frontend/js/services/storage.js`
- `frontend/js/config/constants.js`
- `frontend/js/state/progress-state.js`
- `frontend/js/state/store.js`，仅当仍被迁入后的共享模块引用时保留。
- `frontend/js/app/chapter-meta-cache.js`
- `frontend/js/utils/chapter-cover-meta.js`
- `frontend/js/utils/chapter-tree.js`
- `frontend/js/utils/file-type.js`
- `frontend/js/utils/natural-sort.js`
- `frontend/js/utils/request-queue.js`

对应测试应随源文件迁移到同目录，继续保持 `*.test.js` 与源文件同目录的现有约定。

### 保留在 `js/**`

以下模块属于工具页 Vanilla 边界，应保留在 `frontend/js/**`：

- `frontend/js/tools-main.js`
- `frontend/js/services/tools-api.js`，如果只有工具页使用。

如果 `tools-main.js` 依赖 `storage.js`、`api.js` 等被迁入 `src/shared/**` 的模块，实施时优先改为从 `../src/shared/**` 导入；不要为了工具页复制一份共享逻辑。

### 删除旧 Vanilla 主阅读器

以下文件属于旧 Vanilla 主阅读器壳层，迁移后原则上删除：

- `frontend/js/main.js`
- `frontend/js/app/series-view.js`
- `frontend/js/app/series-view.test.js`
- `frontend/js/app/directory-view.js`
- `frontend/js/app/directory-view.test.js`
- `frontend/js/app/reader-shell.js`
- `frontend/js/app/reader-shell.test.js`
- `frontend/js/app/index.js`
- `frontend/js/app/AGENTS.md`
- `frontend/js/components/reader.js`
- `frontend/js/components/reader.test.js`
- `frontend/js/components/index.js`
- `frontend/js/components/index.test.js`
- `frontend/js/router/**`
- 仅断言旧 UI 文件存在的测试，例如 `frontend/js/utils/reader-ui-files.test.js`
- 只服务于旧路由、旧视图 barrel export 的索引文件或测试

实际删除前必须用引用搜索确认没有 `src/**`、`tools.html`、`js/tools-main.js` 或保留模块仍引用这些文件。

## 导入路径策略

- `src/**` 内部导入共享模块时使用 `@/shared/...` 或相对路径；优先沿用当前 Vite alias 配置，如果没有 alias，则本次不新增 alias，只修正为稳定相对路径。
- `tools-main.js` 若需要共享模块，可从 `../src/shared/...` 导入，明确工具页是唯一仍在 `js/` 下的 Vanilla 入口。
- 禁止新增从 `src/**` 指向 `js/**` 的主阅读器依赖；整理后主阅读器不得再依赖 `frontend/js/**`。
- 删除或修正所有指向旧 `js/app`、`js/components`、`js/router` 的导入。

## 配置与文档调整

- `frontend/vitest.config.js`：根据移动后的文件路径更新 coverage include/exclude；保留 `js/tools-main.js` 的工具页排除规则。
- `frontend/package.json`：lint/test 命令可继续覆盖 `src/ js/`，因为工具页仍在 `js/`。
- `frontend/AGENTS.md`：更新目录说明，明确 `src/shared/**` 是 Vue3 主阅读器共享层，`js/**` 只保留工具页 Vanilla 边界。
- 如存在旧 `js/**/AGENTS.md` 且目录被删除，应同步删除；如果 `js/` 继续存在，可新增简短说明“仅工具页”。

## 验证标准

实施完成后必须通过：

```bash
cd frontend
npm test
npm run build
npm run lint
```

并额外确认：

- 主阅读器系列列表、目录页、阅读页仍可加载。
- 中文系列名和章节路径仍按路径分段编码。
- LQ 缺失返回 204 时仍回退 HQ。
- GIF 仍走 `/video/` 路径。
- 阅读进度和当前系列/章节恢复不改变 localStorage 键名。
- `tools.html` 仍可构建，工具页 API 调用路径不变。

## 自检

- 设计已按用户要求调整为“全量 Vue 化，除了 tool”。
- 设计未要求迁移工具页，也未删除工具页入口。
- 设计将主阅读器共享模块收敛到 `src/shared/**`，避免 Vue3 主阅读器继续依赖 `js/**`。
- 设计保留 CSS、后端 API、媒体路径和存储契约，避免扩大行为变更。
- 删除范围带有引用搜索前置条件，避免误删仍被工具页或共享层使用的模块。
