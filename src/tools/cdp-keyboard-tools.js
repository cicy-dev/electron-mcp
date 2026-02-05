const { BrowserWindow } = require('electron');
const { z } = require("zod");

/**
 * CDP 键盘操作工具
 * 提供基于 Chrome DevTools Protocol 的键盘输入功能
 */
class CDPKeyboardTools {
  /**
   * 注册所有 CDP 键盘工具到 MCP 服务器
   * @param {Object} server - MCP 服务器实例
   */
  static registerTools(server) {
    // 通用按键工具
    server.registerTool(
      "cdp_press_key",
      "使用 CDP 按下指定按键",
      {
        win_id: z.number().describe("窗口ID"),
        key: z.string().describe("按键名称 (如: 'Enter', 'Escape', 'Tab', 'ArrowDown')")
      },
      async ({ win_id, key }) => {
        try {
          const win = BrowserWindow.fromId(win_id);
          if (!win) throw new Error(`Window ${win_id} not found`);

          const debuggerObj = win.webContents.debugger;
          if (!debuggerObj.isAttached()) debuggerObj.attach('1.3');

          await debuggerObj.sendCommand('Input.dispatchKeyEvent', {
            type: 'keyDown',
            key
          });

          await debuggerObj.sendCommand('Input.dispatchKeyEvent', {
            type: 'keyUp',
            key
          });

          return { content: [{ type: "text", text: `Pressed key: ${key}` }] };
        } catch (error) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    // 回车键
    server.registerTool(
      "cdp_press_key_enter",
      "使用 CDP 按下回车键",
      {
        win_id: z.number().describe("窗口ID")
      },
      async ({ win_id }) => {
        try {
          const win = BrowserWindow.fromId(win_id);
          if (!win) throw new Error(`Window ${win_id} not found`);

          const debuggerObj = win.webContents.debugger;
          if (!debuggerObj.isAttached()) debuggerObj.attach('1.3');

          await debuggerObj.sendCommand('Input.dispatchKeyEvent', {
            type: 'keyDown',
            key: 'Enter'
          });

          await debuggerObj.sendCommand('Input.dispatchKeyEvent', {
            type: 'keyUp',
            key: 'Enter'
          });

          return { content: [{ type: "text", text: "Pressed Enter key" }] };
        } catch (error) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    // ESC 键
    server.registerTool(
      "cdp_press_key_esc",
      "使用 CDP 按下ESC键",
      {
        win_id: z.number().describe("窗口ID")
      },
      async ({ win_id }) => {
        try {
          const win = BrowserWindow.fromId(win_id);
          if (!win) throw new Error(`Window ${win_id} not found`);

          const debuggerObj = win.webContents.debugger;
          if (!debuggerObj.isAttached()) debuggerObj.attach('1.3');

          await debuggerObj.sendCommand('Input.dispatchKeyEvent', {
            type: 'keyDown',
            key: 'Escape'
          });

          await debuggerObj.sendCommand('Input.dispatchKeyEvent', {
            type: 'keyUp',
            key: 'Escape'
          });

          return { content: [{ type: "text", text: "Pressed Escape key" }] };
        } catch (error) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    // 复制操作 (Ctrl+C)
    server.registerTool(
      "cdp_press_key_copy",
      "使用 CDP 执行复制操作 (Ctrl+C)",
      {
        win_id: z.number().describe("窗口ID")
      },
      async ({ win_id }) => {
        try {
          const win = BrowserWindow.fromId(win_id);
          if (!win) throw new Error(`Window ${win_id} not found`);

          const debuggerObj = win.webContents.debugger;
          if (!debuggerObj.isAttached()) debuggerObj.attach('1.3');

          await debuggerObj.sendCommand('Input.dispatchKeyEvent', {
            type: 'keyDown',
            key: 'Control'
          });

          await debuggerObj.sendCommand('Input.dispatchKeyEvent', {
            type: 'keyDown',
            key: 'c'
          });

          await debuggerObj.sendCommand('Input.dispatchKeyEvent', {
            type: 'keyUp',
            key: 'c'
          });

          await debuggerObj.sendCommand('Input.dispatchKeyEvent', {
            type: 'keyUp',
            key: 'Control'
          });

          return { content: [{ type: "text", text: "Executed copy (Ctrl+C)" }] };
        } catch (error) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    // 粘贴操作 (Ctrl+V)
    server.registerTool(
      "cdp_press_key_paste",
      "使用 CDP 执行粘贴操作 (Ctrl+V)",
      {
        win_id: z.number().describe("窗口ID")
      },
      async ({ win_id }) => {
        try {
          const win = BrowserWindow.fromId(win_id);
          if (!win) throw new Error(`Window ${win_id} not found`);

          const debuggerObj = win.webContents.debugger;
          if (!debuggerObj.isAttached()) debuggerObj.attach('1.3');

          await debuggerObj.sendCommand('Input.dispatchKeyEvent', {
            type: 'keyDown',
            key: 'Control'
          });

          await debuggerObj.sendCommand('Input.dispatchKeyEvent', {
            type: 'keyDown',
            key: 'v'
          });

          await debuggerObj.sendCommand('Input.dispatchKeyEvent', {
            type: 'keyUp',
            key: 'v'
          });

          await debuggerObj.sendCommand('Input.dispatchKeyEvent', {
            type: 'keyUp',
            key: 'Control'
          });

          return { content: [{ type: "text", text: "Executed paste (Ctrl+V)" }] };
        } catch (error) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    // 文本输入
    server.registerTool(
      "cdp_type_text",
      "使用 CDP 输入文本",
      {
        win_id: z.number().describe("窗口ID"),
        text: z.string().describe("要输入的文本")
      },
      async ({ win_id, text }) => {
        try {
          const win = BrowserWindow.fromId(win_id);
          if (!win) throw new Error(`Window ${win_id} not found`);

          const debuggerObj = win.webContents.debugger;
          if (!debuggerObj.isAttached()) debuggerObj.attach('1.3');

          await debuggerObj.sendCommand('Input.insertText', { text });

          return { content: [{ type: "text", text: `Typed text: ${text}` }] };
        } catch (error) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    );
  }
}

module.exports = { CDPKeyboardTools };