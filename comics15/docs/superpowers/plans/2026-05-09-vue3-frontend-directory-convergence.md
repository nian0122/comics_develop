# Vue3 Frontend Directory Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将主阅读器相关前端代码全量收敛到 `frontend/src/**`，只让 `frontend/js/**` 保留工具页 Vanilla 边界。

**Architecture:** Vue3 主阅读器继续使用 `src/main.js`、Vue Router、Pinia、页面和组件；原 `js/services`、`js/utils`、`js/state`、`js/config` 中被 Vue3 复用的模块迁入 `src/shared/**`。`tools.html` 与 `js/tools-main.js` 继续保留 Vanilla，必要时从 `src/shared/**` 导入共享能力，但主阅读器不得再依赖 `js/**`。

**Design spec:** `docs/superpowers/specs/2026-05-09-vue3-frontend-vanilla-cleanup-design.md`

## File Structure

### Create or populate

- `frontend/src/shared/cache/chapter-meta-cache.js`：章节元数据缓存，从旧 `js/app/chapter-meta-cache.js` 迁入。
- `frontend/src/shared/config/constants.js`：共享懒加载、重试、章节数量等配置。
- `frontend/src/shared/services/api.js`：兼容 API 聚合入口。
- `frontend/src/shared/services/catalog-api.js`：漫画目录 API 封装。
- `frontend/src/shared/services/index.js`：共享 services barrel export。
- `frontend/src/shared/services/media-url.js`：HQ/LQ/video URL 构建与中文路径编码。
- `frontend/src/shared/services/persistence.js`：阅读器持久化封装。
- `frontend/src/shared/services/storage.js`：localStorage 访问封装。
- `frontend/src/shared/state/progress-state.js`：阅读进度状态兼容层。
- `frontend/src/shared/state/store.js`：仅在迁移后仍被共享层引用时保留。
- `frontend/src/shared/utils/*.js`：章节树、文件类型、封面元数据、自然排序、请求队列等纯工具。

### Keep under `frontend/js/**`

- `frontend/js/tools-main.js`：工具页 Vanilla 入口。
- `frontend/js/services/tools-api.js`：仅工具页使用的 API 封装；如果被 Vue3 引用，改为迁入 `src/shared/services/`。

### Delete when references are clean

- `frontend/js/main.js`
- `frontend/js/app/series-view.js` and test
- `frontend/js/app/directory-view.js` and test
- `frontend/js/app/reader-shell.js` and test
- `frontend/js/app/index.js`
- `frontend/js/app/AGENTS.md`
- `frontend/js/components/reader.js` and test
- `frontend/js/components/index.js` and test
- `frontend/js/router/**`
- `frontend/js/utils/reader-ui-files.test.js` or other tests that only assert old Vanilla UI files exist

### Update

- `frontend/src/**` imports: point all shared imports to `src/shared/**`.
- `frontend/js/tools-main.js` imports: keep tool-only imports under `js/**`; shared imports should point to `../src/shared/**` if needed.
- `frontend/vitest.config.js`: update coverage include/exclude paths after moves.
- `frontend/AGENTS.md`: document `src/shared/**` and clarify `js/**` is tools-only Vanilla boundary.

## Implementation Tasks

### 1. Baseline and reference map

- [ ] Run `git status --short` from repo root and note existing unrelated changes. Do not overwrite user work.
- [ ] From `frontend/`, run `npm test -- --runInBand` only if supported; if unsupported, run `npm test` and record baseline failures or success.
- [ ] From `frontend/`, run `npm run build` and record baseline failures or success.
- [ ] Search all imports from `frontend/src/**` to `../js/`, `../../js/`, or `/js/` and list exact files to update.
- [ ] Search all imports inside `frontend/js/tools-main.js` and `frontend/js/services/tools-api.js` to determine which shared modules tool page still needs.
- [ ] Search references to old Vanilla UI modules (`js/app`, `js/components`, `js/router`, `js/main.js`) before deleting anything.

### 2. Create `src/shared/**` directories and move tests with source

- [ ] Create `frontend/src/shared/cache/`, `config/`, `services/`, `state/`, and `utils/`.
- [ ] Move `frontend/js/app/chapter-meta-cache.js` and its tests, if any, to `frontend/src/shared/cache/`.
- [ ] Move shared config from `frontend/js/config/` to `frontend/src/shared/config/`.
- [ ] Move shared services except confirmed tool-only `tools-api.js` from `frontend/js/services/` to `frontend/src/shared/services/`.
- [ ] Move shared state modules from `frontend/js/state/` to `frontend/src/shared/state/`; keep `store.js` only if references require it.
- [ ] Move shared utility modules and their valid tests from `frontend/js/utils/` to `frontend/src/shared/utils/`.
- [ ] Do not move old Vanilla UI tests that only validate deleted files exist; mark them for deletion in Task 5.

### 3. Update imports incrementally

- [ ] Update `frontend/src/stores/**` imports to use `../shared/**` or `@/shared/**` according to existing Vite alias support.
- [ ] Update `frontend/src/pages/**` imports to use `../shared/**` or `@/shared/**`.
- [ ] Update `frontend/src/components/**` imports to use `../shared/**` or `@/shared/**`.
- [ ] Update `frontend/src/router/**` imports to use `../shared/**` if it imports URL builders or persistence.
- [ ] Update moved tests to import from their new colocated source paths.
- [ ] Update imports within moved shared modules so they no longer point back to `frontend/js/**`, except for confirmed tool-only boundaries.
- [ ] Update `frontend/js/tools-main.js` if it imports migrated shared modules; use explicit relative imports into `../src/shared/**`.

### 4. Run focused tests and fix path regressions

- [ ] From `frontend/`, run tests for moved shared utilities and services where test filenames are known.
- [ ] Run `npm test` from `frontend/`.
- [ ] Fix only migration-caused import or path failures; do not refactor behavior.
- [ ] Re-run `npm test` until it passes or only pre-existing failures remain clearly documented.

### 5. Delete old Vanilla reader code

- [ ] Confirm reference search shows no live import of `frontend/js/main.js`.
- [ ] Delete old Vanilla `frontend/js/main.js`.
- [ ] Confirm no live imports of `frontend/js/app/series-view.js`, `directory-view.js`, `reader-shell.js`, or `frontend/js/app/index.js`.
- [ ] Delete old Vanilla `frontend/js/app/**` files, except files already moved or still required by tool/shared code.
- [ ] Confirm no live imports of `frontend/js/components/**` old reader modules.
- [ ] Delete old Vanilla `frontend/js/components/**` reader files and obsolete tests.
- [ ] Confirm no live imports of `frontend/js/router/**`.
- [ ] Delete old Vanilla `frontend/js/router/**`.
- [ ] Delete tests that only assert old Vanilla UI files exist, such as `reader-ui-files.test.js`.

### 6. Update configuration and documentation

- [ ] Update `frontend/vitest.config.js` coverage paths to remove deleted `js/main.js` and include or naturally discover `src/shared/**` tests.
- [ ] Update `frontend/AGENTS.md` structure section to show `src/shared/**` and `js/**` as tools-only.
- [ ] If `frontend/js/` remains with only tool files, add or update a short local note if existing project conventions require it; otherwise keep docs centralized in `frontend/AGENTS.md`.
- [ ] Verify `package.json` scripts still cover both Vue3 source and tool page source; adjust only if lint/test misses `js/tools-main.js`.

### 7. Final verification

- [ ] Run `npm test` from `frontend/` and require exit code 0.
- [ ] Run `npm run build` from `frontend/` and require exit code 0.
- [ ] Run `npm run lint` from `frontend/` and require exit code 0.
- [ ] Search `frontend/src/**` for imports that point into `frontend/js/**`; require zero matches.
- [ ] Search repo for deleted old Vanilla module paths; require zero live references.
- [ ] Inspect `dist` output only if build changed generated files in the working tree; do not commit or edit generated output unless the repository intentionally tracks it.

## Testing Notes

- Keep behavior tests focused on unchanged contracts: URL path segment encoding, media URL selection, LQ-to-HQ fallback expectations, chapter tree generation, file type detection, and progress persistence keys.
- If a moved module has no test but is pure logic, add a small colocated test only when needed to protect migration behavior.
- Do not delete failing tests unless they assert old Vanilla implementation details that the design explicitly removes.

## Rollback Plan

- If broad import failures appear after moving everything, stop and restore file locations from Git for the affected group only, then repeat by moving one directory at a time.
- If tool page imports break, keep `tools-main.js` Vanilla and point it directly to `../src/shared/**`; do not duplicate shared modules back into `js/**` unless a build constraint makes cross-directory import impossible.
- If `store.js` creates circular imports after relocation, either keep it temporarily in `src/shared/state/store.js` with existing behavior or remove it only after reference search proves it is unused.

## Completion Criteria

- `frontend/src/**` contains all main reader and reader-shared code.
- `frontend/js/**` contains only `tools-main.js`, tool-only services, and any explicitly documented tool-only helpers.
- `frontend/src/**` has zero imports from `frontend/js/**`.
- Old Vanilla reader shell, views, router, components, and obsolete tests are deleted.
- `npm test`, `npm run build`, and `npm run lint` pass from `frontend/`.
