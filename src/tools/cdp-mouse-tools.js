const { BrowserWindow } = require('electron');
const { z } = require("zod");

/**
 * CDP 鼠标操作工具
 * 提供基于 Chrome DevTools Protocol 的鼠标交互功能
 */
class CDPMouseTools {
  /**
   * 注册所有 CDP 鼠标工具到 MCP 服务器
   * @param {Object} server - MCP 服务器实例
   */
  static registerTools(server) {
    // CDP 点击工具
    server.registerTool(
      "cdp_click",
      "使用 CDP 点击页面指定坐标",
      {
        win_id: z.number().describe("窗口ID"),
        x: z.number().describe("X坐标"),
        y: z.number().describe("Y坐标"),
        button: z.enum(["left", "right", "middle"]).optional().default("left").describe("鼠标按钮")
      },
      async ({ win_id, x, y, button }) => {
        try {
          const win = BrowserWindow.fromId(win_id);
          if (!win) throw new Error(`Window ${win_id} not found`);

          const debuggerObj = win.webContents.debugger;
          if (!debuggerObj.isAttached()) debuggerObj.attach('1.3');

          await debuggerObj.sendCommand('Input.dispatchMouseEvent', {
            type: 'mousePressed',
            x, y, button,
            clickCount: 1
          });

          await debuggerObj.sendCommand('Input.dispatchMouseEvent', {
            type: 'mouseReleased',
            x, y, button,
            clickCount: 1
          });

          return { content: [{ type: "text", text: `Clicked at (${x}, ${y}) with ${button} button` }] };
        } catch (error) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    // CDP 双击工具
    server.registerTool(
      "cdp_double_click",
      "使用 CDP 双击页面指定坐标",
      {
        win_id: z.number().describe("窗口ID"),
        x: z.number().describe("X坐标"),
        y: z.number().describe("Y坐标")
      },
      async ({ win_id, x, y }) => {
        try {
          const win = BrowserWindow.fromId(win_id);
          if (!win) throw new Error(`Window ${win_id} not found`);

          const debuggerObj = win.webContents.debugger;
          if (!debuggerObj.isAttached()) debuggerObj.attach('1.3');

          await debuggerObj.sendCommand('Input.dispatchMouseEvent', {
            type: 'mousePressed',
            x, y, button: 'left',
            clickCount: 2
          });

          await debuggerObj.sendCommand('Input.dispatchMouseEvent', {
            type: 'mouseReleased',
            x, y, button: 'left',
            clickCount: 2
          });

          return { content: [{ type: "text", text: `Double clicked at (${x}, ${y})` }] };
        } catch (error) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    );
  }
}

module.exports = { CDPMouseTools };