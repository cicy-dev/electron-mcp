const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { SSEServerTransport } = require("@modelcontextprotocol/sdk/server/sse.js");
const { validateAuth } = require('./auth');

// 导入所有工具模块
const { registerWindowTools } = require('./tools/window-tools');
const { registerCdpMouseTools } = require('./tools/cdp-mouse-tools');
const { registerCdpKeyboardTools } = require('./tools/cdp-keyboard-tools');
const { registerCdpPageTools } = require('./tools/cdp-page-tools');
const { registerCodeExecutionTools } = require('./tools/code-execution-tools');
const { registerScreenshotTools } = require('./tools/screenshot-tools');
// const { registerSystemTools } = require('./tools/system-tools');

const transports = {};

class ElectronMcpServer {
  constructor() {
    this.server = new McpServer({
      name: "electron-mcp",
      version: "1.0.0",
      description: "Electron MCP Server with browser automation tools",
    });

    // 设置认证令牌
    this.authToken = process.env.MCP_AUTH_TOKEN || require('./auth').getOrGenerateToken();
    console.log('[MCP] Auth token enabled');
    console.log('[MCP] Token saved to ~/electron-mcp-token.txt');

    this.setupTools();
  }

  registerTool(name, description, schema, handler) {
    this.server.registerTool(name, { title: name, description, inputSchema: schema }, handler);
  }

  setupTools() {
    // 注册所有工具模块
    registerWindowTools(this);
    registerCdpMouseTools(this);
    registerCdpKeyboardTools(this);
    registerCdpPageTools(this);
    registerCodeExecutionTools(this);
    registerScreenshotTools(this);
    // registerSystemTools(this);
  }

  createTransport(res) {
    const transport = new SSEServerTransport("/mcp", res);
    transports[transport.sessionId] = transport;
    return transport;
  }

  // 测试环境初始化方法
  initTestTransport() {
    // 测试传输初始化逻辑（如果需要）
  }

  async handleRequest(req, res) {
    // 验证认证令牌
    if (!validateAuth(req, this.authToken)) {
      console.log('[MCP] Unauthorized request');
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Unauthorized" },
        id: null
      }));
      return;
    }

    const sessionId = req.query.sessionId;
    console.log("[MCP] handleRequest called with sessionId:", sessionId);
    console.log("[MCP] Available transports:", Object.keys(transports));
    const transport = transports[sessionId];

    try {
      if (transport) {
        console.log("[MCP] Found transport, handling POST message");
        await transport.handlePostMessage(req, res, req.body);
      } else {
        console.log("[MCP] No transport found for sessionId:", sessionId);
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end("No transport found for sessionId");
      }
    } catch (error) {
      console.error("[MCP] Request error:", error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32603, message: error.message }
      }));
    }
  }

  async handleSSEConnection(req, res) {
    // 验证认证令牌
    if (!validateAuth(req, this.authToken)) {
      console.log('[MCP] Unauthorized SSE connection');
      res.writeHead(401, { 'Content-Type': 'text/plain' });
      res.end('Unauthorized');
      return;
    }

    try {
      const transport = this.createTransport(res);
      res.on("close", () => {
        delete transports[transport.sessionId];
      });
      await this.server.connect(transport);
      console.log("[MCP] SSE connection established, sessionId:", transport.sessionId);
    } catch (error) {
      console.error("[MCP] SSE connection error:", error);
      res.status(500).end();
    }
  }
}

module.exports = { ElectronMcpServer, transports };