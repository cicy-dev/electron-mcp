# Skills List

## Available Skills

### 1. curl-rpc - MCP RPC Client Tool
**Location:** `/home/w3c_offical/projects/electron-mcp/skills/curl-rpc`

**Description:** 轻量级 MCP RPC 调用工具，用于调用 Electron MCP 服务器。

**Features:**
- 🚀 YAML 优先 - 默认 YAML 格式，节省 30-45% token
- 📝 JSON 支持 - 使用 `--json` 或 `-j` 标志
- ✅ 完善的错误处理 - 清晰的错误提示
- 🔒 Token 认证 - 自动读取认证信息

**Installation:**
```bash
cp skills/curl-rpc/curl-rpc ~/.local/bin/
chmod +x ~/.local/bin/curl-rpc
```

**Usage:**
```bash
# YAML format (default)
curl-rpc "tools/call" "name: ping"

# JSON format
curl-rpc "tools/call" --json '{"name":"ping"}'
```

**Documentation:** [curl-rpc/README.md](./curl-rpc/README.md)

---

### 2. Electron MCP Server
**Location:** `/home/w3c_offical/projects/electron-mcp/skills`

**Description:** 基于 Electron 的 MCP 服务器，提供完整的浏览器自动化和网页操作功能。

**Features:**
- 🚀 YAML 优先 - 默认 YAML 格式，节省 30-45% token
- 🔥 热重载 - 修改工具代码无需重启 Electron
- 🪟 窗口管理 - 多窗口支持，智能复用
- 👤 多账户隔离 - Cookie/Storage 完全隔离
- 🎯 CDP 操作 - 鼠标、键盘、页面控制
- 📸 截图与监控 - 网络请求、控制台日志
- 🔧 轻量工具 - curl-rpc 命令行工具

**Tools:**
- Window Management: `open_window`, `close_window`, `get_windows`, `set_window_bounds`
- CDP Operations: `cdp_click`, `cdp_type_text`, `cdp_press_paste`, `cdp_scroll`
- JavaScript Execution: `exec_js`, `inject_auto_run_when_dom_ready_js`
- Clipboard: `clipboard_write_text`, `clipboard_read_text`, `clipboard_write_image`
- Execution: `exec_shell`, `exec_python`, `exec_npm`
- Screenshot: `webpage_screenshot_and_to_clipboard`, `webpage_snapshot`
- Network: `get_requests`, `filter_requests`, `get_console_logs`

**Usage:**
```bash
# Start service
cd /home/w3c_offical/projects/electron-mcp/skills
./service.sh start

# Use curl-rpc tool
curl-rpc "tools/call" "name: ping"
curl-rpc "tools/call" "
name: open_window
arguments:
  url: https://google.com
"
```

**Documentation:**
- [README.md](./README.md) - Full documentation
- [examples/httpserver/](./examples/httpserver/) - HTTP server examples
- [docs/yaml.md](./docs/yaml.md) - YAML format guide

---

## How to Add New Skills

1. Create skill directory in `/home/w3c_offical/projects/electron-mcp/skills/`
2. Add skill documentation (README.md)
3. Update this list
4. Test the skill

## Skill Template

See `./skill/template-rpc/` for creating new skills.

