const { BrowserWindow } = require('electron');
const { z } = require("zod");

/**
 * CDP 页面操作工具
 * 提供页面滚动、元素查找、脚本执行等功能
 */
class CdpPageTools {
  /**
   * 注册所有 CDP 页面工具
   * @param {Function} registerTool - 工具注册函数
   */
  static registerTools(registerTool) {
    // 页面滚动
    registerTool(
      "cdp_scroll",
      "使用 CDP 滚动页面",
      {
        win_id: z.number().describe("窗口ID"),
        x: z.number().optional().default(0).describe("水平滚动距离"),
        y: z.number().describe("垂直滚动距离")
      },
      async ({ win_id, x, y }) => {
        try {
          const win = BrowserWindow.fromId(win_id);
          if (!win) throw new Error(`Window ${win_id} not found`);

          const debuggerObj = win.webContents.debugger;
          if (!debuggerObj.isAttached()) debuggerObj.attach('1.3');

          await debuggerObj.sendCommand('Runtime.evaluate', {
            expression: `window.scrollBy(${x}, ${y})`
          });

          return { content: [{ type: "text", text: `Scrolled by (${x}, ${y})` }] };
        } catch (error) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    // 查找元素
    registerTool(
      "cdp_find_element",
      "使用 CDP 查找页面元素",
      {
        win_id: z.number().describe("窗口ID"),
        selector: z.string().describe("CSS选择器")
      },
      async ({ win_id, selector }) => {
        try {
          const win = BrowserWindow.fromId(win_id);
          if (!win) throw new Error(`Window ${win_id} not found`);

          const debuggerObj = win.webContents.debugger;
          if (!debuggerObj.isAttached()) debuggerObj.attach('1.3');

          const result = await debuggerObj.sendCommand('Runtime.evaluate', {
            expression: `document.querySelector('${selector}') ? 'Element found' : 'Element not found'`,
            returnByValue: true
          });

          return { content: [{ type: "text", text: `Search result: ${result.result.value}` }] };
        } catch (error) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    // 获取页面标题
    registerTool(
      "cdp_get_page_title",
      "使用 CDP 获取页面标题",
      {
        win_id: z.number().describe("窗口ID")
      },
      async ({ win_id }) => {
        try {
          const win = BrowserWindow.fromId(win_id);
          if (!win) throw new Error(`Window ${win_id} not found`);

          const debuggerObj = win.webContents.debugger;
          if (!debuggerObj.isAttached()) debuggerObj.attach('1.3');

          const result = await debuggerObj.sendCommand('Runtime.evaluate', {
            expression: 'document.title',
            returnByValue: true
          });

          return { content: [{ type: "text", text: `Page title: ${result.result.value}` }] };
        } catch (error) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    // 获取页面URL
    registerTool(
      "cdp_get_page_url",
      "使用 CDP 获取当前页面URL",
      {
        win_id: z.number().describe("窗口ID")
      },
      async ({ win_id }) => {
        try {
          const win = BrowserWindow.fromId(win_id);
          if (!win) throw new Error(`Window ${win_id} not found`);

          const debuggerObj = win.webContents.debugger;
          if (!debuggerObj.isAttached()) debuggerObj.attach('1.3');

          const result = await debuggerObj.sendCommand('Runtime.evaluate', {
            expression: 'window.location.href',
            returnByValue: true
          });

          return { content: [{ type: "text", text: `Current URL: ${result.result.value}` }] };
        } catch (error) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    // 执行脚本
    registerTool(
      "cdp_execute_script",
      "使用 CDP 执行JavaScript代码",
      {
        win_id: z.number().describe("窗口ID"),
        script: z.string().describe("要执行的JavaScript代码")
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

          return { content: [{ type: "text", text: `Script result: ${JSON.stringify(result.result.value)}` }] };
        } catch (error) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    );
  }
}

module.exports = CdpPageTools;