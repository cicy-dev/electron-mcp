const { setPort, setupTest, teardownTest, sendRequest, getSessionId } = require("./test-utils");

describe("MCP HTTP API - JS注入工具测试", () => {
  beforeAll(async () => {
    setPort(9845);
    await setupTest();
  }, 30000);

  afterAll(async () => {
    await teardownTest();
  });

  describe("JS注入工具测试", () => {
    let winId;

    test("应该打开测试窗口", async () => {
      const response = await sendRequest("tools/call", {
        name: "open_window",
        arguments: { url: "https://example.com" },
      });
      expect(response.result).toBeDefined();
      const text = response.result.content[0].text;
      winId = parseInt(text.match(/\d+/)[0]);
      expect(winId).toBeGreaterThan(0);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    });

    test("应该注入JS代码", async () => {
      const code = 'window.testValue = 123; console.log("injected");';
      const response = await sendRequest("tools/call", {
        name: "inject_auto_run_when_dom_ready_js",
        arguments: { win_id: winId, code },
      });
      expect(response.result.content[0].text).toContain("注入成功");
    });

    test("应该读取已注入的代码", async () => {
      const response = await sendRequest("tools/call", {
        name: "inject_auto_run_when_dom_ready_js_read",
        arguments: { win_id: winId },
      });
      expect(response.result.content[0].text).toContain("window.testValue");
    });

    test("刷新后应该自动执行注入的代码", async () => {
      await sendRequest("tools/call", {
        name: "load_url",
        arguments: { win_id: winId, url: "https://example.com" },
      });
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const response = await sendRequest("tools/call", {
        name: "exec_js",
        arguments: { win_id: winId, code: "return window.testValue" },
      });
      expect(response.result.content[0].text).toContain("123");
    });

    test("exec_js应该支持表达式语法", async () => {
      const response = await sendRequest("tools/call", {
        name: "exec_js",
        arguments: { win_id: winId, code: "document.title" },
      });
      expect(response.result.content[0].text).toBeTruthy();
    });

    test("exec_js应该支持return语句", async () => {
      const response = await sendRequest("tools/call", {
        name: "exec_js",
        arguments: { win_id: winId, code: "return document.title" },
      });
      expect(response.result.content[0].text).toBeTruthy();
    });

    test("exec_js应该支持await", async () => {
      const response = await sendRequest("tools/call", {
        name: "exec_js",
        arguments: { win_id: winId, code: "await Promise.resolve(456)" },
      });
      expect(response.result.content[0].text).toBe("456");
    });

    test("exec_js应该支持多行代码", async () => {
      const response = await sendRequest("tools/call", {
        name: "exec_js",
        arguments: { win_id: winId, code: "const x = 10; const y = 20; return x + y;" },
      });
      expect(response.result.content[0].text).toBe("30");
    });

    test("应该获取元素的位置和尺寸", async () => {
      const response = await sendRequest("tools/call", {
        name: "get_element_client_bound",
        arguments: { win_id: winId, selector: "h1" },
      });
      expect(response.result).toBeDefined();
      const result = JSON.parse(response.result.content[0].text);
      expect(result).toHaveProperty("x");
      expect(result).toHaveProperty("y");
      expect(result).toHaveProperty("width");
      expect(result).toHaveProperty("height");
    });

    test("应该显示浮动 div", async () => {
      const response = await sendRequest("tools/call", {
        name: "show_float_div",
        arguments: { win_id: winId },
      });
      expect(response.result.content[0].text).toContain("Float div displayed");
    });

    test("应该删除浮动 div", async () => {
      const response = await sendRequest("tools/call", {
        name: "del_float_div",
        arguments: { win_id: winId },
      });
      expect(response.result.content[0].text).toContain("Float div removed");
    });
  });
});
