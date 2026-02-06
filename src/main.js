const { app: electronApp } = require('electron');
const express = require("express");
const cors = require("cors");
const http = require("http");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { SSEServerTransport } = require("@modelcontextprotocol/sdk/server/sse.js");

const app = express();
const server = http.createServer(app);

const PORT = parseInt(process.env.PORT || process.argv.find(arg => arg.startsWith('--port='))?.split('=')[1] || '8101');

app.use(cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["Content-Type"] }));
app.use(express.json({ limit: "50mb" }));

const transports = {};

const mcpServer = new McpServer({
  name: "electron-mcp",
  version: "1.0.0",
  description: "Electron MCP Server with browser automation tools",
});

function registerTool(title, description, schema, handler) {
  mcpServer.registerTool(title, { title, description, inputSchema: schema }, async (s)=>{
    try{
      return handler(s)
    }catch(e){
      console.error("Error",title,e)
      return {
          content: [{ type: "text", text: `${title} invoke error:${e},tool desc: ${description}` }],
          isError: true,
        };
    }
  });
}

require('./tools/ping')({ registerTool });
require('./tools/window-tools')({ registerTool });
require('./tools/exec-js')({ registerTool });
require('./tools/cdp-tools')({ registerTool });


// const { registerCdpMouseTools } = require('./tools/cdp-mouse-tools');
// const { registerCdpKeyboardTools } = require('./tools/cdp-keyboard-tools');
// const { registerCdpPageTools } = require('./tools/cdp-page-tools');
// const { registerCodeExecutionTools } = require('./tools/code-execution-tools');
// const { registerScreenshotTools } = require('./tools/screenshot-tools');


function createTransport(res) {
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;

  const originalSend = transport.send.bind(transport);
  transport.send = async (message) => {
    // console.log("\n========== SSE SEND ==========");
    // console.log("Session:", transport.sessionId);
    // console.log("Message:", JSON.stringify(message, null, 2));
    // console.log("============================\n");
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
    console.log("[MCP] SSE connection established:", transport.sessionId,req.url);
  } catch (error) {
    console.error("[MCP] SSE error:", error);
    res.status(500).end();
  }
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports[sessionId];

  // console.log("\n========== REQUEST ==========");
  // console.log("SessionId:", sessionId);
  // console.log("Method:", req.method);
  // console.log("Body:", JSON.stringify(req.body, null, 2));
  // console.log("============================\n");

  if (!transport) {
    res.status(400).send("No transport found for sessionId");
    return;
  }

  try {
    await transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    console.error("[MCP] Message error:", error);
    res.status(500).end(error.message);
  }
});

server.listen(PORT, () => {
  console.log(`MCP HTTP Server running on http://localhost:${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/mcp`);
});

// Electron 应用初始化
electronApp.whenReady().then(() => {
  console.log('[Electron] App ready');
});

electronApp.on('window-all-closed', () => {
  // 不退出应用，保持 HTTP 服务器运行
});

electronApp.on('activate', () => {
  // macOS 激活时不做任何操作
});
