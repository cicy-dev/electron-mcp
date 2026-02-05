const { BrowserWindow } = require('electron');
const { z } = require("zod");

function registerTools(server) {
  server.registerTool(
    "cdp_click",
    "使用 CDP 点击坐标",
    {
      win_id: z.number().describe("窗口 ID"),
      x: z.number().describe("X 坐标"),
      y: z.number().describe("Y 坐标"),
      button: z.enum(["left", "right", "middle"]).optional().default("left").describe("鼠标按钮"),
    },
    async ({ win_id, x, y, button }) => {
      try {
        const win = BrowserWindow.fromId(win_id);
        if (!win) throw new Error(`Window ${win_id} not found`);

        const debuggerObj = win.webContents.debugger;
        if (!debuggerObj.isAttached()) debuggerObj.attach('1.3');

        await debuggerObj.sendCommand('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button, clickCount: 1 });
        await debuggerObj.sendCommand('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button, clickCount: 1 });

        return { content: [{ type: "text", text: `Clicked (${x}, ${y})` }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "cdp_double_click",
    "使用 CDP 双击坐标",
    {
      win_id: z.number().describe("窗口 ID"),
      x: z.number().describe("X 坐标"),
      y: z.number().describe("Y 坐标"),
    },
    async ({ win_id, x, y }) => {
      try {
        const win = BrowserWindow.fromId(win_id);
        if (!win) throw new Error(`Window ${win_id} not found`);

        const debuggerObj = win.webContents.debugger;
        if (!debuggerObj.isAttached()) debuggerObj.attach('1.3');

        await debuggerObj.sendCommand('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 2 });
        await debuggerObj.sendCommand('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 2 });

        return { content: [{ type: "text", text: `Double clicked (${x}, ${y})` }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );
}

module.exports = registerTools;
