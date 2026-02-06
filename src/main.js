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
const { createLogger, withTimeout, safeExecute } = require("./utils/logger");

const logger = createLogger("Main");
const transports = new Map();

// 解析命令行参数
const args = process.argv.slice(2);
logger.debug("Command line args:", args.join(" "));

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
logger.info(`Server port: ${PORT}`);

let START_URL = args.find((arg) => arg.startsWith("--url="))?.split("=")[1];
if (!START_URL) {
  const urlIndex = args.indexOf("--url");
  if (urlIndex !== -1 && args[urlIndex + 1]) {
    START_URL = args[urlIndex + 1];
  }
}
if (START_URL) {
  logger.info(`Start URL: ${START_URL}`);
}

// 初始化日志目录
const logsDir = path.join(electronApp.getPath("home"), "logs");
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    logger.info(`Created logs directory: ${logsDir}`);
  }
} catch (error) {
  logger.error("Failed to create logs directory", error);
}

config.logsDir = logsDir;
config.logFilePath = path.join(logsDir, `electron-mcp-${config.port}.log`);

log.transports.file.resolvePathFn = () => config.logFilePath;
logger.info(`Server starting at ${new Date().toISOString()}`);
logger.info(`Log file: ${config.logFilePath}`);

const app = express();
const server = http.createServer(app);

app.use(
  cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["Content-Type"] })
);
app.use(express.json({ limit: "50mb" }));

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error("Express error", err);
  res.status(500).json({ error: "Internal server error" });
});

const mcpServer = new McpServer({
  name: "electron-mcp",
  version: "1.0.0",
  description: "Electron MCP Server with browser automation tools",
});

logger.info("MCP Server initialized");

function registerTool(title, description, schema, handler) {
  try {
    if (schema && typeof schema === "object" && !schema._def) {
      logger.warn(`Tool "${title}" has invalid schema (not a Zod object)`);
      schema = z.object({});
    }

    mcpServer.registerTool(title, { title, description, inputSchema: schema }, async (s) => {
      const startTime = Date.now();
      logger.debug(`Tool "${title}" invoked with args:`, JSON.stringify(s).substring(0, 200));
      
      try {
        const result = await withTimeout(
          handler(s),
          300000, // 5 minutes timeout
          `Tool "${title}" execution timeout`
        );
        const duration = Date.now() - startTime;
        logger.info(`Tool "${title}" completed in ${duration}ms`);
        return result;
      } catch (e) {
        const duration = Date.now() - startTime;
        logger.error(`Tool "${title}" failed after ${duration}ms`, e);
        return {
          content: [{ type: "text", text: `${title} error: ${e.message}` }],
          isError: true,
        };
      }
    });
    
    logger.debug(`Registered tool: ${title}`);
  } catch (error) {
    logger.error(`Failed to register tool "${title}"`, error);
  }
}

// 注册工具
try {
  require("./tools/ping")(registerTool);
  require("./tools/window-tools")(registerTool);
  require("./tools/exec-js")(registerTool);
  logger.info("All tools registered successfully");
} catch (error) {
  logger.error("Failed to register tools", error);
}

function createTransport(res) {
  try {
    const transport = new SSEServerTransport("/messages", res);
    transports.set(transport.sessionId, transport);
    logger.debug(`Created transport: ${transport.sessionId}`);

    const originalSend = transport.send.bind(transport);
    transport.send = async (message) => {
      try {
        return await originalSend(message);
      } catch (error) {
        logger.error(`Transport send error for ${transport.sessionId}`, error);
        throw error;
      }
    };

    return transport;
  } catch (error) {
    logger.error("Failed to create transport", error);
    throw error;
  }
}

app.get("/mcp", async (req, res) => {
  const clientIp = req.ip || req.connection.remoteAddress;
  logger.info(`SSE connection request from ${clientIp}`);
  
  try {
    const transport = createTransport(res);
    
    res.on("close", () => {
      logger.info(`SSE connection closed: ${transport.sessionId}`);
      transports.delete(transport.sessionId);
    });
    
    res.on("error", (error) => {
      logger.error(`SSE connection error: ${transport.sessionId}`, error);
      transports.delete(transport.sessionId);
    });
    
    await mcpServer.connect(transport);
    logger.info(`SSE connection established: ${transport.sessionId}`);
  } catch (error) {
    logger.error("SSE connection failed", error);
    if (!res.headersSent) {
      res.status(500).end();
    }
  }
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  logger.debug(`Message received for session: ${sessionId}`);
  
  const transport = transports.get(sessionId);

  if (!transport) {
    logger.warn(`No transport found for sessionId: ${sessionId}`);
    res.status(400).send("No transport found for sessionId");
    return;
  }

  try {
    await withTimeout(
      transport.handlePostMessage(req, res, req.body),
      60000, // 1 minute timeout
      "Message handling timeout"
    );
  } catch (error) {
    logger.error(`Error handling message for ${sessionId}`, error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

if (process.platform === "linux") {
  process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";
  electronApp.commandLine.appendSwitch("log-level", "3");
  logger.debug("Linux platform detected, security warnings disabled");
}

electronApp.whenReady().then(async () => {
  logger.info(`Server listening on http://localhost:${PORT}`);
  logger.info(`SSE endpoint: http://localhost:${PORT}/mcp`);

  if (START_URL) {
    logger.info(`Opening initial window with URL: ${START_URL}`);
    try {
      await createWindow({ url: START_URL });
      logger.info("Initial window created successfully");
    } catch (error) {
      logger.error("Failed to create initial window", error);
    }
  }

  try {
    server.listen(PORT);
    logger.info(`HTTP server started on port ${PORT}`);
  } catch (error) {
    logger.error("Failed to start HTTP server", error);
    electronApp.quit();
  }
  
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      logger.error(`Port ${PORT} is already in use`);
    } else {
      logger.error("Server error", err);
    }
    electronApp.quit();
  });
}).catch((error) => {
  logger.error("Electron app initialization failed", error);
  process.exit(1);
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
