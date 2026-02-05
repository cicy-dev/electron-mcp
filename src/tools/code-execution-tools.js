const { BrowserWindow } = require('electron');
const { z } = require('zod');

/**
 * 代码执行工具模块
 * 提供在 Electron 窗口和 webContents 中执行代码的功能
 */

function registerCodeExecutionTools(server) {
  // 注册工具的辅助函数
  const registerTool = (name, description, schema, handler) => {
    server.registerTool(name, { title: name, description, inputSchema: schema }, handler);
  };

  registerTool(
    "invoke_window",
    `直接调用 Electron BrowserWindow 实例的方法和属性。这是窗口控制的核心工具，支持所有窗口操作。

主要用途：
- 窗口控制：移动、调整大小、最小化、最大化
- 状态管理：设置置顶、焦点、可见性
- 属性获取：获取窗口位置、大小、状态
- 高级操作：设置透明度、边框、图标等

代码执行环境：可访问 win (BrowserWindow实例) 和 webContents 对象
支持 async/await 语法，代码需以 'return' 返回结果`,
    {
      win_id: z.number().optional().default(1).describe("窗口 ID"),
      code: z.string().describe("要执行的 JS 代码。例如: 'return win.getBounds()' 或 'win.maximize()'")
    },
    async ({ win_id, code }) => {
      try {
        const win = BrowserWindow.fromId(win_id);
        if (!win) throw new Error(`未找到 ID 为 ${win_id} 的窗口`);

        // 使用 AsyncFunction 注入变量
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const execute = new AsyncFunction("win", "webContents", code);

        // 执行代码，同时传入 win 和其关联的 webContents 方便调用
        const result = await execute(win, win.webContents);

        // 处理返回结果
        let outputText;
        if (result && typeof result === 'object') {
          // 防止 circular reference (循环引用)，BrowserWindow 对象不能直接 stringify
          outputText = JSON.stringify(result, (key, value) =>
              typeof value === 'bigint' ? value.toString() : value, 2
          );
        } else {
          outputText = String(result);
        }

        return {
          content: [{ type: "text", text: outputText }],
        };

      } catch (error) {
        return {
          content: [{ type: "text", text: `执行失败: ${error.message}` }],
          isError: true,
        };
      }
    }
  );

  registerTool(
    "invoke_window_webContents",
    `调用 Electron webContents 的方法和属性。这是网页内容操作的核心工具，用于与页面进行交互。

主要用途：
- 页面操作：截图、打印、缩放、导航
- 内容获取：获取URL、标题、源码
- 脚本执行：在页面中执行JavaScript代码
- 开发调试：获取控制台信息、性能数据
- 媒体控制：音频/视频播放控制

代码执行环境：可访问 webContents, win 对象
支持 async/await 语法，代码需以 'return' 返回结果
自动处理 NativeImage 返回为 MCP 图像格式`,
    {
      win_id: z.number().optional().default(1).describe("窗口 ID"),
      code: z.string().describe("要执行的 JS 代码。例如: 'return webContents.getURL()' 或 'return await webContents.capturePage()'")
    },
    async ({ win_id, code }) => {
      try {
        const win = BrowserWindow.fromId(win_id);
        if (!win) throw new Error(`未找到 ID 为 ${win_id} 的窗口`);
        const webContents = win.webContents;

        // 使用 AsyncFunction 来支持代码中的 await
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

        // 创建执行环境，将 webContents 作为参数传入
        const execute = new AsyncFunction("webContents", "win", code);

        // 执行并获取返回结果
        let result = await execute(webContents, win);

        // 序列化处理：处理 NativeImage, Buffer 或循环引用
        let outputText;
        if (result && typeof result === 'object') {
          if (result.constructor.name === 'NativeImage') {
            // 如果返回的是图片，自动转为 base64 和尺寸信息
            const size = result.getSize();
            const base64 = result.toPNG().toString('base64');
            return {
              content: [
                { type: "text", text: `Captured Image: ${size.width}x${size.height}` },
                { type: "image", data: base64, mimeType: "image/png" }
              ]
            };
          }
          // 普通对象尝试 JSON 序列化
          outputText = JSON.stringify(result, (key, value) =>
              typeof value === 'bigint' ? value.toString() : value, 2
          );
        } else {
          outputText = String(result);
        }

        return {
          content: [{ type: "text", text: outputText }],
        };

      } catch (error) {
        return {
          content: [{ type: "text", text: `执行失败: ${error.message}\n堆栈: ${error.stack}` }],
          isError: true,
        };
      }
    }
  );

  registerTool(
    "invoke_window_webContents_debugger_cdp",
    `使用 Chrome DevTools Protocol (CDP) 进行高级调试和页面控制。这是最强大的页面操作工具。

主要用途：
- 高级调试：断点、变量检查、性能分析
- DOM操作：元素查找、属性修改、事件模拟
- 网络监控：请求拦截、响应修改、性能监控
- 脚本注入：在页面任意时机执行代码
- 安全测试：绕过页面限制进行深度测试

使用方法：
1. 先调用 debuggerObj.attach('1.3') 附加调试器
2. 使用 debuggerObj.sendCommand(method, params) 发送CDP命令
3. 完成后调用 debuggerObj.detach() 分离调试器

代码执行环境：可访问 debuggerObj, webContents, win 对象
支持 async/await 语法，代码需以 'return' 返回结果`,
    {
      win_id: z.number().optional().default(1).describe("窗口 ID"),
      code: z.string().describe("要执行的 debugger CDP 代码。例如: 'return debuggerObj.sendCommand()' 或 'return await debuggerObj.sendCommand()' 注意：debugger 对象通过 debuggerObj 变量访问")
    },
    async ({ win_id, code }) => {
      try {
        const win = BrowserWindow.fromId(win_id);
        if (!win) throw new Error(`未找到 ID 为 ${win_id} 的窗口`);
        const webContents = win.webContents;

        // 使用 AsyncFunction 来支持代码中的 await
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

        // 创建执行环境，将 webContents, win, debugger 作为参数传入
        const execute = new AsyncFunction("webContents", "win", "debuggerObj", code);

        // 执行并获取返回结果
        let result = await execute(webContents, win, webContents.debugger);

        // 序列化处理：处理 NativeImage, Buffer 或循环引用
        let outputText;
        if (result && typeof result === 'object') {
          if (result.constructor.name === 'NativeImage') {
            // 如果返回的是图片，自动转为 base64 和尺寸信息
            const size = result.getSize();
            const base64 = result.toPNG().toString('base64');
            return {
              content: [
                { type: "text", text: `Captured Image: ${size.width}x${size.height}` },
                { type: "image", data: base64, mimeType: "image/png" }
              ]
            };
          }
          // 普通对象尝试 JSON 序列化
          outputText = JSON.stringify(result, (key, value) =>
              typeof value === 'bigint' ? value.toString() : value, 2
          );
        } else {
          outputText = String(result);
        }

        return {
          content: [{ type: "text", text: outputText }],
        };

      } catch (error) {
        return {
          content: [{ type: "text", text: `执行失败: ${error.message}\n堆栈: ${error.stack}` }],
          isError: true,
        };
      }
    }
  );
}

module.exports = { registerCodeExecutionTools };