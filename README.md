# Electron MCP Server

基于 Electron 的 MCP 服务器，提供完整的浏览器自动化和网页操作功能。支持多账户隔离、会话管理、丰富的 CDP 操作，以及 **YAML/JSON 双格式支持**。

## ✨ 核心特性

- 🚀 **简化语法** - `curl-rpc tool_name key=value`，最简洁
- 📝 **YAML 优先** - 默认 YAML 格式，节省 30% token
- 🔥 **手动热重载** - `curl-rpc r-reset` 清除缓存，无需重启
- 🪟 **窗口管理** - 多窗口支持，智能复用
- 👤 **多账户隔离** - Cookie/Storage 完全隔离
- 🎯 **CDP 操作** - 鼠标、键盘、页面控制
- 📸 **截图与监控** - 网络请求、控制台日志
- 🔧 **轻量工具** - curl-rpc 命令行工具
- 🧩 **模块化架构** - 清晰的代码组织，易于维护
- ⚡ **执行工具** - Shell/Python/npm 命令执行
- 📋 **剪贴板操作** - 文本和图片的读写

## 功能特性

### 核心工具

- `ping` - 测试 MCP 服务器连接

### 系统工具

- `get_system_windows` - 获取所有系统窗口信息（支持简洁/详细模式）
- `focus_system_window` - 聚焦指定系统窗口
- `get_system_info` - 获取系统信息（CPU、内存、磁盘、负载、IP）
- `system_screenshot` - 截取全屏并保存为 JPEG
- `sys_win_screenshot` - 截取指定窗口并保存为 JPEG
- `system_window_setbound` - 设置系统窗口的位置和大小

### 窗口管理

- `get_windows` - 获取所有窗口列表和详细信息
- `get_window_info` - 获取指定窗口详细信息
- `open_window` - 打开新窗口（支持多账户隔离，默认复用窗口）
- `close_window` - 关闭窗口
- `load_url` - 加载 URL
- `get_title` - 获取窗口标题
- `set_window_bounds` - 设置窗口位置和大小
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
- `cdp_press_paste` - 粘贴 (支持 sendInputEvent/CDP/JS 三种方法)
- `cdp_press_selectall` - 全选 (Ctrl+A)
- `cdp_press_cut` - 剪切 (Ctrl+X)
- `cdp_type_text` - 输入文本

### 剪贴板操作

- `clipboard_write_text` - 写入文本到剪贴板
- `clipboard_read_text` - 读取剪贴板文本
- `clipboard_write_image` - 写入图片到剪贴板
- `test_paste_methods` - 测试三种粘贴方法

### 执行工具

- `exec_shell` - 执行 Shell 命令
- `exec_python` - 执行 Python 代码
- `exec_npm` - 执行 npm 命令

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

### 进程与端口工具

- `process-utils` - 跨平台进程和端口管理工具
  - `isPortOpen(port, host, timeout)` - 检查端口是否开放
  - `killPort(port)` - 杀死占用端口的进程
  - 支持 Windows、macOS、Linux 三大平台

## 快速开始

### 安装依赖

```bash
git clone git@github.com:cicy-dev/electron-mcp.git
cd electron-mcp
npm install
```

### 启动服务

```bash
# 启动服务
bash skills/electron-mcp-service/service.sh start

# 验证服务
curl-rpc "tools/call" "name: ping"
```

### 使用技能

```bash
# 下载抖音视频
bash skills/download-douyin-video/download-douyin-video.sh <url>
```

## Skills

### 可用技能

| 技能 | 说明 | 文档 |
|------|------|------|
| **electron-mcp-service** | 浏览器自动化服务 | [README](./skills/electron-mcp-service/README.md) |
| **download-douyin-video** | 下载抖音视频 | [README](./skills/download-douyin-video/README.md) |
| **aistudio** | AI Studio 自动化 | [README](./skills/aistudio/README.md) |
| **curl-rpc** | RPC 命令行工具 | [README](./skills/curl-rpc/README.md) |

### 创建新技能

```bash
bash skills/create-skill.sh my-skill
```

查看 [技能列表](./skills/SKILLS-LIST.md) 了解更多。

## 服务管理

```bash
bash skills/electron-mcp-service/service.sh start    # 启动
bash skills/electron-mcp-service/service.sh stop     # 停止
bash skills/electron-mcp-service/service.sh status   # 状态
bash skills/electron-mcp-service/service.sh logs     # 日志
bash skills/electron-mcp-service/service.sh restart  # 重启
```

## 启动参数

```bash
# 指定端口启动
npm start -- --port=8102

# 启动并打开浏览器窗口
npm start -- --url=http://www.google.com

# 单窗口模式（复用同一个窗口）
npm start -- --one-window

# 多账户模式启动（账户 0）
npm start -- --url=http://example.com --account=0

# 多账户模式启动（账户 1，隔离cookie）
npm start -- --url=http://example.com --account=1

# 组合使用
npm start -- --port=8080 --url=http://example.com --account=2 --one-window
```

## 运行测试

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

### 命令行工具 (curl-rpc)

快速调用 MCP 工具的轻量级命令行工具，**支持简化语法和 YAML/JSON 双格式**：

```bash
# 安装到 ~/.local/bin
curl -o ~/.local/bin/curl-rpc https://raw.githubusercontent.com/cicy-dev/electron-mcp/main/bin/curl-rpc
chmod +x ~/.local/bin/curl-rpc

# 安装依赖（YAML 支持）
pip install yq --break-system-packages

# 设置 token（首次使用）
echo "your-token-here" > ~/electron-mcp-token.txt

# 简化语法（推荐）
curl-rpc ping
curl-rpc open_window url=https://google.com
curl-rpc get_window_info win_id=1
curl-rpc set_window_bounds win_id=1 x=100 y=100 width=1280 height=720
curl-rpc cdp_click win_id=1 x=500 y=300
curl-rpc cdp_type_text win_id=1 text="Hello World"
curl-rpc close_window win_id=1

# YAML 格式（完整语法）
curl-rpc "tools/call" "
name: open_window
arguments:
  url: https://google.com
  reuseWindow: false
"

# JSON 格式
curl-rpc "tools/call" --json '{"name":"get_window_info","arguments":{"win_id":1}}'
```

**三种格式对比：**

简化语法（最简洁）：
```bash
curl-rpc open_window url=https://google.com
```

YAML 格式（推荐，复杂参数）：
```bash
curl-rpc "
name: open_window
arguments:
  url: https://google.com
  reuseWindow: false
"
```

JSON 格式（标准）：
```json
{"name":"open_window","arguments":{"url":"https://google.com","reuseWindow":false}}
```

**最佳实践：**
- 简单参数 → 简化语法
- 复杂参数/JS 代码 → YAML 格式
- YAML 比 JSON 省约 30% token

### 窗口管理

```javascript
// 获取所有窗口
{ "name": "get_windows", "arguments": {} }

// 打开新窗口（默认复用现有窗口）
{ "name": "open_window", "arguments": { "url": "https://www.google.com" } }

// 打开新窗口（强制创建新窗口）
{ "name": "open_window", "arguments": { "url": "https://www.google.com", "reuseWindow": false } }

// 打开新窗口（账户1）
{ "name": "open_window", "arguments": { "url": "https://mail.google.com", "accountIdx": 1 } }

// 获取窗口信息（包含账户ID）
{ "name": "get_window_info", "arguments": { "win_id": 1 } }

// 设置窗口位置和大小
{ "name": "set_window_bounds", "arguments": { "win_id": 1, "x": 100, "y": 100, "width": 1280, "height": 720 } }

// 只设置位置
{ "name": "set_window_bounds", "arguments": { "win_id": 1, "x": 0, "y": 0 } }

// 只设置大小
{ "name": "set_window_bounds", "arguments": { "win_id": 1, "width": 1920, "height": 1080 } }
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

### 进程与端口管理

```javascript
const { isPortOpen, killPort } = require('./src/utils/process-utils');

// 检查端口是否开放
const isOpen = await isPortOpen(8080);
console.log(`Port 8080 is ${isOpen ? 'open' : 'closed'}`);

// 检查端口（自定义超时）
const isOpen2 = await isPortOpen(8080, 'localhost', 2000);

// 杀死占用端口的进程
const result = await killPort(8080);
if (result.success) {
  console.log(`Killed process ${result.pid} on port 8080`);
} else {
  console.error(result.message);
}
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

# 单窗口模式（所有操作复用同一窗口）
npm start -- --one-window

# 指定账户（0-3）
npm start -- --account=1

# 组合使用
npm start -- --port=8080 --url=http://example.com --account=2 --one-window

# 也可以使用环境变量
PORT=8080 npm start
```

### 单窗口模式 (--one-window)

启用后，所有 `open_window` 调用都会复用现有窗口：
- 如果窗口已存在，会将其赊到前台并加载新 URL
- 如果当前 URL 与请求的 URL 相同，则刷新页面
- 返回的消息会提示使用 `get_window_info` 检查 `dom-ready` 状态

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

### OpenAPI 文档

访问 `/openapi.json` 获取完整的 OpenAPI 规范，工具按功能分组：

| Tag | 工具类型 |
|-----|------|
| System | `ping` |
| Window | 窗口管理工具 |
| Input | CDP 输入操作 |
| CDP | CDP 任意命令 |
| Network | 网络监控工具 |
| Console | 控制台日志 |
| Screenshot | 截图工具 |
| JavaScript | JS 执行工具 |

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
│   ├── main.js              # 主入口（模块化）
│   ├── config.js            # 配置文件
│   ├── server/              # 服务器模块
│   │   ├── electron-setup.js    # Electron 配置
│   │   ├── args-parser.js       # 参数解析
│   │   ├── logging.js           # 日志系统
│   │   ├── express-app.js       # Express 应用
│   │   ├── mcp-server.js        # MCP 服务器
│   │   └── tool-registry.js     # 工具注册
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
├── tests/                   # 核心测试
│   ├── rpc/                 # RPC 基础测试
│   └── mcp/                 # MCP 协议测试
├── skills/                  # 功能技能模块
│   ├── window-management/   # 窗口管理技能
│   ├── cdp-automation/      # CDP 自动化技能
│   ├── javascript/          # JavaScript 执行技能
│   ├── network/             # 网络监控技能
│   └── template-rpc/        # 技能模板
├── changelog/               # 变更日志
├── task/                    # 任务文档
├── bin/                     # 命令行工具
│   └── curl-rpc            # YAML/JSON RPC 客户端
└── package.json
```

### 热重载开发

修改 `src/tools/` 或 `src/utils/` 中的代码后，**无需重启 Electron**，使用 `r-reset` 工具清除缓存即可。

```bash
# 启动服务
bash skills/electron-mcp-service/service.sh start

# 修改工具代码
vim src/tools/ping.js

# 清除缓存
curl-rpc r-reset

# 测试新代码
curl-rpc ping
```

**工作原理：**
- `r-reset` 清除 `require.cache` 中的 `/tools/` 和 `/utils/` 模块
- 下次调用工具时自动重新加载最新代码
- 无需重启 Electron 进程

**适用范围：**
- ✅ `src/tools/` - 工具实现
- ✅ `src/utils/` - 工具函数
- ❌ `src/main.js` - 需要重启
- ❌ `src/server/` - 需要重启

### 添加新工具

1. 在 `src/tools/` 目录创建新工具文件
2. 使用 `registerTool()` 注册工具，支持指定 tag
3. 在 `tests/` 目录添加测试用例
4. 更新 README.md

```javascript
// 工具注册示例
registerTool(
  "my_tool",
  "工具描述",
  z.object({
    win_id: z.number().optional().default(1).describe("窗口 ID"),
    param: z.string().describe("参数描述")
  }),
  async ({ win_id, param }) => {
    // 工具实现
    return { content: [{ type: "text", text: "result" }] };
  },
  { tag: "MyCategory" }  // 可选: 指定 OpenAPI 分组
);
```

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

## 文档

- [YAML 支持](docs/yaml.md) - YAML/JSON 双格式说明
- [API 文档](http://localhost:8101/docs) - REST API 文档
- [OpenAPI 规范](openapi.yml) - OpenAPI 3.0 规范

## 许可证

MIT License
