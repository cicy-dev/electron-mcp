const { app: electronApp } = require("electron");
const http = require("http");
const log = require("electron-log");
const { z } = require("zod");
const { config } = require("./config");
const { createWindow } = require("./utils/window-utils");
const { AuthManager } = require("./utils/auth");
const { setupElectronFlags, setupErrorHandlers } = require("./server/electron-setup");
const { parseArgs } = require("./server/args-parser");
const { setupLogging, wrapLogger } = require("./server/logging");
const { createExpressApp } = require("./server/express-app");
const { createMcpServer, setupMcpRoutes } = require("./server/mcp-server");
const { registerTool } = require("./server/tool-registry");

// Setup
setupElectronFlags();
setupErrorHandlers();

// Parse arguments
const { PORT, START_URL, oneWindow } = parseArgs();
config.port = PORT;
if (oneWindow) {
  config.oneWindow = true;
  log.info("[MCP] Single window mode enabled");
}

// Setup logging
setupLogging(config);
wrapLogger();

log.info("[MCP] Server starting at", new Date().toISOString());

// Initialize auth
const authManager = new AuthManager();
const authMiddleware = (req, res, next) => {
  if (!authManager.validateAuth(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// Create servers
const mcpServer = createMcpServer();
const app = createExpressApp(authMiddleware);
const tools = {};

// Register tools
const toolModules = [
  require("./tools/ping"),
  require("./tools/window-tools"),
  require("./tools/cdp-tools"),
  require("./tools/exec-js"),
  require("./tools/clipboard-tools"),
  require("./tools/exec-tools"),
];

toolModules.forEach((module) => {
  module((title, description, schema, handler, options) => {
    registerTool(mcpServer, tools, title, description, schema, handler, options);
  });
});

// Setup MCP routes
setupMcpRoutes(app, mcpServer, authMiddleware);

// RPC endpoint with hot reload
app.post("/rpc/tools/call", authMiddleware, async (req, res) => {
  const { name, arguments: args } = req.body;
  try {
    // Clear require cache for hot reload
    Object.keys(require.cache).forEach(key => {
      if (key.includes('/tools/') || key.includes('/utils/')) {
        delete require.cache[key];
      }
    });
    
    // Re-load tool modules and find handler
    const toolModules = [
      require("./tools/ping"),
      require("./tools/window-tools"),
      require("./tools/cdp-tools"),
      require("./tools/exec-js"),
      require("./tools/clipboard-tools"),
      require("./tools/exec-tools"),
    ];
    
    let handler = null;
    let schema = null;
    
    toolModules.forEach((module) => {
      module((title, description, toolSchema, toolHandler, options) => {
        if (title === name) {
          handler = toolHandler;
          schema = toolSchema;
        }
      });
    });
    
    if (!handler) {
      throw new Error(`Tool '${name}' not found`);
    }
    
    const validatedArgs = schema.parse(args || {});
    const result = await handler(validatedArgs);
    
    // Support YAML response
    const accept = req.headers.accept || "application/json";
    if (accept.includes("application/yaml") || accept.includes("text/yaml")) {
      const yaml = require("js-yaml");
      res.type("yaml").send(yaml.dump({ result }));
    } else {
      res.json({ result });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/rpc/tools", authMiddleware, (req, res) => {
  const accept = req.headers.accept || "application/json";
  const allTools = Object.values(tools).flat();
  
  if (accept.includes("application/yaml") || accept.includes("text/yaml")) {
    const yaml = require("js-yaml");
    res.type("yaml").send(yaml.dump({ tools: allTools }));
  } else {
    res.json({ tools: allTools });
  }
});

// Start server
const server = http.createServer(app);

electronApp.whenReady().then(() => {
  electronApp.commandLine.appendSwitch("remote-debugging-port", "9222");
  log.info("[MCP] Remote debugging enabled on port 9222");

  server.listen(PORT, () => {
    log.info(`[MCP] Log file: ${config.logFilePath}`);
    log.info(`[MCP] Server listening on http://localhost:${PORT}`);
    log.info(`[MCP] SSE endpoint: http://localhost:${PORT}/mcp`);
    log.info(`[MCP] REST API docs: http://localhost:${PORT}/docs`);
    log.info(`[MCP] Remote debugger: http://localhost:9222`);

    if (START_URL) {
      createWindow({ url: START_URL }, 0);
    }
  });
});

electronApp.on("window-all-closed", () => {
  // Keep app running
});

function cleanup() {
  log.info("[MCP] Server shutting down");
  server.close();
  electronApp.quit();
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
