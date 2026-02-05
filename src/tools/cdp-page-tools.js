const { BrowserWindow } = require('electron');
const { z } = require("zod");

function registerTools(server) {
  server.registerTool(
    "cdp_scroll",
    "使用 CDP 滚动页面",
    {
      win_id: z.number().describe("窗口 ID"),
      x: z.number().optional().default(0).describe("水平滚动"),
      y: z.number().describe("垂直滚动"),
    },
    async ({ win_id, x, y }) => {
      try {
        const win = BrowserWindow.fromId(win_id);
        if (!win) throw new Error(`Window ${win_id} not found`);

        const debuggerObj = win.webContents.debugger;
        if (!debuggerObj.isAttached()) debuggerObj.attach('1.3');

        await debuggerObj.sendCommand('Runtime.evaluate', { expression: `window.scrollBy(${x}, ${y})` });

        return { content: [{ type: "text", text: `Scrolled (${x}, ${y})` }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "cdp_find_element",
    "使用 CDP 查找元素",
    {
      win_id: z.number().describe("窗口 ID"),
      selector: z.string().describe("CSS 选择器"),
    },
    async ({ win_id, selector }) => {
      try {
        const win = BrowserWindow.fromId(win_id);
        if (!win) throw new Error(`Window ${win_id} not found`);

        const debuggerObj = win.webContents.debugger;
        if (!debuggerObj.isAttached()) debuggerObj.attach('1.3');

        const result = await debuggerObj.sendCommand('Runtime.evaluate', {
          expression: `document.querySelector('${selector}') ? 'Found' : 'Not found'`,
          returnByValue: true
        });

        return { content: [{ type: "text", text: result.result.value }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "cdp_execute_script",
    "使用 CDP 执行脚本",
    {
      win_id: z.number().describe("窗口 ID"),
      script: z.string().describe("JS 代码"),
    },
    async ({ win_id, script }) => {
      try {
        const win = BrowserWindow.fromId(win_id);
        if (!win) throw new Error(`Window ${win_id} not found`);

        const debuggerObj = win.webContents.debugger;
        if (!debuggerObj.isAttached()) debuggerObj.attach('1.3');

        const result = await debuggerObj.sendCommand('Runtime.evaluate', {
          expression: script,
          returnByValue: true
        });

        return { content: [{ type: "text", text: JSON.stringify(result.result.value) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );
}

module.exports = registerTools;
