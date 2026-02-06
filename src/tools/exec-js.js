const { BrowserWindow } = require("electron");
const { z } = require("zod");

function registerTools(registerTool) {
  registerTool(
    "inject_auto_run_when_dom_ready_js",
    "注入JS代码到localStorage,页面刷新后自动执行。典型用法：1)注入轻量工具函数 2)注入自动化脚本(自动登录、表单填充) 3)修改页面样式或行为 4)注入调试工具。注入一次，永久生效，无需重复操作。示例：先注入function hello(){alert('hi')},刷新后直接调用hello()",
    z.object({
      win_id: z.number().optional().default(1).describe("窗口 ID"),
      code: z.string().describe("JS 代码"),
    }),
    async ({ win_id, code }) => {
      try {
        const win = BrowserWindow.fromId(win_id);
        if (!win) throw new Error(`未找到窗口 ${win_id}`);

        const encodedCode = Buffer.from(code).toString("base64");
        await win.webContents.executeJavaScript(`
          localStorage.setItem('__inject_auto_run_when_dom_ready_js', '${encodedCode}');
        `);

        return { content: [{ type: "text", text: `注入成功，将在页面刷新后自动执行` }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  registerTool(
    "inject_auto_run_when_dom_ready_js_read",
    "读取已注入的自动执行JS代码",
    z.object({
      win_id: z.number().optional().default(1).describe("窗口 ID"),
    }),
    async ({ win_id }) => {
      try {
        const win = BrowserWindow.fromId(win_id);
        if (!win) throw new Error(`未找到窗口 ${win_id}`);

        const encodedCode = await win.webContents.executeJavaScript(`
          localStorage.getItem('__inject_auto_run_when_dom_ready_js') || ''
        `);

        if (!encodedCode) {
          return { content: [{ type: "text", text: "未找到已注入的代码" }] };
        }

        const code = Buffer.from(encodedCode, "base64").toString("utf-8");
        return { content: [{ type: "text", text: `已注入的代码:\n${code}` }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  registerTool(
    "exec_js",
    "在窗口中执行JS代码并返回结果,支持async/await。示例: document.title 或 return document.title 或 await fetch('/api').then(r=>r.json())",
    z.object({
      win_id: z.number().optional().default(1).describe("窗口 ID"),
      code: z.string().describe("JS 代码"),
    }),
    async ({ win_id, code }) => {
      try {
        const win = BrowserWindow.fromId(win_id);
        if (!win) throw new Error(`未找到窗口 ${win_id}`);

        // 简化代码包装逻辑
        let wrappedCode = code.trim();

        // 如果代码不包含 return 且不是多语句，自动添加 return
        if (
          !wrappedCode.includes("return") &&
          !wrappedCode.includes(";") &&
          !wrappedCode.includes("\n")
        ) {
          wrappedCode = `return ${wrappedCode}`;
        }

        // 包装为异步函数
        wrappedCode = `(async () => { ${wrappedCode} })()`;

        const result = await win.webContents.executeJavaScript(wrappedCode);
        return { content: [{ type: "text", text: String(result) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  registerTool(
    "get_element_client_bound",
    "获取页面元素的位置和尺寸信息(getBoundingClientRect)。返回元素的 x, y, width, height, top, left, right, bottom 坐标",
    z.object({
      win_id: z.number().optional().default(1).describe("窗口 ID"),
      selector: z.string().describe("CSS 选择器，如 '#id', '.class', 'button'"),
    }),
    async ({ win_id, selector }) => {
      try {
        const win = BrowserWindow.fromId(win_id);
        if (!win) throw new Error(`未找到窗口 ${win_id}`);

        const result = await win.webContents.executeJavaScript(`
          (function() {
            const el = document.querySelector('${selector.replace(/'/g, "\\'")}');
            if (!el) return { error: 'Element not found' };
            const rect = el.getBoundingClientRect();
            return {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
              top: rect.top,
              left: rect.left,
              right: rect.right,
              bottom: rect.bottom
            };
          })()
        `);

        if (result.error) {
          return { content: [{ type: "text", text: result.error }], isError: true };
        }

        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  registerTool(
    "show_float_div",
    "在页面上显示一个可拖拽、可调整大小的浮动 div，显示当前位置和尺寸信息",
    z.object({
      win_id: z.number().optional().default(1).describe("窗口 ID"),
    }),
    async ({ win_id }) => {
      try {
        const win = BrowserWindow.fromId(win_id);
        if (!win) throw new Error(`未找到窗口 ${win_id}`);

        await win.webContents.debugger.sendCommand("Runtime.evaluate", {
          expression: `
            (function() {
              if (document.getElementById('__float_div__')) return 'Already exists';
              
              const div = document.createElement('div');
              div.id = '__float_div__';
              div.style.cssText = 'position:fixed;left:20px;top:20px;width:80px;height:80px;background:rgba(0,0,0,0.8);color:#fff;z-index:999999;cursor:move;font-size:12px;display:flex;align-items:center;justify-content:center;user-select:none;border:2px solid #fff;';
              
              let x = 20, y = 20, w = 80, h = 80;
              const update = () => div.textContent = x + ',' + y + '|' + w + ',' + h;
              update();
              
              let isDrag = false, isResize = false, startX, startY;
              
              div.addEventListener('mousedown', e => {
                if (e.offsetX > w - 10 && e.offsetY > h - 10) {
                  isResize = true;
                } else {
                  isDrag = true;
                }
                startX = e.clientX;
                startY = e.clientY;
                e.preventDefault();
              });
              
              document.addEventListener('mousemove', e => {
                if (isDrag) {
                  x += e.clientX - startX;
                  y += e.clientY - startY;
                  div.style.left = x + 'px';
                  div.style.top = y + 'px';
                  startX = e.clientX;
                  startY = e.clientY;
                  update();
                } else if (isResize) {
                  w += e.clientX - startX;
                  h += e.clientY - startY;
                  div.style.width = w + 'px';
                  div.style.height = h + 'px';
                  startX = e.clientX;
                  startY = e.clientY;
                  update();
                }
              });
              
              document.addEventListener('mouseup', () => {
                isDrag = false;
                isResize = false;
              });
              
              document.body.appendChild(div);
              return 'Float div created';
            })()
          `,
        });

        return { content: [{ type: "text", text: "Float div displayed" }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  registerTool(
    "del_float_div",
    "删除浮动 div",
    z.object({
      win_id: z.number().optional().default(1).describe("窗口 ID"),
    }),
    async ({ win_id }) => {
      try {
        const win = BrowserWindow.fromId(win_id);
        if (!win) throw new Error(`未找到窗口 ${win_id}`);

        await win.webContents.debugger.sendCommand("Runtime.evaluate", {
          expression: `
            (function() {
              const div = document.getElementById('__float_div__');
              if (div) {
                div.remove();
                return 'Float div removed';
              }
              return 'Float div not found';
            })()
          `,
        });

        return { content: [{ type: "text", text: "Float div removed" }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );
}

module.exports = registerTools;
