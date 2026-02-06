const { setPort, setupTest, teardownTest, sendRequest } = require("./test-utils");

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
        arguments: { url: "https://google.com" },
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
        arguments: { win_id: winId, url: "https://google.com" },
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
        arguments: { win_id: winId, selector: "body" },
      });
      expect(response.result).toBeDefined();
      const text = response.result.content[0].text;
      if (!text.includes("未找到匹配的元素")) {
        const result = JSON.parse(text);
        expect(result).toHaveProperty("x");
        expect(result).toHaveProperty("y");
        expect(result).toHaveProperty("width");
        expect(result).toHaveProperty("height");
        expect(result.count).toBe(1);
      }
    });

    test("selector为空时应抛出异常", async () => {
      const response = await sendRequest("tools/call", {
        name: "get_element_client_bound",
        arguments: { win_id: winId, selector: "" },
      });
      expect(response.result.isError).toBe(true);
      expect(response.result.content[0].text).toContain("不能为空");
    });

    test("selector匹配多个元素时应抛出异常", async () => {
      const response = await sendRequest("tools/call", {
        name: "get_element_client_bound",
        arguments: { win_id: winId, selector: "a" },
      });
      expect(response.result.isError).toBe(true);
      expect(response.result.content[0].text).toContain("多个元素");
    });

    test("应该显示浮动 div", async () => {
      const response = await sendRequest("tools/call", {
        name: "show_float_div",
        arguments: { win_id: winId },
      });
      expect(response.result.content[0].text).toContain("浮动 div");

      const boundResponse = await sendRequest("tools/call", {
        name: "get_element_client_bound",
        arguments: { win_id: winId, selector: "#__float_div__" },
      });
      expect(boundResponse.result.content[0].text).toContain("left");
      expect(boundResponse.result.content[0].text).toContain("top");
      expect(boundResponse.result.content[0].text).toContain("width");
      expect(boundResponse.result.content[0].text).toContain("height");
    });
  });

  describe("注入自动执行JS测试 (同域localStorage)", () => {
    let testWinId;

    beforeAll(async () => {
      const openResponse = await sendRequest("tools/call", {
        name: "open_window",
        arguments: { url: "https://example.com" },
      });
      testWinId = parseInt(openResponse.result.content[0].text.match(/\d+/)[0]);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    });

    test("注入后reload验证自动执行", async () => {
      const injectCode =
        "(function() { const div = document.createElement('div'); div.id = 'test-red-div'; div.style.cssText = 'position:fixed;top:100px;left:50%;transform:translateX(-50%);width:200px;height:100px;background-color:red;color:white;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold;z-index:999999;border-radius:10px;'; div.textContent = 'Test Div'; document.body.appendChild(div); setTimeout(function() { div.remove(); }, 4000); })();";
      const injectResponse = await sendRequest("tools/call", {
        name: "inject_auto_run_when_dom_ready_js",
        arguments: { win_id: testWinId, code: injectCode },
      });
      expect(injectResponse.result.content[0].text).toContain("注入成功");

      await sendRequest("tools/call", {
        name: "exec_js",
        arguments: { win_id: testWinId, code: "location.reload()" },
      });

      await new Promise((resolve) => setTimeout(resolve, 3500));

      const checkResponse = await sendRequest("tools/call", {
        name: "exec_js",
        arguments: {
          win_id: testWinId,
          code: "return document.getElementById('test-red-div') !== null",
        },
      });
      expect(checkResponse.result.content[0].text).toBe("true");

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const afterHideResponse = await sendRequest("tools/call", {
        name: "exec_js",
        arguments: {
          win_id: testWinId,
          code: "return document.getElementById('test-red-div') === null",
        },
      });
      expect(afterHideResponse.result.content[0].text).toBe("true");
    });

    test("注入后导航到同域不同URL验证自动执行", async () => {
      const injectCode =
        "(function() { window.__inject_test_marker__ = true; window.__inject_test_time__ = Date.now(); })();";
      const injectResponse = await sendRequest("tools/call", {
        name: "inject_auto_run_when_dom_ready_js",
        arguments: { win_id: testWinId, code: injectCode },
      });
      expect(injectResponse.result.content[0].text).toContain("注入成功");

      await sendRequest("tools/call", {
        name: "load_url",
        arguments: { win_id: testWinId, url: "https://example.com/different-page" },
      });
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const checkResponse = await sendRequest("tools/call", {
        name: "exec_js",
        arguments: {
          win_id: testWinId,
          code: "return JSON.stringify({ marker: window.__inject_test_marker__, hasTime: window.__inject_test_time__ > 0 })",
        },
      });

      const resultText = checkResponse.result.content[0].text;
      expect(resultText).toContain("true");
    });
  });
});
