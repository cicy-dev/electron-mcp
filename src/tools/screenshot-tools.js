const { BrowserWindow } = require('electron');
const { z } = require("zod");
const { captureSnapshot } = require('../snapshot-utils');

function registerScreenshotTools(server) {
  server.registerTool(
    "webpage_screenshot_and_to_clipboard",
    "截图并复制到剪贴板",
    { win_id: z.number().optional().describe("窗口 ID") },
    async ({ win_id }) => {
      try {
        const actualWinId = win_id || 1;
        const win = BrowserWindow.fromId(actualWinId);
        if (!win) throw new Error(`Window ${actualWinId} not found`);

        const result = await captureSnapshot(win.webContents, { win_id: actualWinId });
        return result;
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    }
  );
}

module.exports = { registerScreenshotTools };
