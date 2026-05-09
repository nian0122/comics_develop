
- `lsp_diagnostics` 对 `frontend/package.json` 返回 biome 未安装的提示，属于环境限制，不影响当前配置文件本身的语法校验。
- `npm run lint` 之前因 ESLint 9 在 `src/` 目录尚未创建时会把目录参数视为未匹配路径而失败；已通过在脚本中添加 `--no-error-on-unmatched-pattern` 解决。
