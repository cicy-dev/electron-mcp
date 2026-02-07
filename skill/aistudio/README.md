# AI Studio Skill for Electron MCP

AI Studio 技能模块，通过调用 Electron MCP 服务实现 AI Studio 的自动化操作。

## 功能特性

- ✅ 调用 electron-mcp 服务（端口可配置）
- ✅ 打开 AI Studio 窗口
- ✅ 多账户支持
- ✅ 窗口管理（打开/关闭/查询）

## 快速开始

### 1. 启动 electron-mcp 服务

```bash
cd /home/w3c_offical/Desktop/branch/electron-mcp-feat-20260207-aistudio-skill
node mcp-server.js start --port=8101
```

### 2. 运行测试（推荐）

**测试即文档 - 最直接的使用方式！**

```bash
cd skill/aistudio

# 运行所有测试（完整功能演示）
npm test

# 运行特定测试
npm test -- --testNamePattern="should open"
npm test -- --testNamePattern="should get all windows"
```

### 3. 在你的代码中使用

```javascript
const AIStudioTools = require('./tools/aistudio-tools');

async function myApp() {
  const tools = new AIStudioTools(8101);
  
  // 打开 AI Studio（账户 0）
  const windowId = await tools.openAIStudio(0);
  
  // 获取所有窗口
  const windows = await tools.client.getWindows();
  
  // 关闭窗口
  await tools.closeAIStudio();
  
  // 清理连接
  tools.client.close();
}
```

## 使用示例

### 查看测试代码

所有 API 使用示例都在测试文件中：`tests/aistudio.test.js`

### 配置

编辑 `config.js` 或设置环境变量：

```bash
# Electron MCP 服务端口（默认 8101）
export ELECTRON_MCP_PORT=8101

# Electron MCP 服务地址（默认 localhost）
export ELECTRON_MCP_HOST=localhost

# AI Studio URL（默认 https://aistudio.google.com）
export AISTUDIO_URL=https://aistudio.google.com
```

### 基本使用

参考 `tests/aistudio.test.js` 中的完整示例，或运行：

```bash
npm test  # 查看所有功能演示
```

## API 文档

### ElectronMCPClient

MCP 客户端封装类。

#### 构造函数

```javascript
new ElectronMCPClient(port = 8101, host = 'localhost')
```

#### 方法

- `callTool(toolName, args)` - 调用 MCP 工具
- `openWindow(url, accountIdx)` - 打开窗口
- `getWindows()` - 获取所有窗口
- `closeWindow(winId)` - 关闭窗口

### AIStudioTools

AI Studio 工具集。

#### 构造函数

```javascript
new AIStudioTools(mcpPort, mcpHost)
```

#### 方法

- `openAIStudio(accountIdx)` - 打开 AI Studio 窗口
- `closeAIStudio()` - 关闭 AI Studio 窗口
- `getWindowId()` - 获取当前窗口 ID

## 测试

```bash
# 确保 electron-mcp 服务正在运行
npm start  # 在主项目目录

# 运行测试
cd skill/aistudio
npm test
```

## 配置选项

### config.js

```javascript
{
  mcpPort: 8101,              // Electron MCP 服务端口
  mcpHost: 'localhost',       // Electron MCP 服务地址
  aistudioUrl: 'https://aistudio.google.com',  // AI Studio URL
  defaultAccountIdx: 0,       // 默认账户索引
}
```

## 依赖

- `axios` - HTTP 客户端

## 许可证

MIT
