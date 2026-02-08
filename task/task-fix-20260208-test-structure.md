# 任务：测试结构重构 - 统一使用 RPC 方式

## 需求描述
将 `tests/` 目录下所有使用 MCP SSE 方式的测试文件重写为 RPC 方式，并移动到 `tests/rpc/` 目录。

## 实现方案

### 技术变更
- **旧方式**：MCP SSE (Server-Sent Events) - 需要建立持久连接
- **新方式**：RPC (JSON-RPC over HTTP) - 简单的 HTTP POST 请求

### 优势
- ✅ 更简单 - 无需管理 SSE 连接
- ✅ 更快 - 同步返回结果
- ✅ 更稳定 - 无状态请求
- ✅ 易调试 - 可直接用 curl 测试

### 需要迁移的文件
```
tests/
├── api.window-tools.test.js          → tests/rpc/window-tools.test.js
├── api.set-window-bounds.test.js     → tests/rpc/set-window-bounds.test.js
├── api.ping.test.js                  → tests/rpc/ping.test.js (已存在于 basic-tools)
├── api.exec-js.test.js               → tests/rpc/exec-js.test.js
├── api.cdp-tools.test.js             → tests/rpc/cdp-tools.test.js
├── api.error-handling.test.js        → tests/rpc/error-handling.test.js
├── api.window-lifecycle.test.js      → tests/rpc/window-lifecycle.test.js
├── api.large-request.test.js         → tests/rpc/large-request.test.js
├── api.show-float-div.test.js        → tests/rpc/show-float-div.test.js
├── api.cdp-big-input.test.js         → tests/rpc/cdp-big-input.test.js
├── api.cdp-tools-action.test.js      → tests/rpc/cdp-tools-action.test.js
├── api.cdp-with-toast.test.js        → tests/rpc/cdp-with-toast.test.js
├── api.show-overlays.test.js         → tests/rpc/show-overlays.test.js
├── api.multi-account.test.js         → tests/rpc/multi-account.test.js
├── api.webpage-snapshot.test.js      → tests/rpc/webpage-snapshot.test.js
├── api.get-window-info.test.js       → tests/rpc/get-window-info.test.js
├── api.event-trigger.test.js         → tests/rpc/event-trigger.test.js
├── api.cdp-keyboard.test.js          → tests/rpc/cdp-keyboard.test.js
├── api.window-monitor.test.js        → tests/rpc/window-monitor.test.js
├── mcp.test.js                       → 删除（RPC 不需要）
├── auth.test.js                      → tests/rpc/auth.test.js
├── process-utils.test.js             → tests/rpc/process-utils.test.js
├── network-capture.test.js           → tests/rpc/network-capture.test.js
├── demo-pretty-log.test.js           → tests/rpc/demo-pretty-log.test.js
└── showFloatdiv.test.js              → tests/rpc/show-float-div.test.js (合并)
```

## TODO 清单
- [x] 创建 RPC 测试辅助函数
- [x] 迁移窗口管理测试
- [x] 迁移 CDP 操作测试
- [x] 迁移 JS 执行测试
- [x] 迁移其他功能测试
- [x] 删除原始测试文件
- [x] 更新 README
- [x] 运行完整测试套件验证

## 验收标准
- [x] 所有测试使用 RPC 方式
- [x] 所有测试通过 (53 passed, 1 skipped)
- [x] 原始 tests/*.test.js 文件已删除
- [x] tests/rpc/README.md 已更新
- [x] 代码符合规范
