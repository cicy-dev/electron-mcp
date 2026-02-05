const { BrowserWindow } = require('electron');
const { z } = require("zod");
const { setupNetworkMonitoring } = require('../network-monitor');

function registerWindowTools(server) {
  server.registerTool(
    "open_window",
    "打开新的浏览器窗口",
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
          //setupNetworkMonitoring(win);
        });

        await win.loadURL(url);
        return {
          content: [{ type: "text", text: `Opened window ${win.id}` }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "get_windows",
    "获取所有窗口列表",
    {},
    async () => {
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
    }
  );

  server.registerTool(
    "close_window",
    "关闭窗口",
    { win_id: z.number().describe("Window ID") },
    async ({ win_id }) => {
      try {
        const win = BrowserWindow.fromId(win_id);
        if (win) {
          win.close();
          return { content: [{ type: "text", text: `Closed ${win_id}` }] };
        }
        throw new Error(`Window ${win_id} not found`);
      } catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "load_url",
    "加载URL",
    {
      url: z.string().describe("URL"),
      win_id: z.number().optional().describe("Window ID"),
    },
    async ({ url, win_id }) => {
      try {
        const actualWinId = win_id || 1;
        const win = BrowserWindow.fromId(actualWinId);
        if (!win) throw new Error(`Window ${actualWinId} not found`);
        await win.loadURL(url);
        return { content: [{ type: "text", text: `Loaded ${url}` }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "get_title",
    "获取窗口标题",
    { win_id: z.number().describe("Window ID") },
    async ({ win_id }) => {
      try {
        const win = BrowserWindow.fromId(win_id);
        if (!win) throw new Error(`Window ${win_id} not found`);
        return { content: [{ type: "text", text: win.getTitle() }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );
}

module.exports = { registerWindowTools };
