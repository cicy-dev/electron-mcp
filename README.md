# Electron MCP Server

基于 Electron 的 MCP 服务器，提供完整的浏览器自动化和网页操作功能。支持多账户隔离、会话管理和丰富的 CDP 操作。

## 功能特性

### 核心工具

- `ping` - 测试 MCP 服务器连接

### 窗口管理

- `get_windows` - 获取所有窗口列表和详细信息
- `get_window_info` - 获取指定窗口详细信息
- `open_window` - 打开新窗口（支持多账户隔离）
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

### 网络监控

- `get_console_logs` - 获取控制台日志
- `get_requests` - 获取网络请求记录
- `filter_requests` - 过滤网络请求
- `get_request_detail` - 获取请求详细信息

### 截图与下载

- `webpage_screenshot_and_to_clipboard` - 截图并复制到剪贴板
- `webpage_snapshot` - 网页快照（截图+HTML）
- `session_download_url` - 下载文件到指定路径

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

# 启动并打开浏览器窗口
npm start -- --url=http://www.google.com

# 多账户模式启动（账户 0）
npm start -- --url=http://example.com --account=0

# 多账户模式启动（账户 1，隔离cookie）
npm start -- --url=http://example.com --account=1

# 组合使用
npm start -- --port=8080 --url=http://example.com --account=2
```

### 运行测试

```bash
# 运行完整测试套件
npm test

# 运行指定测试
npm test -- api.cdp-tools.test.js
```

## 多账户系统

### 账户隔离机制

每个窗口可以指定 `accountIdx` 参数，相同账户的窗口共享：

- Cookie（登录状态共享）
- LocalStorage
- SessionStorage
- 缓存数据

```javascript
// 打开账户 0 的窗口（默认）
{ "name": "open_window", "arguments": { "url": "https://google.com", "accountIdx": 0 } }

// 打开账户 1 的窗口（独立 cookie）
{ "name": "open_window", "arguments": { "url": "https://google.com", "accountIdx": 1 } }

// 打开账户 2 的窗口
{ "name": "open_window", "arguments": { "url": "https://google.com", "accountIdx": 2 } }
```

### 窗口标题格式

窗口标题会自动添加前缀：`{accountIdx}-{win_id} | `，便于识别：

```
0-1 | Loading...
0-1 | Google 首页
1-2 | Gmail - 账户 1
```

### 账户使用场景

- **账户 0**: 默认账户，用于通用浏览
- **账户 1-3**: 多账号登录场景（如多个邮箱、社交账号）
- **隔离测试**: 不同账户的独立测试环境

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

// 打开新窗口（默认账户0）
{ "name": "open_window", "arguments": { "url": "https://www.google.com" } }

// 打开新窗口（账户1）
{ "name": "open_window", "arguments": { "url": "https://mail.google.com", "accountIdx": 1 } }

// 获取窗口信息（包含账户ID）
{ "name": "get_window_info", "arguments": { "win_id": 1 } }
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

## 配置选项

### 环境变量

- `PORT`: 服务器端口 (默认: 8101)
- `NODE_ENV`: 环境模式 (test/development/production)
- `HOME` / `USERPROFILE`: 日志目录 (默认: ~/logs)

### 启动参数

```bash
# 指定端口
npm start -- --port=8102

# 启动并打开浏览器窗口
npm start -- --url=http://example.com

# 指定账户（0-3）
npm start -- --account=1

# 组合使用
npm start -- --port=8080 --url=http://example.com --account=2

# 也可以使用环境变量
PORT=8080 npm start
```

### 日志文件

日志写入 `~/logs/electron-mcp-{port}.log`，格式：

```
[2026-02-06 15:30:33.994] [info] Server listening on http://localhost:1234
[2026-02-06 15:30:33.994] [debug] [MCP] SSE connection established: xxx
[2026-02-06 15:30:34.123] [info] [MCP] Opening window with URL: http://example.com
```

日志级别：debug / info / warn / error

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

A: 查看日志文件：

```bash
tail -f ~/logs/electron-mcp-8101.log
```

### Q: 多账户窗口之间如何隔离？

A: 每个账户使用独立的 `partition`：

- 账户 0: `persist:sandbox-0`
- 账户 1: `persist:sandbox-1`
- 以此类推...

相同账户的窗口共享 cookie，不同账户完全隔离。

### Q: 窗口标题的含义？

A: 格式为 `{accountIdx}-{win_id} | {页面标题}`：

- `0-1 | Google` - 账户0，窗口ID 1
- `1-2 | Gmail` - 账户1，窗口ID 2

## API 文档

### HTTP 端点

- `GET /mcp` - 建立 SSE 连接
- `POST /messages` - 发送 MCP 消息

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
│   ├── main.js              # 主入口，Electron + MCP 服务器
│   ├── tools/               # MCP 工具实现
│   │   ├── window-tools.js  # 窗口管理工具
│   │   ├── cdp-tools.js     # CDP 操作工具
│   │   ├── exec-js.js       # JS 执行工具
│   │   └── ping.js          # 连接测试工具
│   └── utils/               # 工具函数
│       ├── window-utils.js      # 窗口创建与管理
│       ├── window-monitor.js    # 窗口监控
│       ├── cdp-utils.js         # CDP 封装
│       └── snapshot-utils.js    # 截图工具
├── tests/                   # 测试文件
└── package.json
```

### 添加新工具

1. 在 `src/tools/` 目录创建新工具文件
2. 使用 `registerTool()` 注册工具
3. 在 tests 目录添加测试用例
4. 更新 README.md

### 窗口创建示例

```javascript
const { createWindow, getWindowInfo } = require("./utils/window-utils");

// 创建窗口（账户0，默认）
const win1 = createWindow({ url: "https://google.com" }, 0);

// 创建窗口（账户1，隔离）
const win2 = createWindow({ url: "https://gmail.com" }, 1);

// 获取窗口信息
const info = getWindowInfo(win1);
// {
//   id: 1,
//   title: "0-1 | Google",
//   accountIdx: 0,
//   partition: "persist:sandbox-0",
//   ...
// }
```

## 许可证

MIT License
