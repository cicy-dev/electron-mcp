const { app, BrowserWindow } = require('electron');
const http = require('http');
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { SSEServerTransport } = require("@modelcontextprotocol/sdk/server/sse.js");
const { z } = require("zod");
const { captureSnapshot, buildSnapshotText } = require('./snapshot-utils');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const PORT = parseInt(process.env.PORT || process.argv.find(arg => arg.startsWith('--port='))?.split('=')[1] || '8101');
const transports = {};

// 令牌管理
function getOrGenerateToken() {
  const tokenPath = path.join(os.homedir(), 'electron-mcp-token.txt');
  
  try {
    // 检查是否已存在令牌
    if (fs.existsSync(tokenPath)) {
      const token = fs.readFileSync(tokenPath, 'utf8').trim();
      if (token) {
        console.log('[MCP] Using existing token from', tokenPath);
        return token;
      }
    }
    
    // 生成新令牌
    const newToken = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(tokenPath, newToken);
    console.log('[MCP] Generated new token and saved to', tokenPath);
    return newToken;
  } catch (error) {
    console.error('[MCP] Token management error:', error);
    return crypto.randomBytes(32).toString('hex'); // fallback
  }
}

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

    // 设置认证令牌
    this.authToken = process.env.MCP_AUTH_TOKEN || getOrGenerateToken();
    console.log('[MCP] Auth token enabled');
    console.log('[MCP] Token saved to ~/electron-mcp-token.txt');

    this.setupTools();
  }

  registerTool(name, description, schema, handler) {
    this.server.registerTool(name, { title: name, description, inputSchema: schema }, handler);
  }

  // 验证认证令牌
  validateAuth(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return false;
    
    const token = authHeader.replace('Bearer ', '');
    return token === this.authToken;
  }

  setupTools() {
    // Window management tools
    this.registerTool(
      "open_window",
      "打开新的浏览器窗口。用于创建新窗口访问网页、测试多窗口应用或隔离不同的浏览会话。支持自定义窗口大小和位置。",
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
        `获取当前所有 Electron 窗口的实时状态列表。返回每个窗口的详细信息，是窗口管理和自动化操作的基础工具。
  
  返回信息包括：
  - id: 窗口的唯一标识符（调用其他 invoke_window 工具时必需）
  - title/url: 窗口当前的标题和网址
  - debuggerIsAttached: 调试器是否已附加
  - isActive/isVisible: 窗口焦点和可见性状态
  - bounds: 窗口位置和大小 (x, y, width, height)
  - 加载状态: isLoading, isDomReady, isCrashed 等

  主要用途：
  - 窗口管理：获取窗口ID进行后续操作
  - 状态监控：检查窗口是否正常运行
  - 自动化测试：验证窗口状态和属性
  - 调试辅助：查看所有窗口的实时信息`, {}, async () => {
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
      "关闭指定的窗口。用于清理不需要的窗口、释放资源或结束特定的浏览会话。",
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
      "在指定窗口中加载新的URL。用于导航到不同网页、刷新页面或加载本地文件。支持所有标准URL格式。",
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
      "获取指定窗口的标题。用于确认页面加载状态、验证导航结果或获取页面信息。",
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
        `直接调用 Electron BrowserWindow 实例的方法和属性。这是窗口控制的核心工具，支持所有窗口操作。

主要用途：
- 窗口控制：移动、调整大小、最小化、最大化
- 状态管理：设置置顶、焦点、可见性
- 属性获取：获取窗口位置、大小、状态
- 高级操作：设置透明度、边框、图标等

代码执行环境：可访问 win (BrowserWindow实例) 和 webContents 对象
支持 async/await 语法，代码需以 'return' 返回结果`,
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
        `调用 Electron webContents 的方法和属性。这是网页内容操作的核心工具，用于与页面进行交互。

主要用途：
- 页面操作：截图、打印、缩放、导航
- 内容获取：获取URL、标题、源码
- 脚本执行：在页面中执行JavaScript代码
- 开发调试：获取控制台信息、性能数据
- 媒体控制：音频/视频播放控制

代码执行环境：可访问 webContents, win 对象
支持 async/await 语法，代码需以 'return' 返回结果
自动处理 NativeImage 返回为 MCP 图像格式`,
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
        "invoke_window_webContents_debugger_cdp",
        `使用 Chrome DevTools Protocol (CDP) 进行高级调试和页面控制。这是最强大的页面操作工具。

主要用途：
- 高级调试：断点、变量检查、性能分析
- DOM操作：元素查找、属性修改、事件模拟
- 网络监控：请求拦截、响应修改、性能监控
- 脚本注入：在页面任意时机执行代码
- 安全测试：绕过页面限制进行深度测试

使用方法：
1. 先调用 debuggerObj.attach('1.3') 附加调试器
2. 使用 debuggerObj.sendCommand(method, params) 发送CDP命令
3. 完成后调用 debuggerObj.detach() 分离调试器

代码执行环境：可访问 debuggerObj, webContents, win 对象
支持 async/await 语法，代码需以 'return' 返回结果`,
        {
          win_id: z.number().optional().default(1).describe("窗口 ID"),
          code: z.string().describe("要执行的 debugger CDP 代码。例如: 'return debuggerObj.sendCommand()' 或 'return await debuggerObj.sendCommand()' 注意：debugger 对象通过 debuggerObj 变量访问")
        },
        async ({ win_id, code }) => {
          try {
            const win = BrowserWindow.fromId(win_id);
            if (!win) throw new Error(`未找到 ID 为 ${win_id} 的窗口`);
            const webContents = win.webContents;


            // 使用 AsyncFunction 来支持代码中的 await
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

            // 创建执行环境，将 webContents, win, debugger 作为参数传入
            const execute = new AsyncFunction("webContents", "win", "debuggerObj", code);

            // 执行并获取返回结果
            let result = await execute(webContents, win, webContents.debugger);

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
      `捕获指定窗口的页面截图并自动复制到系统剪贴板。这是快速获取页面视觉内容的便捷工具。

主要用途：
- 快速截图：一键获取页面截图
- 文档记录：保存页面状态用于报告或文档
- 测试验证：验证页面显示效果
- 问题报告：快速获取错误页面截图
- 内容分享：将页面内容复制到其他应用

特点：
- 自动复制到剪贴板，可直接粘贴到其他应用
- 返回 MCP 图像格式，支持在对话中显示
- 包含图像尺寸信息`,
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
    this.registerTool("ping", "测试 MCP 服务器连接状态。用于验证服务器是否正常运行和响应。返回 'pong' 表示连接正常。", {}, async () => {
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
    // 验证认证令牌
    if (!this.validateAuth(req)) {
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
    if (!this.validateAuth(req)) {
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
