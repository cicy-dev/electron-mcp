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
const { createWindow } = require("./utils/window-utils");

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

let START_URL = args.find((arg) => arg.startsWith("--url="))?.split("=")[1];
if (!START_URL) {
  const urlIndex = args.indexOf("--url");
  if (urlIndex !== -1 && args[urlIndex + 1]) {
    START_URL = args[urlIndex + 1];
  }
}

const logsDir = path.join(process.env.HOME || process.env.USERPROFILE, "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const app = express();
const server = http.createServer(app);

console.log = (...args) => log.info(...args);
console.info = (...args) => log.info(...args);
console.warn = (...args) => log.warn(...args);
console.error = (...args) => log.error(...args);
console.debug = (...args) => log.debug(...args);

app.use(
  cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["Content-Type"] })
);
app.use(express.json({ limit: "50mb" }));

const transports = {};

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

function createTransport(res) {
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;

  const originalSend = transport.send.bind(transport);
  transport.send = async (message) => {
    return originalSend(message);
  };

  return transport;
}

app.get("/mcp", async (req, res) => {
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

app.post("/messages", async (req, res) => {
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
  log.transports.file.file = path.join(logsDir, `electron-mcp-${PORT}.log`);
  log.transports.file.level = "debug";
  log.transports.file.format = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}";
  log.info(`[MCP] Log file: ${log.transports.file.file}`);
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
