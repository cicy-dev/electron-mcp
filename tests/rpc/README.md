# RPC Tools Tests

测试所有 RPC 工具端点。

## 快速开始

```bash
# 1. 启动服务
cd ../..
npm start -- --port=8101

# 2. 运行测试
cd tests/rpc
npm test
```

## 测试覆盖

✅ **基础工具** (basic-tools.test.js)
- ping
- get_windows

✅ **窗口管理** (window-tools.test.js)
- open_window
- get_windows
- get_title
- load_url
- webpage_screenshot_and_to_clipboard
- webpage_snapshot
- close_window

✅ **CDP 工具** (cdp-tools.test.js)
- cdp_click
- cdp_dblclick
- cdp_press_key
- cdp_press_enter
- cdp_press_backspace
- cdp_press_copy
- cdp_press_paste
- cdp_press_selectall
- cdp_press_cut
- cdp_type_text
- cdp_scroll
- cdp_sendcmd

✅ **CDP 键盘** (cdp-keyboard.test.js)
- cdp_press_key
- cdp_press_enter
- cdp_press_backspace
- cdp_type_text

✅ **JS 执行** (exec-js.test.js)
- inject_auto_run_when_dom_ready_js
- inject_auto_run_when_dom_ready_js_read
- exec_js
- get_element_client_bound

✅ **窗口边界** (set-window-bounds.test.js)
- set_window_bounds (position)
- set_window_bounds (size)
- set_window_bounds (position + size)

✅ **多账户** (multi-account.test.js)
- open_window (account 0)
- open_window (account 1)
- get_window_info

✅ **错误处理** (error-handling.test.js)
- invalid window ID
- invalid tool name
- missing arguments

✅ **浮动框** (show-float-div.test.js)
- show_float_div
- show_float_div (custom content)

✅ **网络捕获** (network-capture.test.js)
- get_requests
- filter_requests
- get_console_logs

✅ **所有工具** (all-tools.test.js)
- 列出所有可用工具

✅ **REST API** (rest-api.test.js)
- GET /health
- GET /openapi.json

**总计：50+ 测试用例！**

## 测试结果

```
Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
Time:        ~5s
```

## RPC 端点

**URL:** `http://localhost:8101/rpc`

**认证:** Bearer Token (从 `~/electron-mcp-token.txt`)

**格式:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": {}
  }
}
```

## 示例

```bash
# Ping
curl -X POST http://localhost:8101/rpc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(cat ~/electron-mcp-token.txt)" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"ping","arguments":{}}}'

# 打开窗口
curl -X POST http://localhost:8101/rpc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(cat ~/electron-mcp-token.txt)" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"open_window","arguments":{"url":"https://example.com","accountIdx":0}}}'

# 获取所有窗口
curl -X POST http://localhost:8101/rpc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(cat ~/electron-mcp-token.txt)" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_windows","arguments":{}}}'
```

## 优势

- ✅ 简单直接 - HTTP POST
- ✅ 超快 - 同步返回
- ✅ 无状态 - 无需管理连接
- ✅ 易调试 - 直接用 curl
- ✅ 易扩展 - 加工具就行
