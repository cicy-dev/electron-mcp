const { app: electronApp, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");
const log = require("electron-log");
const express = require("express");
const cors = require("cors");
const http = require("http");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { SSEServerTransport } = require("@modelcontextprotocol/sdk/server/sse.js");
const { z } = require("zod");
const { config } = require("./config");
const { createWindow } = require("./utils/window-utils");
const { AuthManager } = require("./utils/auth");

// 捕获未处理的异常，防止弹窗
process.on('uncaughtException', (error) => {
  log.error('[Uncaught Exception]', error);
  console.error('[Uncaught Exception]', error);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('[Unhandled Rejection]', reason);
  console.error('[Unhandled Rejection]', reason);
});

const transports = new Map();

const args = process.argv.slice(2);
let PORT = args.find((arg) => arg.startsWith("--port="))?.split("=")[1];
if (!PORT) {
  const portIndex = args.indexOf("--port");
  if (portIndex !== -1 && args[portIndex + 1]) {
    PORT = args[portIndex + 1];
  }
}
if (!PORT) {
  PORT = process.env.PORT;
}
PORT = parseInt(PORT) || 8101;
config.port = PORT;

let START_URL = args.find((arg) => arg.startsWith("--url="))?.split("=")[1];
if (!START_URL) {
  const urlIndex = args.indexOf("--url");
  if (urlIndex !== -1 && args[urlIndex + 1]) {
    START_URL = args[urlIndex + 1];
  }
}

const logsDir = path.join(electronApp.getPath("home"), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
config.logsDir = logsDir;
config.logFilePath = path.join(logsDir, `electron-mcp-${config.port}.log`);

log.transports.file.resolvePathFn = () => config.logFilePath;

// 配置日志格式
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
log.transports.console.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';

// 包装 log 方法以添加调用位置信息
const originalInfo = log.info.bind(log);
const originalError = log.error.bind(log);
const originalWarn = log.warn.bind(log);
const originalDebug = log.debug.bind(log);

const getCallerInfo = () => {
  const stack = new Error().stack;
  const stackLines = stack.split('\n');
  for (let i = 3; i < stackLines.length; i++) {
    const line = stackLines[i];
    if (line.includes('/src/') || line.includes('/tools/')) {
      // 匹配格式: "at functionName (path:line:col)" 或 "at path:line:col"
      const matchWithFunc = line.match(/at\s+(\S+)\s+\((.+):(\d+):\d+\)/);
      const matchNoFunc = line.match(/at\s+(.+):(\d+):\d+/);
      
      if (matchWithFunc) {
        const funcName = matchWithFunc[1];
        const fullPath = matchWithFunc[2];
        const fileName = fullPath.split('/').pop();
        const lineNumber = matchWithFunc[3];
        return `(${fileName}:${funcName}:${lineNumber})`;
      } else if (matchNoFunc) {
        const fullPath = matchNoFunc[1];
        const fileName = fullPath.split('/').pop();
        const lineNumber = matchNoFunc[2];
        return `(${fileName}:${lineNumber})`;
      }
    }
  }
  return '';
};

log.info = (...args) => originalInfo(...args, getCallerInfo());
log.error = (...args) => originalError(...args, getCallerInfo());
log.warn = (...args) => originalWarn(...args, getCallerInfo());
log.debug = (...args) => originalDebug(...args, getCallerInfo());

log.info(`[MCP] Server starting at ${new Date().toISOString()}`);

// 初始化认证管理器
const authManager = new AuthManager();

const app = express();
const server = http.createServer(app);

app.use(
  cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["Content-Type", "Authorization"] })
);
app.use(express.json({ limit: "50mb" }));

// 认证中间件
function authMiddleware(req, res, next) {
  if (!authManager.validateAuth(req)) {
    log.warn("[MCP] Unauthorized access attempt:", req.url);
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

const mcpServer = new McpServer({
  name: "electron-mcp",
  version: "1.0.0",
  description: "Electron MCP Server with browser automation tools",
});

function registerTool(title, description, schema, handler) {
  if (schema && typeof schema === "object" && !schema._def) {
    log.warn(`Tool "${title}" has invalid schema (not a Zod object):`, schema);
    schema = z.object({});
  }

  mcpServer.registerTool(title, { title, description, inputSchema: schema }, async (s) => {
    try {
      return handler(s);
    } catch (e) {
      log.error("Error", title, e);
      return {
        content: [{ type: "text", text: `${title} invoke error:${e},tool desc: ${description}` }],
        isError: true,
      };
    }
  });
}

require("./tools/ping")(registerTool);
require("./tools/window-tools")(registerTool);
require("./tools/cdp-tools")(registerTool);
require("./tools/exec-js")(registerTool);

function createTransport(res) {
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;

  const originalSend = transport.send.bind(transport);
  transport.send = async (message) => {
    return originalSend(message);
  };

  return transport;
}

app.get("/mcp", authMiddleware, async (req, res) => {
  try {
    const transport = createTransport(res);
    res.on("close", () => {
      delete transports[transport.sessionId];
    });
    await mcpServer.connect(transport);
    log.info("[MCP] SSE connection established:", transport.sessionId, req.url);
  } catch (error) {
    log.error("[MCP] SSE error:", error);
    res.status(500).end();
  }
});

app.post("/messages", authMiddleware, async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports[sessionId];

  if (!transport) {
    res.status(400).send("No transport found for sessionId");
    return;
  }

  try {
    await transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    log.error("[MCP] Error handling message:", error);
    res.status(500).json({ error: error.message });
  }
});

if (process.platform === "linux") {
  process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";
  electronApp.commandLine.appendSwitch("log-level", "3");
}

electronApp.whenReady().then(() => {
  log.info(`[MCP] Log file: ${config.logFilePath}`);
  log.info(`[MCP] Server listening on http://localhost:${PORT}`);
  log.info(`[MCP] SSE endpoint: http://localhost:${PORT}/mcp`);

  if (START_URL) {
    log.info(`[MCP] Opening window with URL: ${START_URL}`);
    createWindow({ url: START_URL });
  }

  server.listen(PORT).on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      log.error(`[MCP] Port ${PORT} is already in use`);
    } else {
      log.error("[MCP] Server error:", err);
    }
    electronApp.quit();
  });
});

electronApp.on("window-all-closed", () => {
  if (!START_URL) {
    electronApp.quit();
  }
});

function cleanup() {
  log.info("[MCP] Shutting down...");
  server.close(() => {
    log.info("[MCP] HTTP server closed");
    electronApp.quit();
  });
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
