## 2026-05-09 Vitest 将 Vue 源文件误收集为测试套件

- 复现到 `npx vitest run src/pages/DirectoryPage.vue src/pages/SeriesPage.vue --reporter verbose` 时，Vitest 报 `No test suite found in file ...`，说明 `src/**/*.vue` 被错误纳入了 `test.include`。
- 根因位于 `frontend/vitest.config.js`：`test.include` 同时匹配了测试文件和 Vue 源组件，导致 `npm test` 会尝试执行页面组件本身。
- 修复方式是仅保留 `js/**/*.test.js`、`js/**/*.spec.js`、`src/**/*.test.js`、`src/**/*.spec.js` 作为测试匹配；`coverage.include` 继续保留 `src/**/*.vue`，以维持 Vue 源文件覆盖率统计。
## 2026-05-09 17:42 Task 10 验证修复

### 问题

- handleClick 中 pi.checkHQImageUsable 的 catch block 为空，违反项目禁止空 catch 的规则

### 修复

- 在空 catch block 中添加注释：// HQ 可用性检查失败时保持当前 LQ 图片，无需用户感知的错误提示
- 明确忽略理由：双击 HQ 检查失败是预期降级行为，用户应保持在 LQ 图片而非收到错误提示

### 验证

- 44 tests passed
- LSP diagnostics: clean
- grep 确认不再存在空 catch block
## 2026-05-09 Task 11 验证修复：ReaderPage ref 绑定

### 问题

ReaderPage.vue 定义了 mediaItemRefs 数组用于 observer 和 jumpToPage 触发子组件 loadMedia，但模板没有绑定 function ref，导致数组始终为空。

### 修复

**ReaderPage.vue**
- 将 mediaItemRefs 改为 ref([]) 响应式引用
- 添加 setMediaItemRef(el, index) 函数 ref 用于 v-for :ref 绑定
- 添加 clearMediaItemRefs() 清空函数
- loadData() 开始时调用 clearMediaItemRefs() 清空旧引用
- onUnmounted 使用 clearMediaItemRefs() 替代直接赋值
- defineExpose 暴露 mediaItemRefs, setMediaItemRef, clearMediaItemRefs, jumpModalVisible
- 所有 mediaItemRefs[index] 改为 mediaItemRefs.value[index]

**ReaderPage.test.js**
- 新增 setMediaItemRef 绑定测试
- 新增 observer callback 调用 loadMedia 测试
- 使用 wrapper.vm.setMediaItemRef 和 wrapper.vm.mediaItemRefs 验证 ref 绑定

### 验证

- ReaderPage 测试：18 passed（新增 2 个 ref 测试）
- Task 11 验证：48 passed（ReaderPage + ReaderMediaItem + ReaderShell）
- Build：成功，ReaderPage chunk 14.68 KB gzip 5.26 KB
- LSP diagnostics：clean
- grep：无 TODO/空 catch

### Gotchas

- Vue function ref 语法：`:ref="(el) => setMediaItemRef(el, index)"` 将组件实例传入
- ref([]) 通过 .value 访问数组，测试中 wrapper.vm.mediaItemRefs 已被 defineExpose 解包，直接访问即可
- defineExpose 暴露的响应式 ref 在 wrapper.vm 中自动解包，测试中无需 .value
## 2026-05-09 Task 11 Payload 处理修复

### 问题

ReaderPage.vue 的 handleMediaLoaded 和 handleMediaFailed 函数错误处理 ReaderMediaItem emit payload：
- ReaderMediaItem emit loaded 为 { index, filename } 对象
- ReaderMediaItem emit ailed 为 { index, filename } 对象
- ReaderPage.vue handleMediaLoaded(index) 把对象当作数字处理，导致 index + 1 产生 NaN 或字符串拼接
- ReaderPage.vue handleMediaFailed(index, err) 期望两个参数，但实际只有一个对象 payload

### 修复

**ReaderPage.vue**
- handleMediaLoaded(payload) 正确处理 { index, filename } payload，调用 eaderStore.setLoadedCount(payload.index + 1)
- handleMediaFailed(payload) 正确处理 { index, filename } payload，日志包含 index 和 filename

**ReaderPage.test.js**
- 新增 媒体加载事件 payload 处理 测试组 4 个测试
- 测试 handleMediaLoaded({ index: 1, filename: '002.jpg' }) → setLoadedCount(2)
- 测试 handleMediaFailed({ index: 0, filename: '001.jpg' }) → console.error 包含 index 和 filename
- 测试异常 payload 不产生 NaN/undefined

### 验证

- 52 tests passed（ReaderPage 22 + ReaderMediaItem 14 + ReaderShell 16）
- LSP diagnostics: clean

### Gotchas

- ReaderMediaItem emit payload 形状为 { index: number, filename: string }，不是纯 index number
- Vue 组件事件 payload 设计需要文档化或使用 TypeScript 类型约束避免此类 mismatch
