const { app, BrowserWindow } = require('electron');
const http = require('http');
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { SSEServerTransport } = require("@modelcontextprotocol/sdk/server/sse.js");
const { z } = require("zod");
const { captureSnapshot, buildSnapshotText } = require('./snapshot-utils');

let mainWindow;
const PORT = parseInt(process.env.PORT || process.argv.find(arg => arg.startsWith('--port='))?.split('=')[1] || '8101');
const transports = {};

class ElectronMcpServer {
  constructor() {
    this.server = new McpServer({
      name: "electron-mcp-llm",
      version: "1.0.0",
      description: "Electron MCP Server with browser automation tools",
    });

    this.setupTools();
  }

  registerTool(name, description, schema, handler) {
    this.server.registerTool(name, { title: name, description, inputSchema: schema }, handler);
  }

  setupTools() {
    // Window management tools
    this.registerTool(
      "open_window",
      "Open a new browser window",
      {
        url: z.string().describe("URL to open"),
        options: z.object({}).optional().describe("Window options"),
      },
      async ({ url, options }) => {
        try {
          const win = new BrowserWindow({
            width: 1000,
            height: 800,
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
            },
            ...options
          });
          await win.loadURL(url);
          const id = win.id;
          return {
            content: [{ type: "text", text: `Opened window with ID: ${id}` }],
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
          };
        }
      }
    );

    this.registerTool("get_windows", "Get list of all windows", {}, async () => {
      try {
        const windows = BrowserWindow.getAllWindows().map(w => ({
          id: w.id,
          title: w.getTitle(),
          url: w.webContents.getURL(),
        }));
        return {
          content: [{ type: "text", text: JSON.stringify(windows, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    });

    this.registerTool(
      "close_window",
      "Close a window",
      {
        win_id: z.number().describe("Window ID"),
      },
      async ({ win_id }) => {
        try {
          const win = BrowserWindow.fromId(win_id);
          if (win) {
            win.close();
            return {
              content: [{ type: "text", text: `Closed window ${win_id}` }],
            };
          }
          throw new Error(`Window ${win_id} not found`);
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
          };
        }
      }
    );

    this.registerTool(
      "load_url",
      "Load URL in window",
      {
        url: z.string().describe("URL to load"),
        win_id: z.number().optional().describe("Window ID (defaults to 1)"),
      },
      async ({ url, win_id }) => {
        try {
          const actualWinId = win_id || 1;
          const win = BrowserWindow.fromId(actualWinId);
          if (!win) throw new Error(`Window ${actualWinId} not found`);
          await win.loadURL(url);
          return {
            content: [{ type: "text", text: `Loaded URL ${url} in window ${actualWinId}` }],
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
          };
        }
      }
    );

    this.registerTool(
      "get_url",
      "Get current URL",
      {
        win_id: z.number().describe("Window ID"),
      },
      async ({ win_id }) => {
        try {
          const win = BrowserWindow.fromId(win_id);
          if (!win) throw new Error(`Window ${win_id} not found`);
          const url = win.webContents.getURL();
          return {
            content: [{ type: "text", text: url }],
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
          };
        }
      }
    );

    this.registerTool(
      "get_title",
      "Get window title",
      {
        win_id: z.number().describe("Window ID"),
      },
      async ({ win_id }) => {
        try {
          const win = BrowserWindow.fromId(win_id);
          if (!win) throw new Error(`Window ${win_id} not found`);
          const title = win.getTitle();
          return {
            content: [{ type: "text", text: title }],
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
          };
        }
      }
    );

    this.registerTool(
      "execute_javascript",
      "Execute JavaScript in window",
      {
        code: z.string().describe("JavaScript code to execute"),
        win_id: z.number().optional().describe("Window ID (defaults to 1)"),
      },
      async ({ code, win_id }) => {
        try {
          const actualWinId = win_id || 1;
          const win = BrowserWindow.fromId(actualWinId);
          if (!win) throw new Error(`Window ${actualWinId} not found`);
          const result = await win.webContents.executeJavaScript(code);
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
          };
        }
      }
    );

    this.registerTool(
      "ask_question",
      "Ask a question to Gemini LLM",
      {
        question: z.string().describe("The question to ask"),
      },
      async ({ question }) => {
        return {
          content: [{
            type: "text",
            text: `Question received: ${question}`
          }]
        };
      }
    );

    // Snapshot tool - captures page with screenshot and element references
    this.registerTool(
      "page_snapshot",
      "获取页面快照（包含截图和元素引用）",
      {
        win_id: z.number().optional().describe("Window ID to capture (defaults to 1)"),
        fullPage: z.boolean().optional().describe("Capture full page or viewport only (defaults to true)"),
        detailLevel: z.enum(["shorten", "all"]).optional().describe("Level of detail for snapshot (shorten or all, defaults to shorten)"),
        includeScreenshot: z.boolean().optional().describe("Include screenshot in response (defaults to true)"),
      },
      async ({ win_id, fullPage, detailLevel, includeScreenshot }) => {
        try {
          const actualWinId = win_id || 1;
          const win = BrowserWindow.fromId(actualWinId);
          if (!win) throw new Error(`Window ${actualWinId} not found`);

          const result = await captureSnapshot(win.webContents, {
            win_id: actualWinId,
            fullPage: fullPage !== false,
            detailLevel: detailLevel || 'shorten',
            includeScreenshot: includeScreenshot !== false,
          });

          const content = [];
          
          // Add text content with snapshot info
          const textContent = buildSnapshotText(result.snapshot, `Snapshot captured for window ${actualWinId}`, [
            `Total nodes: ${result.snapshot.totalNodes || 0}`,
            `Interactive elements: ${result.snapshot.aria?.interactive?.length || 0}`,
            `Landmarks: ${result.snapshot.aria?.landmarks?.length || 0}`,
          ]);
          content.push({ type: "text", text: textContent });

          // Add screenshot if available
          if (result.screenshot) {
            content.push({
              type: "image",
              data: result.screenshot,
              mimeType: "image/png",
            });
          }

          return {
            content,
            _meta: {
              tabId: actualWinId,
              snapshotId: result.snapshot.snapshotId,
              url: result.snapshot.url,
            },
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error capturing snapshot: ${error.message}` }],
            isError: true,
          };
        }
      }
    );

    // System tools
    this.registerTool("ping", "Check if server is responding", {}, async () => {
      return {
        content: [{ type: "text", text: "pong" }],
      };
    });
  }

  createTransport(res) {
    const transport = new SSEServerTransport("/message", res);
    transports[transport.sessionId] = transport;
    return transport;
  }

  async handleRequest(req, res) {
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

const mcpServer = new ElectronMcpServer();

const httpServer = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200).end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  if (url.pathname === '/message' && req.method === 'POST') {
    // Parse JSON body
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        req.body = JSON.parse(body);
        req.query = Object.fromEntries(url.searchParams);
        await mcpServer.handleRequest(req, res);
      } catch (error) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
          res.writeHead(500).end(JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: -32603,
              message: 'Internal server error',
            },
            id: null,
          }));
        }
      }
    });
  } else if (url.pathname === '/message' && req.method === 'GET') {
    // SSE endpoint
    await mcpServer.handleSSEConnection(req, res);
  } else {
    res.writeHead(404).end('Not found');
  }
});

app.whenReady().then(async () => {
  httpServer.listen(PORT, () => {
    console.log(`MCP HTTP Server running on http://localhost:${PORT}`);
    console.log(`SSE endpoint: http://localhost:${PORT}/message`);
  });

  mainWindow = new BrowserWindow({
    width: 1000, height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: 'persist:llm'
    }
  });
  
  mainWindow.loadURL('https://gemini.google.com/app');
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
