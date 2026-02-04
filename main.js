const { app, BrowserWindow } = require('electron');
const http = require('http');
const { spawn, exec } = require('child_process');
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { SSEServerTransport } = require("@modelcontextprotocol/sdk/server/sse.js");
const { z } = require("zod");
const { captureSnapshot } = require('./snapshot-utils');

let mainWindow;
const PORT = parseInt(process.env.PORT || process.argv.find(arg => arg.startsWith('--port='))?.split('=')[1] || '8101');
const transports = {};

const windowData = {};
const cdpDebuggers = new Map();

class CDPManager {
  constructor() {
    this.debuggers = new Map();
  }

  async ensureAttached(winId) {
    const win = BrowserWindow.fromId(winId);
    if (!win || win.isDestroyed()) {
      throw new Error(`Window ${winId} not found`);
    }

    const wc = win.webContents;

    if (!wc.debugger.isAttached()) {
      wc.debugger.attach('1.3');
    }

    if (!this.debuggers.has(winId)) {
      this.debuggers.set(winId, wc.debugger);
      this.setupEventListeners(winId, wc);
    }

    return wc.debugger;
  }

  setupEventListeners(winId, wc) {
    wc.debugger.on('message', (event, method, params) => {
      if (!windowData[winId]) {
        windowData[winId] = { consoleMessages: [], networkRequests: [] };
      }

      if (method === 'Console.messageAdded') {
        windowData[winId].consoleMessages.push(params.message);
      }

      if (method === 'Network.requestWillBeSent') {
        windowData[winId].networkRequests.push(params.request);
      }

      if (method === 'Network.responseReceived') {
        windowData[winId].networkRequests.push(params.response);
      }
    });
  }

  async detach(winId) {
    const debugger_ = this.debuggers.get(winId);
    if (debugger_) {
      debugger_.detach();
      this.debuggers.delete(winId);
    }
  }

  getData(winId) {
    if (!windowData[winId]) {
      windowData[winId] = { consoleMessages: [], networkRequests: [] };
    }
    return windowData[winId];
  }

  clearConsole(winId) {
    if (windowData[winId]) {
      windowData[winId].consoleMessages = [];
    }
  }

  clearNetwork(winId) {
    if (windowData[winId]) {
      windowData[winId].networkRequests = [];
    }
  }
}

class ElectronMcpServer {
  constructor() {
    this.cdpManager = new CDPManager();
    this.server = new McpServer({
      name: "electron-mcp-llm",
      version: "1.0.0",
      description: "Electron MCP Server with browser automation tools",
    });

    this.setupTools();
    this.setupWindowListeners();
  }

  registerTool(name, description, schema, handler) {
    this.server.registerTool(name, { description, inputSchema: schema }, handler);
  }

  setupWindowListeners() {
    app.on('browser-window-created', (event, win) => {
      const winId = win.id;
      windowData[winId] = { consoleMessages: [], networkRequests: [] };
    });
  }

  async ensureCDP(winId) {
    return await this.cdpManager.ensureAttached(winId);
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
      "cdp_reload",
      `刷新页面，可选择是否忽略缓存\n\n**参数：**\n- \`win_id\` (number, 可选): 窗口 ID，默认 1\n- \`ignoreCache\` (boolean, 可选): 是否忽略缓存，默认 false\n- \`clearConsole\` (boolean, 可选): 是否清除控制台日志，默认 false\n- \`clearNetwork\` (boolean, 可选): 是否清除网络请求记录，默认 false\n\n**使用示例：**\n\`\`\`\n# 普通刷新\ncdp_reload({})\n\n# 强制刷新（忽略缓存）\ncdp_reload({ ignoreCache: true })\n\n# 刷新并清除所有记录\ncdp_reload({\n  ignoreCache: true,\n  clearConsole: true,\n  clearNetwork: true\n})\n\`\`\``,
      {
        win_id: z.number().optional().default(1).describe("窗口 ID"),
        ignoreCache: z.boolean().optional().default(false).describe("忽略缓存"),
        clearConsole: z.boolean().optional().default(false).describe("清除控制台日志"),
        clearNetwork: z.boolean().optional().default(false).describe("清除网络请求记录")
      },
      async ({ win_id, ignoreCache, clearConsole, clearNetwork }) => {
        try {
          await this.ensureCDP(win_id);
          const wc = BrowserWindow.fromId(win_id).webContents;

          // 清除日志和网络记录（如果需要）
          if (clearConsole) {
            this.cdpManager.clearConsole(win_id);
          }
          if (clearNetwork) {
            this.cdpManager.clearNetwork(win_id);
          }

          // Enable Page domain
          await wc.debugger.sendCommand('Page.enable');

          await wc.debugger.sendCommand('Page.reload', {
            ignoreCache
          });

          let message = `Page reloaded for window ${win_id}`;
          if (clearConsole) message += ' (console cleared)';
          if (clearNetwork) message += ' (network cleared)';
          if (ignoreCache) message += ' (cache ignored)';

          return {
            content: [{ type: "text", text: message }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `CDP Reload Error: ${error.message}` }],
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

    // CDP Mouse tools
    this.registerTool(
      "cdp_click",
      `使用 CDP 发送鼠标点击事件，比普通模拟更难被检测\n\n**自动管理：** 此工具会自动为指定窗口启用 CDP Debugger\n\n**参数：**\n- \`win_id\` (number, 可选): 窗口 ID，默认 1\n- \`x\` (number, 必需): X 坐标（相对于页面视口）\n- \`y\` (number, 必需): Y 坐标（相对于页面视口）\n- \`button\` (string, 可选): 按钮类型 ['left', 'right', 'middle']，默认 'left'\n- \`clickCount\` (number, 可选): 点击次数，默认 1\n\n**返回值：** 成功返回 \"CDP Clicked at {x}, {y} with {button}\"\n\n**使用示例：**\n\`\`\`\n# 左键点击\ncdp_click({ x: 500, y: 300 })\n\n# 右键点击\ncdp_click({ x: 500, y: 300, button: \"right\" })\n\n# 双击\ncdp_click({ x: 500, y: 300, clickCount: 2 })\n\n# 指定窗口\ncdp_click({ win_id: 2, x: 100, y: 200 })\n\`\`\`\n\n**CDP 命令：** Input.dispatchMouseEvent`,
      {
        win_id: z.number().optional().default(1).describe("窗口 ID"),
        x: z.number().describe("X 坐标"),
        y: z.number().describe("Y 坐标"),
        button: z.enum(["left", "right", "middle"]).optional().default("left").describe("按钮"),
        clickCount: z.number().optional().default(1).describe("点击次数")
      },
      async ({ win_id, x, y, button, clickCount }) => {
        try {
          await this.ensureCDP(win_id);
          const wc = BrowserWindow.fromId(win_id).webContents;

          // 完整的点击序列：按下 -> 弹起
          await wc.debugger.sendCommand('Input.dispatchMouseEvent', {
            type: 'mousePressed',
            x, y, button, clickCount
          });

          await wc.debugger.sendCommand('Input.dispatchMouseEvent', {
            type: 'mouseReleased',
            x, y, button, clickCount
          });

          return { content: [{ type: "text", text: `CDP Clicked at ${x}, ${y} with ${button}` }] };
        } catch (error) {
          return { content: [{ type: "text", text: `CDP Error: ${error.message}` }], isError: true };
        }
      }
    );

    this.registerTool(
      "cdp_mouse_move",
      `将鼠标移动到指定位置，可设置移动类型\n\n**自动管理：** 此工具会自动为指定窗口启用 CDP Debugger\n\n**参数：**\n- \`win_id\` (number, 可选): 窗口 ID，默认 1\n- \`x\` (number, 必需): 目标 X 坐标\n- \`y\` (number, 必需): 目标 Y 坐标\n- \`type\` (string, 可选): 移动类型 ['move', 'leave', 'enter']，默认 'move'\n\n**使用示例：**\n\`\`\`\n# 移动到指定位置\ncdp_mouse_move({ x: 800, y: 600 })\n\n# 离开视口\ncdp_mouse_move({ x: 0, y: 0, type: \"leave\" })\n\n# 进入视口\ncdp_mouse_move({ x: 100, y: 100, type: \"enter\" })\n\`\`\`\n\n**CDP 命令：** Input.dispatchMouseEvent`,
      {
        win_id: z.number().optional().default(1).describe("窗口 ID"),
        x: z.number().describe("目标 X"),
        y: z.number().describe("目标 Y"),
        type: z.enum(["move", "leave", "enter"]).optional().default("move").describe("移动类型")
      },
      async ({ win_id, x, y, type }) => {
        try {
          await this.ensureCDP(win_id);
          const wc = BrowserWindow.fromId(win_id).webContents;

          await wc.debugger.sendCommand('Input.dispatchMouseEvent', {
            type: type === 'leave' ? 'mouseLeave' : 'mouseMoved',
            x, y
          });

          return { content: [{ type: "text", text: `CDP Mouse moved to ${x}, ${y} (${type})` }] };
        } catch (error) {
          return { content: [{ type: "text", text: `CDP Error: ${error.message}` }], isError: true };
        }
      }
    );

    this.registerTool(
      "cdp_mouse_drag",
      `执行鼠标拖拽操作，从起点拖拽到终点\n\n**自动管理：** 此工具会自动为指定窗口启用 CDP Debugger\n\n**参数：**\n- \`win_id\` (number, 可选): 窗口 ID，默认 1\n- \`x1\` (number, 必需): 起始 X\n- \`y1\` (number, 必需): 起始 Y\n- \`x2\` (number, 必需): 终点 X\n- \`y2\` (number, 必需): 终点 Y\n- \`steps\` (number, 可选): 移动步数，默认 10\n\n**使用示例：**\n\`\`\`\n# 拖拽元素\ncdp_mouse_drag({ x1: 100, y1: 200, x2: 300, y2: 400 })\n\n# 指定窗口和步数\ncdp_mouse_drag({ win_id: 2, x1: 50, y1: 50, x2: 150, y2: 150, steps: 20 })\n\`\`\`\n\n**CDP 命令：** Input.dispatchMouseEvent`,
      {
        win_id: z.number().optional().default(1).describe("窗口 ID"),
        x1: z.number().describe("起始 X"),
        y1: z.number().describe("起始 Y"),
        x2: z.number().describe("终点 X"),
        y2: z.number().describe("终点 Y"),
        steps: z.number().optional().default(10).describe("移动步数")
      },
      async ({ win_id, x1, y1, x2, y2, steps }) => {
        try {
          await this.ensureCDP(win_id);
          const wc = BrowserWindow.fromId(win_id).webContents;

          // 按下
          await wc.debugger.sendCommand('Input.dispatchMouseEvent', {
            type: 'mousePressed',
            x: x1, y: y1, button: 'left', clickCount: 1
          });

          // 移动序列
          for (let i = 0; i <= steps; i++) {
            const x = x1 + (x2 - x1) * (i / steps);
            const y = y1 + (y2 - y1) * (i / steps);
            
            await wc.debugger.sendCommand('Input.dispatchMouseEvent', {
              type: 'mouseMoved',
              x, y
            });
          }

          // 释放
          await wc.debugger.sendCommand('Input.dispatchMouseEvent', {
            type: 'mouseReleased',
            x: x2, y: y2, button: 'left', clickCount: 1
          });

          return { content: [{ type: "text", text: `CDP Dragged from (${x1}, ${y1}) to (${x2}, ${y2})` }] };
        } catch (error) {
          return { content: [{ type: "text", text: `CDP Error: ${error.message}` }], isError: true };
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
        "调用 Electron window.webContents 的方法或属性。现已支持 debugger 指令,注意：代码应以 'return' 返回结果，支持 await。",
        {
          win_id: z.number().optional().default(1).describe("窗口 ID"),
          code: z.string().describe("要执行的 JS 代码。例如: 'return webContents.getURL()' 或 'return await webContents.capturePage()'")
        },
        async ({ win_id, code }) => {
          try {
            const win = BrowserWindow.fromId(win_id);
            if (!win) throw new Error(`未找到 ID 为 ${win_id} 的窗口`);
            const webContents = win.webContents;

            // 自动 attach 调试器（如果尚未 attach）
            if (!webContents.debugger.isAttached()) {
              webContents.debugger.attach('1.3');
            }

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

    // CDP Keyboard tools
    this.registerTool(
      "cdp_keyboard_type",
      `发送键盘文本输入事件，支持特殊字符\n\n**自动管理：** 此工具会自动为指定窗口启用 CDP Debugger\n\n**参数：**\n- \`win_id\` (number, 可选): 窗口 ID，默认 1\n- \`text\` (string, 必需): 要输入的文本\n- \`delay\` (number, 可选): 每个字符间隔(ms)，默认 0\n\n**使用示例：**\n\`\`\`\n# 简单输入\ncdp_keyboard_type({ text: \"Hello World\" })\n\n# 逐字符输入（模拟真人）\ncdp_keyboard_type({ text: \"password123\", delay: 50 })\n\n# 窗口指定\ncdp_keyboard_type({ win_id: 2, text: \"search query\" })\n\`\`\`\n\n**注意：** 不支持修饰键（Ctrl、Shift），请使用 cdp_keyboard_press`,
      {
        win_id: z.number().optional().default(1).describe("窗口 ID"),
        text: z.string().describe("输入的文本"),
        delay: z.number().optional().default(0).describe("字符间隔(ms)")
      },
      async ({ win_id, text, delay }) => {
        try {
          await this.ensureCDP(win_id);
          const wc = BrowserWindow.fromId(win_id).webContents;

          for (const char of text) {
            await wc.debugger.sendCommand('Input.dispatchKeyEvent', {
              type: 'char',
              text: char
            });

            if (delay > 0) {
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }

          return { content: [{ type: "text", text: `Typed "${text}" (${text.length} chars)` }] };
        } catch (error) {
          return { content: [{ type: "text", text: `CDP Error: ${error.message}` }], isError: true };
        }
      }
    );

    this.registerTool(
      "cdp_keyboard_press",
      `发送单个键盘按键事件，支持修饰键组合\n\n**自动管理：** 此工具会自动为指定窗口启用 CDP Debugger\n\n**修饰键：** Ctrl, Alt, Shift, Meta (Command)\n\n**参数：**\n- \`win_id\` (number, 可选): 窗口 ID，默认 1\n- \`key\` (string, 必需): 按键名称\n- \`modifiers\` (string[], 可选): 修饰键列表\n\n**按键名称参考：**\n- 字母: a-z\n- 数字: 0-9\n- 功能键: F1-F12\n- 特殊: Enter, Escape, Tab, Backspace, Delete\n- 方向: ArrowUp, ArrowDown, ArrowLeft, ArrowRight\n- 控制: Home, End, PageUp, PageDown\n\n**使用示例：**\n\`\`\`\n# 单键\ncdp_keyboard_press({ key: \"Enter\" })\n\n# 组合键 - 保存\ncdp_keyboard_press({ key: \"s\", modifiers: [\"Ctrl\"] })\n\n# 组合键 - 全选\ncdp_keyboard_press({ key: \"a\", modifiers: [\"Ctrl\"] })\n\n# 组合键 - Tab 切换\ncdp_keyboard_press({ key: \"Tab\", modifiers: [\"Ctrl\", \"Shift\"] })\n\n# 常用快捷键\ncdp_keyboard_press({ key: \"r\", modifiers: [\"Ctrl\"] })  // 刷新\ncdp_keyboard_press({ key: \"w\", modifiers: [\"Ctrl\"] })  // 关闭标签\ncdp_keyboard_press({ key: \"t\", modifiers: [\"Ctrl\"] })  // 新建标签\n\`\`\``,
      {
        win_id: z.number().optional().default(1).describe("窗口 ID"),
        key: z.string().describe("按键名称"),
        modifiers: z.array(z.enum(["Ctrl", "Alt", "Shift", "Meta"])).optional().describe("修饰键")
      },
      async ({ win_id, key, modifiers }) => {
        try {
          await this.ensureCDP(win_id);
          const wc = BrowserWindow.fromId(win_id).webContents;

          const modifierMap = {
            'Ctrl': 'control',
            'Alt': 'alt', 
            'Shift': 'shift',
            'Meta': 'meta'
          };

          const activeModifiers = modifiers ? modifiers.map(m => modifierMap[m]) : [];

          // Key down
          await wc.debugger.sendCommand('Input.dispatchKeyEvent', {
            type: 'keyDown',
            key: key,
            code: key,
            modifiers: activeModifiers
          });

          // Key up
          await wc.debugger.sendCommand('Input.dispatchKeyEvent', {
            type: 'keyUp',
            key: key,
            code: key,
            modifiers: activeModifiers
          });

          const modifierStr = modifiers ? modifiers.join('+') + '+' : '';
          return { content: [{ type: "text", text: `Pressed ${modifierStr}${key}` }] };
        } catch (error) {
          return { content: [{ type: "text", text: `CDP Error: ${error.message}` }], isError: true };
        }
      }
    );

    // CDP Screenshot and PDF tools
    this.registerTool(
      "cdp_screenshot",
      `使用 CDP captureScreenshot 命令截取页面\n\n**自动管理：** 此工具会自动为指定窗口启用 CDP Debugger\n\n**参数：**\n- \`win_id\` (number, 可选): 窗口 ID，默认 1\n- \`format\` (string, 可选): 图片格式 ['png', 'jpeg']，默认 'png'\n- \`quality\` (number, 可选): JPEG 质量 (0-100)，仅 JPEG 有效\n- \`clipX\` (number, 可选): 裁剪区域 X\n- \`clipY\` (number, 可选): 裁剪区域 Y\n- \`clipWidth\` (number, 可选): 裁剪区域宽度\n- \`clipHeight\` (number, 可选): 裁剪区域高度\n- \`fromSurface\` (boolean, 可选): 是否从页面表面截图，默认 true\n\n**使用示例：**\n\`\`\`\n# 全屏截图\ncdp_screenshot({})\n\n# 指定格式和质量\ncdp_screenshot({ format: \"jpeg\", quality: 80 })\n\n# 区域截图\ncdp_screenshot({\n  clipX: 0,\n  clipY: 0,\n  clipWidth: 800,\n  clipHeight: 600\n})\n\`\`\`\n\n**返回：** Base64 编码的图片数据`,
      {
        win_id: z.number().optional().default(1).describe("窗口 ID"),
        format: z.enum(["png", "jpeg"]).optional().default("png").describe("图片格式"),
        quality: z.number().min(0).max(100).optional().describe("JPEG 质量"),
        clipX: z.number().optional().describe("裁剪 X"),
        clipY: z.number().optional().describe("裁剪 Y"),
        clipWidth: z.number().optional().describe("裁剪宽度"),
        clipHeight: z.number().optional().describe("裁剪高度"),
        fromSurface: z.boolean().optional().default(true).describe("从页面表面截图")
      },
      async ({ win_id, format, quality, clipX, clipY, clipWidth, clipHeight, fromSurface }) => {
        try {
          await this.ensureCDP(win_id);
          const wc = BrowserWindow.fromId(win_id).webContents;

          // Enable Page domain
          await wc.debugger.sendCommand('Page.enable');

          const params = { format };
          if (quality !== undefined) params.quality = quality;
          if (clipX !== undefined && clipY !== undefined && clipWidth !== undefined && clipHeight !== undefined) {
            params.clip = { x: clipX, y: clipY, width: clipWidth, height: clipHeight, scale: 1 };
          }
          if (fromSurface !== undefined) params.fromSurface = fromSurface;

          const result = await wc.debugger.sendCommand('Page.captureScreenshot', params);
          
          return {
            content: [{
              type: "text",
              text: `Screenshot captured (${format}, ${result.data.length} bytes)`
            }, {
              type: "image",
              data: result.data,
              mimeType: `image/${format}`
            }]
          };
        } catch (error) {
          return { content: [{ type: "text", text: `CDP Screenshot Error: ${error.message}` }], isError: true };
        }
      }
    );

    this.registerTool(
      "cdp_page_print_to_pdf",
      `使用 CDP Page.printToPDF 将页面打印为 PDF\n\n**自动管理：** 此工具会自动为指定窗口启用 CDP Debugger\n\n**参数：**\n- \`win_id\` (number, 可选): 窗口 ID，默认 1\n- \`paperWidth\` (number, 可选): 纸张宽度（英寸），默认 8.5\n- \`paperHeight\` (number, 可选): 纸张高度（英寸），默认 11\n- \`marginTop\` (number, 可选): 上边距（英寸），默认 1\n- \`marginBottom\` (number, 可选): 下边距（英寸），默认 1\n- \`marginLeft\` (number, 可选): 左边距（英寸），默认 1\n- \`marginRight\` (number, 可选): 右边距（英寸），默认 1\n- \`scale\` (number, 可选): 缩放比例，默认 1\n- \`preferCSSPageSize\` (boolean, 可选): 优先使用 CSS 页面大小，默认 false\n- \`printBackground\` (boolean, 可选): 打印背景，默认 false\n- \`landscape\` (boolean, 可选): 横向，默认 false\n\n**使用示例：**\n\`\`\`\n# 基本 PDF\ncdp_page_print_to_pdf({})\n\n# A4 横向\ncdp_page_print_to_pdf({\n  paperWidth: 8.27,\n  paperHeight: 11.69,\n  landscape: true,\n  printBackground: true\n})\n\`\`\`\n\n**返回：** Base64 编码的 PDF 数据`,
      {
        win_id: z.number().optional().default(1).describe("窗口 ID"),
        paperWidth: z.number().optional().default(8.5).describe("纸张宽度"),
        paperHeight: z.number().optional().default(11).describe("纸张高度"),
        marginTop: z.number().optional().default(1).describe("上边距"),
        marginBottom: z.number().optional().default(1).describe("下边距"),
        marginLeft: z.number().optional().default(1).describe("左边距"),
        marginRight: z.number().optional().default(1).describe("右边距"),
        scale: z.number().optional().default(1).describe("缩放"),
        preferCSSPageSize: z.boolean().optional().default(false).describe("优先 CSS 页面大小"),
        printBackground: z.boolean().optional().default(false).describe("打印背景"),
        landscape: z.boolean().optional().default(false).describe("横向")
      },
      async ({ win_id, paperWidth, paperHeight, marginTop, marginBottom, marginLeft, marginRight, scale, preferCSSPageSize, printBackground, landscape }) => {
        try {
          await this.ensureCDP(win_id);
          const wc = BrowserWindow.fromId(win_id).webContents;

          // Enable Page domain
          await wc.debugger.sendCommand('Page.enable');

          const params = {
            paperWidth, paperHeight,
            marginTop, marginBottom, marginLeft, marginRight,
            scale, preferCSSPageSize, printBackground, landscape
          };

          const result = await wc.debugger.sendCommand('Page.printToPDF', params);
          
          return {
            content: [{
              type: "text",
              text: `PDF generated (${result.data.length} bytes)`
            }, {
              type: "text",
              text: result.data // PDF base64 data
            }]
          };
        } catch (error) {
          return { content: [{ type: "text", text: `CDP PDF Error: ${error.message}` }], isError: true };
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
    this.registerTool("ping", "检查 MCP 服务器是否正常运行\n\n**返回值：** 成功返回 \"pong\"", {}, async () => {
      return {
        content: [{ type: "text", text: "pong" }],
      };
    });

    this.registerTool(
      "execute_shell",
      `执行 Shell 命令，支持管道、重定向、环境变量等\n\n**参数：**\n- \`command\` (string, 必需): 要执行的 Shell 命令\n- \`timeout\` (number, 可选): 超时时间(ms)，默认 30000\n- \`env\` (object, 可选): 额外的环境变量\n- \`cwd\` (string, 可选): 工作目录\n\n**返回值：**\n\`\`\`json\n{\n  "stdout": "...",   // 标准输出\n  "stderr": "...",   // 错误输出\n  "exitCode": 0,     // 退出码\n  "duration": 150    // 执行耗时(ms)\n}\n\`\`\`\n\n**使用示例：**\n\`\`\`\n# 简单命令\nexecute_shell({ command: \"ls -la\" })\n\n# 管道操作\nexecute_shell({ command: \"ps aux | grep node\" })\n\n# 带超时\nexecute_shell({ command: \"npm install\", timeout: 120000 })\n\n# 环境变量\nexecute_shell({ command: \"echo $MY_VAR\", env: { MY_VAR: \"hello\" } })\n\n# 工作目录\nexecute_shell({ command: \"pwd\", cwd: \"/tmp\" })\n\`\`\`\n\n**注意事项：**\n- 危险命令（如 rm）会直接执行，请谨慎使用\n- 支持 bash/zsh 语法\n- 超时后命令会被强制终止`,
      {
        command: z.string().describe("Shell 命令"),
        timeout: z.number().optional().default(30000).describe("超时时间(ms)"),
        env: z.record(z.string()).optional().describe("环境变量"),
        cwd: z.string().optional().describe("工作目录")
      },
      async ({ command, timeout, env, cwd }) => {
        return new Promise((resolve) => {
          const startTime = Date.now();
          const options = { cwd, env: { ...process.env, ...env } };

          const child = spawn('bash', ['-c', command], options);
          let stdout = '';
          let stderr = '';

          child.stdout.on('data', (data) => { stdout += data.toString(); });
          child.stderr.on('data', (data) => { stderr += data.toString(); });

          child.on('close', (code) => {
            const duration = Date.now() - startTime;
            resolve({
              content: [{
                type: "text",
                text: JSON.stringify({
                  stdout: stdout.slice(-10000),
                  stderr: stderr.slice(-10000),
                  exitCode: code,
                  duration
                }, null, 2)
              }]
            });
          });

          child.on('error', (error) => {
            resolve({
              content: [{ type: "text", text: `Error: ${error.message}` }],
              isError: true
            });
          });

          setTimeout(() => {
            child.kill('SIGKILL');
            resolve({
              content: [{ type: "text", text: JSON.stringify({
                stdout: stdout.slice(-10000),
                stderr: stderr.slice(-10000),
                exitCode: -1,
                duration,
                error: "timeout"
              }, null, 2) }],
              isError: true
            });
          }, timeout);
        });
      }
    );

    this.registerTool(
      "execute_python",
      `在 Python 环境中执行代码，支持 pip 安装第三方库\n\n**参数：**\n- \`code\` (string, 必需): Python 代码\n- \`packages\` (string[], 可选): 需要安装的 pip 包列表\n- \`timeout\` (number, 可选): 超时时间(ms)，默认 60000\n- \`imports\` (string[], 可选): 额外导入的模块\n\n**返回值：**\n\`\`\`json\n{\n  "stdout": "...",   // 打印输出\n  "result": ...,     // 最后表达式的值\n  "error": null      // 错误信息\n}\n\`\`\`\n\n**使用示例：**\n\`\`\`\n# 简单计算\nexecute_python({ code: \"print(sum([1,2,3,4,5]))\" })\n\n# 安装并使用包\nexecute_python({\n  code: \"import pandas as pd\\ndf = pd.DataFrame({'a':[1,2,3]})\\nprint(df.mean())\",\n  packages: [\"pandas\"]\n})\n\n# 数据处理\nexecute_python({\n  code: \"import json\\ndata = {'name': 'test'}\\nprint(json.dumps(data, indent=2))\"\n})\n\n# 文件操作\nexecute_python({\n  code: \"import os\\nfor f in os.listdir('.'): print(f)\"\n})\n\`\`\`\n\n**注意事项：**\n- 代码最后一条语句的结果会作为 result 返回\n- pip 安装有超时限制，请勿安装大型包`,
      {
        code: z.string().describe("Python 代码"),
        packages: z.array(z.string()).optional().describe("需要安装的 pip 包"),
        timeout: z.number().optional().default(60000).describe("超时时间(ms)"),
        imports: z.array(z.string()).optional().describe("额外导入的模块")
      },
      async ({ code, packages, timeout, imports }) => {
        return new Promise((resolve) => {
          const startTime = Date.now();
          let pipInstall = '';
          let finalCode = code;

          if (packages && packages.length > 0) {
            pipInstall = `import subprocess, sys; [subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-q', p]) for p in ${JSON.stringify(packages)}];`;
          }

          const importStmt = imports && imports.length > 0
            ? `import ${imports.join(', ')}; `
            : '';

          const fullCode = `
${pipInstall}
${importStmt}
${code}
`;

          const child = spawn('python3', ['-c', fullCode], {
            env: { ...process.env },
            cwd: __dirname
          });

          let stdout = '';
          let stderr = '';

          child.stdout.on('data', (data) => { stdout += data.toString(); });
          child.stderr.on('data', (data) => { stderr += data.toString(); });

          child.on('close', (code) => {
            const duration = Date.now() - startTime;

            if (code !== 0) {
              resolve({
                content: [{ type: "text", text: stderr || `Exit code: ${code}` }],
                isError: true
              });
              return;
            }

            resolve({
              content: [{
                type: "text",
                text: JSON.stringify({
                  stdout: stdout.slice(-10000),
                  result: stdout.slice(-1000).trim().split('\n').pop() || null,
                  duration
                }, null, 2)
              }]
            });
          });

          child.on('error', (error) => {
            resolve({
              content: [{ type: "text", text: `Error: ${error.message}` }],
              isError: true
            });
          });

          setTimeout(() => {
            child.kill('SIGKILL');
            resolve({
              content: [{ type: "text", text: "Timeout: Python execution exceeded limit" }],
              isError: true
            });
          }, timeout);
        });
      }
    );

    // File operation tools
    this.registerTool(
      "read_file",
      `读取文件内容，自动处理编码\n\n**参数：**\n- \`path\` (string, 必需): 文件路径\n- \`encoding\` (string, 可选): 编码格式，默认 'utf-8'\n- \`maxSize\` (number, 可选): 最大读取字节数，默认 1MB\n\n**返回值：**\n\`\`\`json\n{\n  "content": "...",\n  "size": 1234,\n  "encoding": "utf-8"\n}\n\`\`\`\n\n**使用示例：**\n\`\`\`\n# 读取配置文件\nread_file({ path: \"/Users/test/config.json\" })\n\n# 指定编码\nread_file({ path: \"data.txt\", encoding: \"gbk\" })\n\n# 限制大小\nread_file({ path: \"large.log\", maxSize: 1024 * 100 })\n\`\`\`\n\n**注意事项：**\n- 支持相对路径和绝对路径\n- 大文件会被截断到指定大小`,
      {
        path: z.string().describe("文件路径"),
        encoding: z.string().optional().default("utf-8").describe("文件编码"),
        maxSize: z.number().optional().default(1048576).describe("最大读取字节数")
      },
      async ({ path, encoding, maxSize }) => {
        try {
          const fs = require('fs');
          const { resolve } = require('path');
          const fullPath = resolve(process.cwd(), path);
          
          if (!fs.existsSync(fullPath)) {
            throw new Error(`File not found: ${path}`);
          }
          
          const stats = fs.statSync(fullPath);
          const content = fs.readFileSync(fullPath, { 
            encoding, 
            length: Math.min(stats.size, maxSize) 
          });
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                content: content.toString(),
                size: stats.size,
                encoding,
                truncated: stats.size > maxSize
              }, null, 2)
            }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error reading file: ${error.message}` }],
            isError: true
          };
        }
      }
    );

    this.registerTool(
      "write_file",
      `创建或覆盖文件内容\n\n**参数：**\n- \`path\` (string, 必需): 文件路径\n- \`content\` (string, 必需): 文件内容\n- \`encoding\` (string, 可选): 编码格式，默认 'utf-8'\n\n**使用示例：**\n\`\`\`\n# 写入 JSON\nwrite_file({ path: \"/tmp/test.json\", content: '{\"key\": \"value\"}' })\n\n# 写入文本\nwrite_file({ path: \"output.txt\", content: \"Hello World\" })\n\n# 指定编码\nwrite_file({ path: \"chinese.txt\", content: \"你好世界\", encoding: \"utf-8\" })\n\`\`\`\n\n**注意事项：**\n- 会自动创建不存在的目录\n- 会覆盖已存在的文件`,
      {
        path: z.string().describe("文件路径"),
        content: z.string().describe("文件内容"),
        encoding: z.string().optional().default("utf-8").describe("文件编码")
      },
      async ({ path, content, encoding }) => {
        try {
          const fs = require('fs');
          const { resolve, dirname } = require('path');
          const fullPath = resolve(process.cwd(), path);
          
          // 确保目录存在
          const dir = dirname(fullPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          fs.writeFileSync(fullPath, content, { encoding });
          
          return {
            content: [{ 
              type: "text", 
              text: `Successfully wrote ${content.length} bytes to ${path}` 
            }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error writing file: ${error.message}` }],
            isError: true
          };
        }
      }
    );

    // CDP Network tools
    this.registerTool(
      "cdp_network_enable",
      `启用网络请求监控，记录所有 HTTP 请求/响应\n\n**自动管理：** 此工具会自动为指定窗口启用 CDP Debugger\n\n**参数：**\n- \`win_id\` (number, 可选): 窗口 ID，默认 1\n- \`maxBufferSize\` (number, 可选): 最大缓存请求数，默认 1000\n\n**注意：** 每个窗口独立记录网络请求\n\n**使用示例：**\n\`\`\`\n# 为窗口 1 启用监控\ncdp_network_enable({ win_id: 1 })\n\n# 为窗口 2 启用监控\ncdp_network_enable({ win_id: 2, maxBufferSize: 500 })\n\`\`\``,
      {
        win_id: z.number().optional().default(1).describe("窗口 ID"),
        maxBufferSize: z.number().optional().default(1000).describe("最大缓存请求数")
      },
      async ({ win_id, maxBufferSize }) => {
        try {
          await this.ensureCDP(win_id);
          const wc = BrowserWindow.fromId(win_id).webContents;

          // 设置缓冲区大小
          const data = this.cdpManager.getData(winId);
          data.maxNetworkRequests = maxBufferSize;

          return {
            content: [{ 
              type: "text", 
              text: `Network monitoring enabled for window ${win_id} (buffer: ${maxBufferSize})` 
            }]
          };
        } catch (error) {
          return { content: [{ type: "text", text: `CDP Network Error: ${error.message}` }], isError: true };
        }
      }
    );

    this.registerTool(
      "cdp_network_requests",
      `获取指定窗口已记录的网络请求列表\n\n**参数：**\n- \`win_id\` (number, 可选): 窗口 ID，默认 1\n- \`page\` (number, 可选): 页码，默认 1\n- \`pageSize\` (number, 可选): 每页数量，默认 20\n\n**注意：** 返回的是指定窗口的网络请求记录\n\n**使用示例：**\n\`\`\`\n# 获取窗口 1 的请求\ncdp_network_requests({ win_id: 1 })\n\n# 获取窗口 2 的请求（分页）\ncdp_network_requests({ win_id: 2, page: 1, pageSize: 50 })\n\`\`\``,
      {
        win_id: z.number().optional().default(1).describe("窗口 ID"),
        page: z.number().optional().default(1).describe("页码"),
        pageSize: z.number().optional().default(20).describe("每页数量")
      },
      async ({ win_id, page, pageSize }) => {
        try {
          const data = this.cdpManager.getData(win_id);
          const requests = data.networkRequests || [];
          
          const start = (page - 1) * pageSize;
          const end = start + pageSize;
          const paginatedRequests = requests.slice(start, end);
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                total: requests.length,
                page,
                pageSize,
                requests: paginatedRequests
              }, null, 2)
            }]
          };
        } catch (error) {
          return { content: [{ type: "text", text: `CDP Network Error: ${error.message}` }], isError: true };
        }
      }
    );

    this.registerTool(
      "cdp_network_response_body",
      `获取指定请求的响应体内容\n\n**参数：**\n- \`win_id\` (number, 可选): 窗口 ID，默认 1\n- \`requestId\` (string, 必需): 请求 ID（来自 cdp_network_requests）\n\n**使用示例：**\n\`\`\`\n# 先获取请求列表\nconst requests = cdp_network_requests({ win_id: 1 })\n\n# 获取某个请求的响应\nconst body = cdp_network_response_body({\n  win_id: 1,\n  requestId: requests[0].requests[0].requestId\n})\n\`\`\``,
      {
        win_id: z.number().optional().default(1).describe("窗口 ID"),
        requestId: z.string().describe("请求 ID")
      },
      async ({ win_id, requestId }) => {
        try {
          await this.ensureCDP(win_id);
          const wc = BrowserWindow.fromId(win_id).webContents;

          const result = await wc.debugger.sendCommand('Network.getResponseBody', {
            requestId
          });
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }]
          };
        } catch (error) {
          return { content: [{ type: "text", text: `CDP Network Error: ${error.message}` }], isError: true };
        }
      }
    );

    // CDP Console tools
    this.registerTool(
      "cdp_console_messages",
      `获取指定窗口页面的控制台消息\n\n**参数：**\n- \`win_id\` (number, 可选): 窗口 ID，默认 1\n- \`types\` (string[], 可选): 消息类型 ['log', 'info', 'warning', 'error', 'debug']\n- \`maxMessages\` (number, 可选): 最大消息数，默认 100\n- \`clearAfterRead\` (boolean, 可选): 读取后是否清除，默认 false\n\n**注意：** 每个窗口独立记录控制台消息\n\n**使用示例：**\n\`\`\`\n# 获取窗口 1 的所有日志\ncdp_console_messages({ win_id: 1 })\n\n# 获取窗口 2 的错误日志\ncdp_console_messages({\n  win_id: 2,\n  types: [\"error\", \"warning\"],\n  maxMessages: 50\n})\n\n# 获取并清除\ncdp_console_messages({\n  win_id: 1,\n  clearAfterRead: true\n})\n\`\`\``,
      {
        win_id: z.number().optional().default(1).describe("窗口 ID"),
        types: z.array(z.enum(["log", "info", "warning", "error", "debug"])).optional().describe("消息类型"),
        maxMessages: z.number().optional().default(100).describe("最大消息数"),
        clearAfterRead: z.boolean().optional().default(false).describe("读取后是否清除")
      },
      async ({ win_id, types, maxMessages, clearAfterRead }) => {
        try {
          const data = this.cdpManager.getData(win_id);
          let messages = data.consoleMessages || [];
          
          if (types && types.length > 0) {
            messages = messages.filter(msg => types.includes(msg.type || 'log'));
          }
          
          const limitedMessages = messages.slice(-maxMessages);
          
          if (clearAfterRead) {
            data.consoleMessages = [];
          }
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                total: messages.length,
                returned: limitedMessages.length,
                messages: limitedMessages
              }, null, 2)
            }]
          };
        } catch (error) {
          return { content: [{ type: "text", text: `CDP Console Error: ${error.message}` }], isError: true };
        }
      }
    );

    this.registerTool(
      "clear_console",
      `清除指定窗口的控制台日志记录\n\n**参数：**\n- \`win_id\` (number, 可选): 窗口 ID，默认 1\n\n**使用示例：**\n\`\`\`\n# 清除当前窗口日志\nclear_console({})\n\n# 清除指定窗口日志\nclear_console({ win_id: 2 })\n\`\`\``,
      {
        win_id: z.number().optional().default(1).describe("窗口 ID")
      },
      async ({ win_id }) => {
        try {
          this.cdpManager.clearConsole(win_id);
          return {
            content: [{ type: "text", text: `Console messages cleared for window ${win_id}` }]
          };
        } catch (error) {
          return { content: [{ type: "text", text: `Clear Console Error: ${error.message}` }], isError: true };
        }
      }
    );

    this.registerTool(
      "clear_network_request",
      `清除指定窗口的网络请求记录\n\n**参数：**\n- \`win_id\` (number, 可选): 窗口 ID，默认 1\n\n**使用示例：**\n\`\`\`\n# 清除当前窗口网络记录\nclear_network_request({})\n\n# 清除指定窗口网络记录\nclear_network_request({ win_id: 3 })\n\`\`\``,
      {
        win_id: z.number().optional().default(1).describe("窗口 ID")
      },
      async ({ win_id }) => {
        try {
          this.cdpManager.clearNetwork(win_id);
          return {
            content: [{ type: "text", text: `Network requests cleared for window ${win_id}` }]
          };
        } catch (error) {
          return { content: [{ type: "text", text: `Clear Network Error: ${error.message}` }], isError: true };
        }
      }
    );

    // Storage tools
    this.registerTool(
      "cdp_storage_get",
      `获取 localStorage 或 sessionStorage 数据\n\n**参数：**\n- \`win_id\` (number, 可选): 窗口 ID，默认 1\n- \`storageType\` (string, 可选): ['localStorage', 'sessionStorage']\n- \`keys\` (string[], 可选): 要获取的键，不指定则获取所有\n\n**使用示例：**\n\`\`\`\n# 获取所有 localStorage\ncdp_storage_get({ storageType: \"localStorage\" })\n\n# 获取特定值\ncdp_storage_get({\n  storageType: \"sessionStorage\",\n  keys: [\"userToken\", \"theme\"]\n})\n\`\`\``,
      {
        win_id: z.number().optional().default(1).describe("窗口 ID"),
        storageType: z.enum(["localStorage", "sessionStorage"]).optional().default("localStorage").describe("存储类型"),
        keys: z.array(z.string()).optional().describe("要获取的键")
      },
      async ({ win_id, storageType, keys }) => {
        try {
          await this.ensureCDP(win_id);
          const wc = BrowserWindow.fromId(win_id).webContents;

          const result = await wc.debugger.sendCommand('Runtime.evaluate', {
            expression: `
              (() => {
                const storage = window['${storageType}'];
                const keys = ${JSON.stringify(keys)};
                if (keys && keys.length > 0) {
                  const result = {};
                  keys.forEach(key => {
                    result[key] = storage.getItem(key);
                  });
                  return result;
                } else {
                  const result = {};
                  for (let i = 0; i < storage.length; i++) {
                    const key = storage.key(i);
                    result[key] = storage.getItem(key);
                  }
                  return result;
                }
              })()
            `
          });
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify(JSON.parse(result.result.value), null, 2)
            }]
          };
        } catch (error) {
          return { content: [{ type: "text", text: `CDP Storage Error: ${error.message}` }], isError: true };
        }
      }
    );

    this.registerTool(
      "cdp_storage_set",
      `设置 localStorage 或 sessionStorage 数据\n\n**参数：**\n- \`win_id\` (number, 可选): 窗口 ID，默认 1\n- \`storageType\` (string, 可选): ['localStorage', 'sessionStorage']\n- \`data\` (object, 必需): 要设置的数据\n\n**使用示例：**\n\`\`\`\ncdp_storage_set({\n  storageType: \"localStorage\",\n  data: {\n    theme: \"dark\",\n    userId: \"12345\"\n  }\n})\n\`\`\``,
      {
        win_id: z.number().optional().default(1).describe("窗口 ID"),
        storageType: z.enum(["localStorage", "sessionStorage"]).optional().default("localStorage").describe("存储类型"),
        data: z.record(z.string()).describe("要设置的数据")
      },
      async ({ win_id, storageType, data }) => {
        try {
          await this.ensureCDP(win_id);
          const wc = BrowserWindow.fromId(win_id).webContents;

          const result = await wc.debugger.sendCommand('Runtime.evaluate', {
            expression: `
              (() => {
                const storage = window['${storageType}'];
                const data = ${JSON.stringify(data)};
                Object.keys(data).forEach(key => {
                  storage.setItem(key, data[key]);
                });
                return Object.keys(data).length + ' items set';
              })()
            `
          });
          
          return {
            content: [{
              type: "text",
              text: `Storage items set: ${result.result.value}`
            }]
          };
        } catch (error) {
          return { content: [{ type: "text", text: `CDP Storage Error: ${error.message}` }], isError: true };
        }
      }
    );

    this.registerTool(
      "cdp_storage_clear",
      `清空 localStorage 或 sessionStorage\n\n**参数：**\n- \`win_id\` (number, 可选): 窗口 ID，默认 1\n- \`storageType\` (string, 可选): ['localStorage', 'sessionStorage']\n\n**使用示例：**\n\`\`\`\ncdp_storage_clear({ storageType: \"localStorage\" })\n\`\`\``,
      {
        win_id: z.number().optional().default(1).describe("窗口 ID"),
        storageType: z.enum(["localStorage", "sessionStorage"]).optional().default("localStorage").describe("存储类型")
      },
      async ({ win_id, storageType }) => {
        try {
          await this.ensureCDP(win_id);
          const wc = BrowserWindow.fromId(win_id).webContents;

          const result = await wc.debugger.sendCommand('Runtime.evaluate', {
            expression: `
              (() => {
                const storage = window['${storageType}'];
                const size = storage.length;
                storage.clear();
                return 'Cleared ' + size + ' items';
              })()
            `
          });
          
          return {
            content: [{
              type: "text",
              text: result.result.value
            }]
          };
        } catch (error) {
          return { content: [{ type: "text", text: `CDP Storage Error: ${error.message}` }], isError: true };
        }
      }
    );

    // IndexedDB tools
    this.registerTool(
      "cdp_indexeddb_list_databases",
      `列出当前页面可以访问的所有 IndexedDB 数据库\n\n**参数：**\n- \`win_id\` (number, 可选): 窗口 ID，默认 1\n\n**返回结构：**\n\`\`\`json\n{\n  "databaseNames": ["myAppDB", "cacheDB"]\n}\n\`\`\``,
      {
        win_id: z.number().optional().default(1).describe("窗口 ID")
      },
      async ({ win_id }) => {
        try {
          await this.ensureCDP(win_id);
          const wc = BrowserWindow.fromId(win_id).webContents;

          const result = await wc.debugger.sendCommand('Runtime.evaluate', {
            expression: `
              (() => {
                return indexedDB.databases ? indexedDB.databases() : Promise.resolve([]);
              })()
            `,
            awaitPromise: true
          });
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ databaseNames: result.result.value }, null, 2)
            }]
          };
        } catch (error) {
          return { content: [{ type: "text", text: `CDP IndexedDB Error: ${error.message}` }], isError: true };
        }
      }
    );

    this.registerTool(
      "cdp_indexeddb_get",
      `获取 IndexedDB 数据库中的数据\n\n**参数：**\n- \`win_id\` (number, 可选): 窗口 ID，默认 1\n- \`databaseName\` (string, 必需): 数据库名称\n- \`storeName\` (string, 必需): 对象仓库名称\n- \`indexName\` (string, 可选): 索引名称（查询时需要）\n- \`query\` (string, 可选): 主键或索引键值\n- \`count\` (number, 可选): 最大返回数量，默认 100\n\n**使用示例：**\n\`\`\`\n# 获取整个仓库数据\ncdp_indexeddb_get({\n  databaseName: \"myAppDB\",\n  storeName: \"users\"\n})\n\n# 按主键查询\ncdp_indexeddb_get({\n  databaseName: \"myAppDB\",\n  storeName: \"users\",\n  query: \"user123\"\n})\n\n# 按索引查询\ncdp_indexeddb_get({\n  databaseName: \"myAppDB\",\n  storeName: \"users\",\n  indexName: \"email\",\n  query: \"test@example.com\"\n})\n\`\`\``,
      {
        win_id: z.number().optional().default(1).describe("窗口 ID"),
        databaseName: z.string().describe("数据库名称"),
        storeName: z.string().describe("对象仓库名称"),
        indexName: z.string().optional().describe("索引名称"),
        query: z.string().optional().describe("主键或索引键值"),
        count: z.number().optional().default(100).describe("最大返回数量")
      },
      async ({ win_id, databaseName, storeName, indexName, query, count }) => {
        try {
          await this.ensureCDP(win_id);
          const wc = BrowserWindow.fromId(win_id).webContents;

          const result = await wc.debugger.sendCommand('Runtime.evaluate', {
            expression: `
              (async () => {
                const db = await new Promise((resolve, reject) => {
                  const request = indexedDB.open('${databaseName}');
                  request.onsuccess = () => resolve(request.result);
                  request.onerror = () => reject(request.error);
                });

                const transaction = db.transaction(['${storeName}'], 'readonly');
                const store = transaction.objectStore('${storeName}');

                let results;
                if (${query !== undefined}) {
                  ${indexName ? `
                    const index = store.index('${indexName}');
                    const request = index.get('${query}');
                  ` : `
                    const request = store.get('${query}');
                  `}
                  results = await new Promise((resolve, reject) => {
                    request.onsuccess = () => resolve([request.result]);
                    request.onerror = () => reject(request.error);
                  });
                } else {
                  const request = store.getAll();
                  results = await new Promise((resolve, reject) => {
                    request.onsuccess = () => resolve(request.result.slice(0, ${count}));
                    request.onerror = () => reject(request.error);
                  });
                }

                db.close();
                return results;
              })()
            `,
            awaitPromise: true
          });
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ objectStoreData: result.result.value }, null, 2)
            }]
          };
        } catch (error) {
          return { content: [{ type: "text", text: `CDP IndexedDB Error: ${error.message}` }], isError: true };
        }
      }
    );

    this.registerTool(
      "cdp_indexeddb_put",
      `向 IndexedDB 插入或更新数据\n\n**参数：**\n- \`win_id\` (number, 可选): 窗口 ID，默认 1\n- \`databaseName\` (string, 必需): 数据库名称\n- \`storeName\` (string, 必需): 对象仓库名称\n- \`value\` (object, 必需): 要存储的数据（必须是对象）\n- \`key\` (string, 可选): 主键值\n\n**使用示例：**\n\`\`\`\n# 自动生成主键\ncdp_indexeddb_put({\n  databaseName: \"myAppDB\",\n  storeName: \"users\",\n  value: { name: \"John\", age: 30 }\n})\n\n# 指定主键\ncdp_indexeddb_put({\n  databaseName: \"myAppDB\",\n  storeName: \"users\",\n  key: \"user123\",\n  value: { name: \"John\", age: 30 }\n})\n\`\`\``,
      {
        win_id: z.number().optional().default(1).describe("窗口 ID"),
        databaseName: z.string().describe("数据库名称"),
        storeName: z.string().describe("对象仓库名称"),
        value: z.object().describe("要存储的数据"),
        key: z.string().optional().describe("主键值")
      },
      async ({ win_id, databaseName, storeName, value, key }) => {
        try {
          await this.ensureCDP(win_id);
          const wc = BrowserWindow.fromId(win_id).webContents;

          const result = await wc.debugger.sendCommand('Runtime.evaluate', {
            expression: `
              (async () => {
                const db = await new Promise((resolve, reject) => {
                  const request = indexedDB.open('${databaseName}');
                  request.onsuccess = () => resolve(request.result);
                  request.onerror = () => reject(request.error);
                });

                const transaction = db.transaction(['${storeName}'], 'readwrite');
                const store = transaction.objectStore('${storeName}');

                const result = await new Promise((resolve, reject) => {
                  const request = ${key !== undefined} 
                    ? store.put(${JSON.stringify(value)}, '${key}')
                    : store.put(${JSON.stringify(value)});
                  request.onsuccess = () => resolve('success');
                  request.onerror = () => reject(request.error);
                });

                db.close();
                return result;
              })()
            `,
            awaitPromise: true
          });
          
          return {
            content: [{
              type: "text",
              text: `IndexedDB data put: ${result.result.value}`
            }]
          };
        } catch (error) {
          return { content: [{ type: "text", text: `CDP IndexedDB Error: ${error.message}` }], isError: true };
        }
      }
    );

    this.registerTool(
      "cdp_indexeddb_delete",
      `从 IndexedDB 删除数据\n\n**参数：**\n- \`win_id\` (number, 可选): 窗口 ID，默认 1\n- \`databaseName\` (string, 必需): 数据库名称\n- \`storeName\` (string, 必需): 对象仓库名称\n- \`key\` (string, 必需): 要删除的主键值\n\n**使用示例：**\n\`\`\`\ncdp_indexeddb_delete({\n  databaseName: \"myAppDB\",\n  storeName: \"users\",\n  key: \"user123\"\n})\n\`\`\``,
      {
        win_id: z.number().optional().default(1).describe("窗口 ID"),
        databaseName: z.string().describe("数据库名称"),
        storeName: z.string().describe("对象仓库名称"),
        key: z.string().describe("主键值")
      },
      async ({ win_id, databaseName, storeName, key }) => {
        try {
          await this.ensureCDP(win_id);
          const wc = BrowserWindow.fromId(win_id).webContents;

          const result = await wc.debugger.sendCommand('Runtime.evaluate', {
            expression: `
              (async () => {
                const db = await new Promise((resolve, reject) => {
                  const request = indexedDB.open('${databaseName}');
                  request.onsuccess = () => resolve(request.result);
                  request.onerror = () => reject(request.error);
                });

                const transaction = db.transaction(['${storeName}'], 'readwrite');
                const store = transaction.objectStore('${storeName}');

                const result = await new Promise((resolve, reject) => {
                  const request = store.delete('${key}');
                  request.onsuccess = () => resolve('deleted');
                  request.onerror = () => reject(request.error);
                });

                db.close();
                return result;
              })()
            `,
            awaitPromise: true
          });
          
          return {
            content: [{
              type: "text",
              text: `IndexedDB item deleted: ${result.result.value}`
            }]
          };
        } catch (error) {
          return { content: [{ type: "text", text: `CDP IndexedDB Error: ${error.message}` }], isError: true };
        }
      }
    );

    this.registerTool(
      "cdp_indexeddb_clear",
      `清空 IndexedDB 对象仓库中的所有数据\n\n**参数：**\n- \`win_id\` (number, 可选): 窗口 ID，默认 1\n- \`databaseName\` (string, 必需): 数据库名称\n- \`storeName\` (string, 必需): 对象仓库名称\n\n**使用示例：**\n\`\`\`\ncdp_indexeddb_clear({\n  databaseName: \"myAppDB\",\n  storeName: \"users\"\n})\n\`\`\``,
      {
        win_id: z.number().optional().default(1).describe("窗口 ID"),
        databaseName: z.string().describe("数据库名称"),
        storeName: z.string().describe("对象仓库名称")
      },
      async ({ win_id, databaseName, storeName }) => {
        try {
          await this.ensureCDP(win_id);
          const wc = BrowserWindow.fromId(win_id).webContents;

          const result = await wc.debugger.sendCommand('Runtime.evaluate', {
            expression: `
              (async () => {
                const db = await new Promise((resolve, reject) => {
                  const request = indexedDB.open('${databaseName}');
                  request.onsuccess = () => resolve(request.result);
                  request.onerror = () => reject(request.error);
                });

                const transaction = db.transaction(['${storeName}'], 'readwrite');
                const store = transaction.objectStore('${storeName}');

                const result = await new Promise((resolve, reject) => {
                  const request = store.clear();
                  request.onsuccess = () => resolve('cleared');
                  request.onerror = () => reject(request.error);
                });

                db.close();
                return result;
              })()
            `,
            awaitPromise: true
          });
          
          return {
            content: [{
              type: "text",
              text: `IndexedDB store cleared: ${result.result.value}`
            }]
          };
        } catch (error) {
          return { content: [{ type: "text", text: `CDP IndexedDB Error: ${error.message}` }], isError: true };
        }
      }
    );
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
