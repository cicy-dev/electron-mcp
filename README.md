# Electron MCP Server

基于 Electron 的 MCP 服务器，提供完整的浏览器自动化和网页操作功能。

## 功能特性

### 窗口管理
- `get_windows` - 获取所有窗口列表和详细信息
- `get_window_info` - 获取指定窗口详细信息
- `open_window` - 打开新窗口
- `close_window` - 关闭窗口
- `load_url` - 加载 URL
- `get_title` - 获取窗口标题
- `control_electron_BrowserWindow` - 直接控制 BrowserWindow
- `control_electron_WebContents` - 直接控制 WebContents

### CDP 鼠标操作
- `cdp_click` - 点击指定坐标
- `cdp_dblclick` - 双击指定坐标

### CDP 键盘操作
- `cdp_press_key` - 按下任意按键
- `cdp_press_enter` - 按下回车键
- `cdp_press_backspace` - 按下退格键
- `cdp_press_copy` - 复制 (Ctrl+C)
- `cdp_press_paste` - 粘贴 (Ctrl+V)
- `cdp_press_selectall` - 全选 (Ctrl+A)
- `cdp_press_cut` - 剪切 (Ctrl+X)
- `cdp_type_text` - 输入文本

### CDP 页面操作
- `cdp_scroll` - 滚动页面
- `cdp_sendcmd` - 发送任意 CDP 命令

### JS 执行与注入
- `exec_js` - 执行 JavaScript 代码
- `inject_auto_run_when_dom_ready_js` - 注入自动执行的 JS
- `inject_auto_run_when_dom_ready_js_read` - 读取已注入的 JS
- `get_element_client_bound` - 获取元素位置和尺寸
- `show_float_div` - 显示可拖拽调试浮动框
- `del_float_div` - 删除浮动框

### 网络监控
- `get_console_logs` - 获取控制台日志
- `get_requests` - 获取网络请求记录
- `filter_requests` - 过滤网络请求
- `get_request_detail` - 获取请求详细信息

### 截图与下载
- `webpage_screenshot_and_to_clipboard` - 截图并复制到剪贴板
- `session_download_url` - 下载文件到指定路径

### 系统工具
- `ping` - 测试连接

## 快速开始

### 安装依赖

```bash
git clone git@github.com:cicy-dev/electron-mcp.git
cd electron-mcp
npm install
```

### 启动服务器

```bash
# 启动 MCP 服务器 (默认端口 8101)
npm start

# 指定端口启动
npm start -- --port=8102
```

### 运行测试

```bash
# 运行完整测试套件
npm test

# 运行指定测试
npm test -- api.cdp-tools.test.js
```

## 在 Kiro CLI 中使用

```bash
# 添加 MCP 服务器
kiro-cli mcp add --name electron-mcp --url http://localhost:8101/mcp --force
```

或手动配置 `~/.kiro/settings/mcp.json`：

```json
{
  "mcpServers": {
    "electron-mcp": {
      "url": "http://localhost:8101/mcp"
    }
  }
}
```

## 使用示例

### 窗口管理
```javascript
// 获取所有窗口
{ "name": "get_windows", "arguments": {} }

// 打开新窗口
{ "name": "open_window", "arguments": { "url": "https://www.google.com" } }
```

### CDP 操作
```javascript
// 点击页面
{ "name": "cdp_click", "arguments": { "win_id": 1, "x": 100, "y": 100 } }

// 输入文本
{ "name": "cdp_type_text", "arguments": { "win_id": 1, "text": "Hello" } }

// 滚动页面
{ "name": "cdp_scroll", "arguments": { "win_id": 1, "y": 100 } }
```

### JS 执行
```javascript
// 执行 JS 代码
{ "name": "exec_js", "arguments": { "win_id": 1, "code": "document.title" } }

// 获取元素位置
{ "name": "get_element_client_bound", "arguments": { "win_id": 1, "selector": "button" } }
```

## 安装要求

- **Node.js**: 版本 16 或更高
- **操作系统**: Windows, macOS, Linux
- **显示环境**: 需要图形界面 (GUI) 环境

## 配置选项

### 环境变量
- `PORT`: 服务器端口 (默认: 8101)
- `NODE_ENV`: 环境模式 (test/development/production)

### 启动参数
```bash
# 指定端口
npm start -- --port=8102

# 调试模式
DEBUG=* npm start
```

## 常见问题

### Q: 如何在无头环境中使用？
A: 需要虚拟显示环境，如 Xvfb：
```bash
xvfb-run -a npm start
```

### Q: 如何配置多个实例？
A: 使用不同端口启动多个实例：
```bash
npm start -- --port=8101 &
npm start -- --port=8102 &
```

### Q: 如何调试工具问题？
A: 启用调试日志：
```bash
DEBUG=electron-mcp:* npm start
```

## API 文档

### HTTP 端点
- `GET /tools/list` - 获取所有可用工具
- `POST /tools/call` - 调用指定工具
- `GET /sse` - 建立 SSE 连接

### 工具调用格式
```json
{
  "name": "tool_name",
  "arguments": {
    "param1": "value1",
    "param2": "value2"
  }
}
```

## 测试

项目包含完整的测试套件，覆盖所有 MCP 工具：

- ✅ **CDP 工具测试**: 12 个测试全部通过
- ✅ **JS 执行工具测试**: 11 个测试全部通过
- ✅ **窗口管理测试**: 完整覆盖
- ✅ **网络监控测试**: 完整覆盖

运行测试：
```bash
# 运行完整测试套件
npm test

# 运行指定测试文件
npm test -- api.cdp-tools.test.js
npm test -- api.exec-js.test.js
```

## 开发

### 项目结构
```
electron-mcp/
├── src/
│   ├── main.js              # 主服务器
│   ├── tools/               # 工具模块
│   │   ├── window-tools.js  # 窗口管理
│   │   ├── cdp-tools.js     # CDP 操作
│   │   ├── exec-js.js       # JS 执行
│   │   └── ping.js          # 连接测试
│   └── utils/               # 工具函数
│       ├── cdp-utils.js     # CDP 封装
│       ├── window-monitor.js # 窗口监控
│       └── snapshot-utils.js # 截图工具
├── tests/                   # 测试文件
└── start-mcp.js            # 启动脚本
```

### 添加新工具
1. 在对应的 tools 文件中使用 `server.registerTool()` 注册
2. 在 tests 目录添加测试用例
3. 更新 README.md

## 许可证

MIT License
