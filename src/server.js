const express = require("express");
const cors = require("cors");
const http = require("http");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { SSEServerTransport } = require("@modelcontextprotocol/sdk/server/sse.js");
const { z } = require("zod");

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["Content-Type"] }));
app.use(express.json());

const PORT = process.env.PORT || 8101;

const transports = {};

const mcpServer = new McpServer({
  name: "electron-mcp",
  version: "1.0.0",
  description: "Electron MCP Server",
});

function createTransport(res) {
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;
  return transport;
}

function registerTool(name, description, schema, handler) {
  mcpServer.registerTool(name, { title: name, description, inputSchema: schema }, handler);
}

registerTool("get_windows", "Get all windows", {}, async () => {
  return { content: [{ type: "text", text: "Window list" }] };
});

app.get("/mcp", async (req, res) => {
  try {
    const sessionId = req.query.sessionId;
    console.log("[MCP] SSE connection:", sessionId);
    
    const transport = createTransport(res);
    
    res.on("close", () => {
      console.log("[MCP] Connection closed:", transport.sessionId);
      delete transports[transport.sessionId];
    });

    await mcpServer.connect(transport);
    console.log("[MCP] SSE established:", transport.sessionId);
  } catch (error) {
    console.error("[MCP] SSE error:", error);
    res.status(500).end();
  }
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  console.log("[MCP] POST:", sessionId);
  
  const transport = transports[sessionId];
  
  if (!transport) {
    res.writeHead(404).end("No transport found");
    return;
  }

  try {
    await transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    console.error("[MCP] Message error:", error);
    res.writeHead(500).end(error.message);
  }
});

server.listen(PORT, () => {
  console.log(`MCP Server running on http://localhost:${PORT}`);
  console.log(`SSE: http://localhost:${PORT}/mcp`);
});
