# Electron MCP Server

这是一个基于 Electron 的 MCP server，提供窗口管理、调试器控制和网页操作功能。

## 快速开始

### 安装依赖

```bash
# 克隆项目
git clone git@github.com:cicy-dev/electron-mcp.git
cd electron-mcp

# 安装依赖
npm install
```

### 启动服务器

```bash
# 启动 MCP 服务器 (默认端口 8101)
# 自动生成认证令牌并保存到 ~/electron-mcp-token.txt
npm start

# 或指定端口启动
npm start -- --port=8102

pkill electron
export URL=https://www.douyin.com/video/7594434780347813155 
export TEST=true 
export DISPLAY=:1
npx electron src/main.js 

----
pkill electron
export URL=https://aistudio.google.com/
export TEST=true 
export DISPLAY=:1
npx electron src/main.js  -- --port=8101


```

### 运行测试

```bash
# 运行完整测试套件
npm test

# 运行单个测试
npm test -- --testNamePattern="test name"
```

## 在 LLM IDE 中使用

### 1. Kiro CLI

**方法一：命令行添加（推荐）**

```bash
# 添加 MCP 服务器到全局配置
kiro-cli mcp add --name electron-mcp --url http://localhost:8101/mcp --force

# 手动添加认证头到配置文件
# 编辑 ~/.kiro/settings/mcp.json 添加 headers
```

**方法二：手动配置**

在 `~/.kiro/settings/mcp.json` 中添加：

```json
{
  "mcpServers": {
    "electron-mcp": {
      "url": "http://localhost:8101/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN_HERE"
      }
    }
  }
}
```

启动 Kiro CLI 后即可使用所有 MCP 工具。查看可用工具：`/mcp`



### 4. Open WebUI

在 Open WebUI 中添加 MCP 服务器：

1. 进入设置 → 连接
2. 添加 MCP 服务器：`http://localhost:8101/mcp`
3. 保存配置

### 5. Cursor IDE

在 Cursor 的设置中添加：

```json
{
  "mcp.servers": {
    "electron-mcp": {
      "url": "http://localhost:8101/mcp"
    }
  }
}
```

### 6. 通用 HTTP 客户端

任何支持 HTTP 的客户端都可以直接调用：

```bash
# 获取工具列表
curl http://localhost:8101/mcp

# 调用工具

curl -X POST http://localhost:8101/mcp?sessionId=test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(cat ~/electron-mcp-token.txt)" \
  -d '{
  "method": "tools/list",
  "params": {
  },
  "jsonrpc": "2.0",
  "id": 0
}'

# 使用认证令牌
curl -X POST http://localhost:8101/mcp?sessionId=test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(cat ~/electron-mcp-token.txt)" \
  -d '{
  "method": "tools/call",
  "params": {
    "name": "get_windows",
    "arguments": {}
  },
  "jsonrpc": "2.0",
  "id": 5
}'

# MCP 端点
curl http://localhost:8101/mcp
```

### 3. Continue.dev

在 Continue 配置文件 (`~/.continue/config.json`) 中添加：

```json
{
  "mcpServers": [
    {
      "name": "electron-mcp",
      "url": "http://localhost:8101"
    }
  ]
}
```

### 4. Open WebUI

在 Open WebUI 中添加 MCP 服务器：

1. 进入设置 → 连接
2. 添加 MCP 服务器：`http://localhost:8101`
3. 保存配置

### 5. Cursor IDE

在 Cursor 的设置中添加：

```json
{
  "mcp.servers": {
    "electron-mcp": {
      "url": "http://localhost:8101"
    }
  }
}
```

### 6. 通用 HTTP 客户端

任何支持 HTTP 的客户端都可以直接调用：

```bash
# 获取工具列表
curl http://localhost:8101/tools/list

# 调用工具
curl -X POST http://localhost:8101/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "get_windows",
    "arguments": {}
  }'
```

### 3. 其他 MCP 客户端

任何支持 MCP 协议的客户端都可以通过 HTTP 连接使用：

- **HTTP 端点**: `http://localhost:8101`
- **MCP 端点**: `http://localhost:8101/mcp`
- **SSE 连接**: `http://localhost:8101/sse`
- **工具列表**: `http://localhost:8101/tools/list`

## 功能

### 窗口管理
- `get_windows`: 获取所有窗口列表和详细信息
- `get_title`: 获取窗口标题
- `open_window`: 打开新窗口
- `close_window`: 关闭指定窗口
- `load_url`: 在窗口中加载URL

### 代码执行
- `invoke_window`: 在窗口上下文中执行代码
- `invoke_window_webContents`: 在 webContents 上下文中执行代码
- `invoke_window_webContents_debugger_cdp`: 使用 Chrome DevTools Protocol 调试器

### CDP 鼠标操作
- `cdp_click`: 使用 CDP 点击页面指定坐标
- `cdp_double_click`: 使用 CDP 双击页面指定坐标

### CDP 键盘操作
- `cdp_press_key`: 使用 CDP 按下指定按键
- `cdp_press_key_enter`: 使用 CDP 按下回车键
- `cdp_press_key_esc`: 使用 CDP 按下ESC键
- `cdp_press_key_copy`: 使用 CDP 执行复制操作 (Ctrl+C)
- `cdp_press_key_paste`: 使用 CDP 执行粘贴操作 (Ctrl+V)
- `cdp_type_text`: 使用 CDP 输入文本

### CDP 页面操作
- `cdp_scroll`: 使用 CDP 滚动页面
- `cdp_find_element`: 使用 CDP 查找页面元素
- `cdp_get_page_title`: 使用 CDP 获取页面标题
- `cdp_get_page_url`: 使用 CDP 获取当前页面URL
- `cdp_execute_script`: 使用 CDP 执行JavaScript代码

### 截图和快照
- `webpage_screenshot_and_to_clipboard`: 捕获页面截屏并复制到剪贴板

### 系统工具
- `ping`: 测试连接

## 使用示例

### 窗口管理
```javascript
// 获取所有窗口
{
  "name": "get_windows",
  "arguments": {}
}

// 打开新窗口
{
  "name": "open_window",
  "arguments": {
    "url": "https://www.google.com"
  }
}
```

### 代码执行
```javascript
// 在 webContents 中执行代码
{
  "name": "invoke_window_webContents",
  "arguments": {
    "win_id": 1,
    "code": "return webContents.getURL()"
  }
}

// 使用调试器 CDP
{
  "name": "invoke_window_webContents_debugger_cdp",
  "arguments": {
    "win_id": 1,
    "code": "debuggerObj.attach('1.3'); return await debuggerObj.sendCommand('Runtime.evaluate', { expression: '1 + 1' })"
  }
}
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

- ✅ **33 个测试用例全部通过**
- ✅ 窗口管理功能测试
- ✅ 代码执行功能测试  
- ✅ 调试器 CDP 功能测试
- ✅ **13 个 CDP 工具完整测试覆盖**
- ✅ 错误处理测试

### 测试覆盖范围
- 基础连接和工具列表
- 窗口管理 (打开、关闭、截图等)
- 代码执行 (webContents、debugger)
- CDP 鼠标操作 (点击、双击)
- CDP 键盘操作 (按键、输入文本)
- CDP 页面操作 (滚动、查找元素、执行脚本)
- 参数验证和错误处理

运行测试：
```bash
# 运行完整测试套件
npm test

# 运行 CDP 工具测试
npm test -- --testNamePattern="CDP 工具测试"

# 运行单个测试
npm test -- --testNamePattern="cdp_click"
```

## 开发

### 项目结构
```
electron-mcp/
├── main.js              # 主服务器文件
├── start-mcp.js         # 启动脚本
├── package.json         # 项目配置
├── tests/
│   └── api.test.js      # API 测试
└── README.md           # 项目文档
```

### 添加新工具
1. 在 `main.js` 中使用 `registerTool()` 注册新工具
2. 添加相应的测试用例
3. 更新文档

## 注意事项

- 调试器工具中使用 `debuggerObj` 变量访问 debugger 对象
- 支持 async/await 语法
- 所有代码执行都在安全的沙箱环境中
- 测试环境会自动启动 Electron 进程

## 许可证

MIT License
