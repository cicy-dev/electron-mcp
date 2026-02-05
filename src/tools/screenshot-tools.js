const { BrowserWindow } = require('electron');
const { z } = require("zod");
const { captureSnapshot } = require('../snapshot-utils');

/**
 * 截图工具模块
 * 提供页面截图和剪贴板操作功能
 */
class ScreenshotTools {
  /**
   * 注册所有截图相关工具
   * @param {Function} registerTool - 工具注册函数
   */
  static registerTools(registerTool) {
    // 页面截图并复制到剪贴板
    registerTool(
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
  }
}

module.exports = ScreenshotTools;