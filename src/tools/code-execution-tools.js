const { BrowserWindow } = require('electron');
const { z } = require('zod');

function registerCodeExecutionTools(server) {
  server.registerTool(
    "invoke_window",
    "调用 BrowserWindow 方法",
    {
      win_id: z.number().optional().default(1).describe("窗口 ID"),
      code: z.string().describe("JS 代码"),
    },
    async ({ win_id, code }) => {
      try {
        const win = BrowserWindow.fromId(win_id);
        if (!win) throw new Error(`未找到窗口 ${win_id}`);

        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const execute = new AsyncFunction("win", "webContents", code);
        const result = await execute(win, win.webContents);

        let outputText = typeof result === 'object' 
          ? JSON.stringify(result, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2)
          : String(result);

        return { content: [{ type: "text", text: outputText }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "invoke_window_webContents",
    "调用 webContents 方法",
    {
      win_id: z.number().optional().default(1).describe("窗口 ID"),
      code: z.string().describe("JS 代码"),
    },
    async ({ win_id, code }) => {
      try {
        const win = BrowserWindow.fromId(win_id);
        if (!win) throw new Error(`未找到窗口 ${win_id}`);

        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const execute = new AsyncFunction("webContents", "win", code);
        let result = await execute(win.webContents, win);

        if (result?.constructor.name === 'NativeImage') {
          const size = result.getSize();
          const base64 = result.toPNG().toString('base64');
          return {
            content: [
              { type: "text", text: `Image: ${size.width}x${size.height}` },
              { type: "image", data: base64, mimeType: "image/png" }
            ]
          };
        }

        let outputText = typeof result === 'object' 
          ? JSON.stringify(result, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2)
          : String(result);

        return { content: [{ type: "text", text: outputText }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );
}

module.exports = { registerCodeExecutionTools };
