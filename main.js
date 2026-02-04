const { app, BrowserWindow } = require('electron');
const http = require('http');
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { SSEServerTransport } = require("@modelcontextprotocol/sdk/server/sse.js");
const { z } = require("zod");
const { captureSnapshot, buildSnapshotText } = require('./snapshot-utils');

const PORT = parseInt(process.env.PORT || process.argv.find(arg => arg.startsWith('--port='))?.split('=')[1] || '8101');
const transports = {};

const on_finish_load = (win)=>{

     if (!win.webContents.debugger.isAttached()) {
        try {
            win.webContents.debugger.attach('1.3');
            win.webContents.debugger.sendCommand('Network.enable');
        } catch (err) { }
    }
}
class ElectronMcpServer {
  constructor() {
    this.server = new McpServer({
      name: "electron-mcp",
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
              partition: 'persist:mcp'
            },
            ...options
          });
            win.webContents.on('did-finish-load', () => {
               on_finish_load(win)
            });

          await win.loadURL(url);
          const id = win.id;
          return {
            content: [{ type: "text", text: `Opened window with ID: ${id},wait window webContents dom-ready` }],
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
          };
        }
      }
    );
    this.registerTool("get_windows",
        `获取当前所有 Electron 窗口的实时状态列表。
  
  返回信息包括：
  - id: 窗口的唯一标识符（调用其他 invoke_window 工具时必需）。
  - title/url: 窗口当前的标题和网址。
  - debuggerIsAttached:wc.debugger.isAttached()
  - isActive/isVisible: 判断窗口是否被用户聚焦或隐藏。
  - bounds: 物理坐标 (x, y, width, height)，用于窗口布局分析。
  - 加载状态: 包括 isLoading, isDomReady, isCrashed 等。

  使用场景：
  1. 在执行截图或操作前，先通过此工具定位目标窗口的 id。
  2. 监控页面是否加载完成或崩溃。
  3. 获取窗口位置以进行精确的 UI 交互或窗口排列。`, {}, async () => {
      try {
        const windows = BrowserWindow.getAllWindows().map(w => {
          const wc = w.webContents;

          return {
            id: w.id,
            title: w.getTitle(),
            url: wc.getURL(),
            debuggerIsAttached:wc.debugger.isAttached(),
            // 1. 是否处于活动状态 (聚焦)
            isActive: w.isFocused(),
            // 2. 窗口位置和大小
            bounds: w.getBounds(), // 包含 x, y, width, height
            // 3. 加载状态相关
            isDomReady: !wc.isLoading(), // Electron 没有直接的 isDomReady 属性，通常通过非 loading 状态判断或监听 dom-ready 事件
            isLoading: wc.isLoading(),
            isDestroyed: wc.isDestroyed(),
            isCrashed: wc.isCrashed(),
            // 检查页面是否响应 (未挂起)
            isWaitingForResponse: wc.isWaitingForResponse(),
            // 窗口可见性
            isVisible: w.isVisible(),
            isMinimized: w.isMinimized(),
            isMaximized: w.isMaximized()
          };
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify(windows, null, 2)
          }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `获取窗口列表失败: ${error.message}` }],
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
        "invoke_window",
        "调用 Electron BrowserWindow 实例的方法或属性（如控制窗口大小、位置、置顶等）。注意：代码应以 'return' 返回结果，支持 await。",
        {
          win_id: z.number().optional().default(1).describe("窗口 ID"),
          code: z.string().describe("要执行的 JS 代码。例如: 'return win.getBounds()' 或 'win.maximize()'")
        },
        async ({ win_id, code }) => {
          try {
            const win = BrowserWindow.fromId(win_id);
            if (!win) throw new Error(`未找到 ID 为 ${win_id} 的窗口`);

            // 使用 AsyncFunction 注入变量
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
            const execute = new AsyncFunction("win", "webContents", code);

            // 执行代码，同时传入 win 和其关联的 webContents 方便调用
            const result = await execute(win, win.webContents);

            // 处理返回结果
            let outputText;
            if (result && typeof result === 'object') {
              // 防止 circular reference (循环引用)，BrowserWindow 对象不能直接 stringify
              outputText = JSON.stringify(result, (key, value) =>
                  typeof value === 'bigint' ? value.toString() : value, 2
              );
            } else {
              outputText = String(result);
            }

            return {
              content: [{ type: "text", text: outputText }],
            };

          } catch (error) {
            return {
              content: [{ type: "text", text: `执行失败: ${error.message}` }],
              isError: true,
            };
          }
        }
    );
    this.registerTool(
        "invoke_window_webContents",
        "调用 Electron window.webContents 的方法或属性 注意：代码应以 'return' 返回结果，支持 await。",
        {
          win_id: z.number().optional().default(1).describe("窗口 ID"),
          code: z.string().describe("要执行的 JS 代码。例如: 'return webContents.getURL()' 或 'return await webContents.capturePage()'")
        },
        async ({ win_id, code }) => {
          try {
            const win = BrowserWindow.fromId(win_id);
            if (!win) throw new Error(`未找到 ID 为 ${win_id} 的窗口`);
            const webContents = win.webContents;


            // 使用 AsyncFunction 来支持代码中的 await
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

            // 创建执行环境，将 webContents 作为参数传入
            const execute = new AsyncFunction("webContents", "win", code);

            // 执行并获取返回结果
            let result = await execute(webContents, win);

            // 序列化处理：处理 NativeImage, Buffer 或循环引用
            let outputText;
            if (result && typeof result === 'object') {
              if (result.constructor.name === 'NativeImage') {
                // 如果返回的是图片，自动转为 base64 和尺寸信息
                const size = result.getSize();
                const base64 = result.toPNG().toString('base64');
                return {
                  content: [
                    { type: "text", text: `Captured Image: ${size.width}x${size.height}` },
                    { type: "image", data: base64, mimeType: "image/png" }
                  ]
                };
              }
              // 普通对象尝试 JSON 序列化
              outputText = JSON.stringify(result, (key, value) =>
                  typeof value === 'bigint' ? value.toString() : value, 2
              );
            } else {
              outputText = String(result);
            }

            return {
              content: [{ type: "text", text: outputText }],
            };

          } catch (error) {
            return {
              content: [{ type: "text", text: `执行失败: ${error.message}\n堆栈: ${error.stack}` }],
              isError: true,
            };
          }
        }
    );

      this.registerTool(
        "invoke_window_webContents_debugger",
        "调用 Electron window.webContents.debugger CDP 的方法或属性 注意：代码应以 'return' 返回结果，支持 await。",
        {
          win_id: z.number().optional().default(1).describe("窗口 ID"),
          code: z.string().describe("要执行的 debugger CDP 代码。例如: 'return debugger.sendCommand()' 或 'return await debugger.sendCommand()'")
        },
        async ({ win_id, code }) => {
          try {
            const win = BrowserWindow.fromId(win_id);
            if (!win) throw new Error(`未找到 ID 为 ${win_id} 的窗口`);
            const webContents = win.webContents;


            // 使用 AsyncFunction 来支持代码中的 await
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

            // 创建执行环境，将 webContents 作为参数传入
            const execute = new AsyncFunction("webContents", "win", "debugger",code);

            // 执行并获取返回结果
            let result = await execute(webContents, win);

            // 序列化处理：处理 NativeImage, Buffer 或循环引用
            let outputText;
            if (result && typeof result === 'object') {
              if (result.constructor.name === 'NativeImage') {
                // 如果返回的是图片，自动转为 base64 和尺寸信息
                const size = result.getSize();
                const base64 = result.toPNG().toString('base64');
                return {
                  content: [
                    { type: "text", text: `Captured Image: ${size.width}x${size.height}` },
                    { type: "image", data: base64, mimeType: "image/png" }
                  ]
                };
              }
              // 普通对象尝试 JSON 序列化
              outputText = JSON.stringify(result, (key, value) =>
                  typeof value === 'bigint' ? value.toString() : value, 2
              );
            } else {
              outputText = String(result);
            }

            return {
              content: [{ type: "text", text: outputText }],
            };

          } catch (error) {
            return {
              content: [{ type: "text", text: `执行失败: ${error.message}\n堆栈: ${error.stack}` }],
              isError: true,
            };
          }
        }
    );



    // Snapshot tool - captures page with screenshot and element references
    this.registerTool(
      "webpage_screenshot_and_to_clipboard",
      "获取页面截屏并复制图像到剪切板",
      {
        win_id: z.number().optional().describe("Window ID to capture (defaults to 1)")
      },
      async ({ win_id }) => {
        try {
          const actualWinId = win_id || 1;
          const win = BrowserWindow.fromId(actualWinId);
          if (!win) throw new Error(`Window ${actualWinId} not found`);
          const result = await captureSnapshot(win.webContents, {
            win_id: actualWinId
          });

          return result;
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
    const transport = new SSEServerTransport("/mcp", res);
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
  
  if (url.pathname === '/mcp' && req.method === 'POST') {
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
  } else if (url.pathname === '/mcp' && req.method === 'GET') {
    // SSE endpoint
    await mcpServer.handleSSEConnection(req, res);
  } else {
    res.writeHead(404).end('Not found');
  }
});

app.whenReady().then(async () => {
  httpServer.listen(PORT, () => {
    console.log(`MCP HTTP Server running on http://localhost:${PORT}`);
    console.log(`SSE endpoint: http://localhost:${PORT}/mcp`);
  });
    
    if(process.env.TEST){
        const win = new BrowserWindow({
            width: 1000,
            height: 800,
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
              partition: 'persist:mcp'
            },
          })
        win.loadURL("http://www.google.com");
        win.webContents.on('did-finish-load', () => {
           on_finish_load(win)
        });
    }
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
