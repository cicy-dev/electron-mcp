# RPC Tools Tests

测试所有 RPC 工具端点。

## 快速开始

```bash
# 1. 启动服务
cd ../..
node mcp-server.js start --port=8101 -r

# 2. 运行测试
cd tests/rpc
npm test
```

## 测试覆盖

✅ **Ping** (1/1)
- ping

✅ **Window Tools** (4/4)
- open_window
- get_windows
- get_window_info
- close_window

✅ **CDP Tools** (3/3)
- cdp_click
- webpage_screenshot_and_to_clipboard
- webpage_snapshot

✅ **Exec JS** (2/2)
- exec_js (simple)
- exec_js (complex)

**总计：10/10 测试通过！**

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
