const { BrowserWindow } = require('electron');
const { z } = require("zod");

function registerTools(server) {
  server.registerTool(
    "cdp_press_key",
    "使用 CDP 按键",
    {
      win_id: z.number().describe("窗口 ID"),
      key: z.string().describe("按键名称"),
    },
    async ({ win_id, key }) => {
      try {
        const win = BrowserWindow.fromId(win_id);
        if (!win) throw new Error(`Window ${win_id} not found`);

        const debuggerObj = win.webContents.debugger;
        if (!debuggerObj.isAttached()) debuggerObj.attach('1.3');

        await debuggerObj.sendCommand('Input.dispatchKeyEvent', { type: 'keyDown', key });
        await debuggerObj.sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key });

        return { content: [{ type: "text", text: `Pressed ${key}` }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "cdp_press_key_enter",
    "使用 CDP 按回车",
    { win_id: z.number().describe("窗口 ID") },
    async ({ win_id }) => {
      try {
        const win = BrowserWindow.fromId(win_id);
        if (!win) throw new Error(`Window ${win_id} not found`);

        const debuggerObj = win.webContents.debugger;
        if (!debuggerObj.isAttached()) debuggerObj.attach('1.3');

        await debuggerObj.sendCommand('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter' });
        await debuggerObj.sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter' });

        return { content: [{ type: "text", text: "Pressed Enter" }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "cdp_type_text",
    "使用 CDP 输入文本",
    {
      win_id: z.number().describe("窗口 ID"),
      text: z.string().describe("文本内容"),
    },
    async ({ win_id, text }) => {
      try {
        const win = BrowserWindow.fromId(win_id);
        if (!win) throw new Error(`Window ${win_id} not found`);

        const debuggerObj = win.webContents.debugger;
        if (!debuggerObj.isAttached()) debuggerObj.attach('1.3');

        await debuggerObj.sendCommand('Input.insertText', { text });

        return { content: [{ type: "text", text: `Typed: ${text}` }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );
}

module.exports = registerTools;
