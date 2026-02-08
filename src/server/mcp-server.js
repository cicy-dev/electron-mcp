const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { SSEServerTransport } = require("@modelcontextprotocol/sdk/server/sse.js");
const log = require("electron-log");

const transports = new Map();

function createMcpServer() {
  return new McpServer({
    name: "electron-mcp",
    version: "1.0.0",
  });
}

function createTransport(res) {
  const transport = new SSEServerTransport("/messages", res);
  const clientId = Math.random().toString(36).substring(7);
  transports.set(clientId, transport);

  res.on("close", () => {
    transports.delete(clientId);
    log.debug(`[MCP] SSE connection closed: ${clientId}`);
  });

  return transport;
}

function setupMcpRoutes(app, mcpServer, authMiddleware) {
  app.get("/mcp", authMiddleware, async (req, res) => {
    log.debug("[MCP] SSE connection established");
    const transport = createTransport(res);
    await mcpServer.connect(transport);
  });

  app.post("/messages", authMiddleware, async (req, res) => {
    const clientId = Array.from(transports.keys())[0];
    const transport = transports.get(clientId);
    if (transport) {
      await transport.handlePostMessage(req, res);
    } else {
      res.status(400).json({ error: "No active SSE connection" });
    }
  });
}

module.exports = { createMcpServer, setupMcpRoutes };
