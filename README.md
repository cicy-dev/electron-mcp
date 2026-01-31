# LLM Question MCP Server

这是一个基于 Electron 的 MCP server，可以向 LLM（如 Gemini）提问并获取回答。

## 功能

- `ask_question`: 向 LLM 发送问题并获取回答

## 安装依赖

```bash
npm install
```

## 启动方式

### 1. 直接启动 MCP Server
```bash
npm run mcp
```

### 2. 在 Kiro CLI 中使用

将以下配置添加到您的 MCP 配置文件中：

```json
{
  "mcpServers": {
    "gemni-agent": {
      "url": "http://localhost:8101"
    }
  }
}
```

## 使用示例

启动后，您可以通过 MCP 客户端调用 `ask_question` 工具：

```javascript
{
  "name": "ask_question",
  "arguments": {
    "question": "什么是人工智能？"
  }
}
```

## 注意事项

- 首次启动时会打开 Gemini 网页，需要手动登录
- 确保网络连接正常
- 问题会自动发送到 Gemini 并等待回答
