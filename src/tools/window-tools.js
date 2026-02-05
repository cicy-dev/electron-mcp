const { BrowserWindow } = require('electron');
const { z } = require("zod");
const { setupNetworkMonitoring } = require('../network-monitor');

/**
 * 窗口管理工具模块
 * 提供窗口的创建、管理和基本操作功能
 */
class WindowTools {
  constructor() {
    this.tools = new Map();
    this.setupTools();
  }

  registerTool(name, description, schema, handler) {
    this.tools.set(name, {
      name,
      config: { title: name, description, inputSchema: schema },
      handler
    });
  }

  getTools() {
    return this.tools;
  }

  setupTools() {
    // 打开新窗口
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
            setupNetworkMonitoring(win);
          });

          await win.loadURL(url);
          const id = win.id;
          return {
            content: [{ type: "text", text: `Opened window with ID: ${id}, wait window webContents dom-ready` }],
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
          };
        }
      }
    );

    // 获取所有窗口
    this.registerTool(
      "get_windows",
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
- 调试辅助：查看所有窗口的实时信息`,
      {},
      async () => {
        try {
          const windows = BrowserWindow.getAllWindows().map(w => {
            const wc = w.webContents;

            return {
              id: w.id,
              title: w.getTitle(),
              url: wc.getURL(),
              debuggerIsAttached: wc.debugger.isAttached(),
              isActive: w.isFocused(),
              bounds: w.getBounds(),
              isDomReady: !wc.isLoading(),
              isLoading: wc.isLoading(),
              isDestroyed: wc.isDestroyed(),
              isCrashed: wc.isCrashed(),
              isWaitingForResponse: wc.isWaitingForResponse(),
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
      }
    );

    // 关闭窗口
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

    // 加载URL
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

    // 获取窗口标题
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
  }
}

module.exports = { WindowTools };