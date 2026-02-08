const { startTestServer, stopTestServer } = require("./setup-test-server");
const { callRPC } = require("./rpc-helper");

describe("RPC API - JS注入工具测试", () => {
  beforeAll(async () => {
    await startTestServer();
  }, 30000);

  afterAll(async () => {
    await stopTestServer();
  });

  describe("JS注入工具测试", () => {
    let winId;

    test("应该打开测试窗口", async () => {
      const result = await callRPC("open_window", { url: "https://google.com" });
      expect(result).toBeDefined();
      const text = result.content[0].text;
      winId = parseInt(text.match(/\d+/)[0]);
      expect(winId).toBeGreaterThan(0);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    });

    test("应该注入JS代码", async () => {
      const code = 'window.testValue = 123; console.log("injected");';
      const result = await callRPC("inject_auto_run_when_dom_ready_js", { win_id: winId, code });
      expect(result.content[0].text).toContain("注入成功");
    });

    test("应该读取已注入的代码", async () => {
      const result = await callRPC("inject_auto_run_when_dom_ready_js_read", { win_id: winId });
      expect(result.content[0].text).toContain("window.testValue");
    });

    test("刷新后应该自动执行注入的代码", async () => {
      await callRPC("load_url", { win_id: winId, url: "https://google.com" });
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const result = await callRPC("exec_js", { win_id: winId, code: "return window.testValue" });
      expect(result.content[0].text).toContain("123");
    });

    test("exec_js应该支持表达式语法", async () => {
      const result = await callRPC("exec_js", { win_id: winId, code: "document.title" });
      expect(result.content[0].text).toBeTruthy();
    });

    test("exec_js应该支持return语句", async () => {
      const result = await callRPC("exec_js", { win_id: winId, code: "return document.title" });
      expect(result.content[0].text).toBeTruthy();
    });

    test("exec_js应该支持await", async () => {
      const result = await callRPC("exec_js", { win_id: winId, code: "await Promise.resolve(456)" });
      expect(result.content[0].text).toBe("456");
    });

    test("exec_js应该支持多行代码", async () => {
      const result = await callRPC("exec_js", { win_id: winId, code: "const x = 10; const y = 20; return x + y;" });
      expect(result.content[0].text).toBe("30");
    });

    test("应该获取元素的位置和尺寸", async () => {
      const result = await callRPC("get_element_client_bound", { win_id: winId, selector: "body" });
      expect(result).toBeDefined();
      const text = result.content[0].text;
      if (!text.includes("未找到匹配的元素")) {
        const parsed = JSON.parse(text);
        expect(parsed).toHaveProperty("x");
        expect(parsed).toHaveProperty("y");
        expect(parsed).toHaveProperty("width");
        expect(parsed).toHaveProperty("height");
        expect(parsed.count).toBe(1);
      }
    });

    test("selector为空时应抛出异常", async () => {
      const result = await callRPC("get_element_client_bound", { win_id: winId, selector: "" });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("不能为空");
    });

    test("selector匹配多个元素时应抛出异常", async () => {
      const result = await callRPC("get_element_client_bound", { win_id: winId, selector: "a" });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("多个元素");
    });

    test("应该显示浮动 div", async () => {
      const result = await callRPC("show_float_div", { win_id: winId });
      expect(result.content[0].text).toContain("浮动 div");

      const boundResult = await callRPC("get_element_client_bound", { win_id: winId, selector: "#__float_div__" });
      expect(boundResult.content[0].text).toContain("left");
      expect(boundResult.content[0].text).toContain("top");
      expect(boundResult.content[0].text).toContain("width");
      expect(boundResult.content[0].text).toContain("height");
    });
  });

  describe("注入自动执行JS测试 (同域localStorage)", () => {
    let testWinId;

    beforeAll(async () => {
      const result = await callRPC("open_window", { url: "https://example.com" });
      testWinId = parseInt(result.content[0].text.match(/\d+/)[0]);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    });

    test("注入后reload验证自动执行", async () => {
      const injectCode =
        "(function() { const div = document.createElement('div'); div.id = 'test-red-div'; div.style.cssText = 'position:fixed;top:100px;left:50%;transform:translateX(-50%);width:200px;height:100px;background-color:red;color:white;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold;z-index:999999;border-radius:10px;'; div.textContent = 'Test Div'; document.body.appendChild(div); setTimeout(function() { div.remove(); }, 4000); })();";
      const injectResult = await callRPC("inject_auto_run_when_dom_ready_js", { win_id: testWinId, code: injectCode });
      expect(injectResult.content[0].text).toContain("注入成功");

      await callRPC("exec_js", { win_id: testWinId, code: "location.reload()" });
      await new Promise((resolve) => setTimeout(resolve, 3500));

      const checkResult = await callRPC("exec_js", {
        win_id: testWinId,
        code: "return document.getElementById('test-red-div') !== null",
      });
      expect(checkResult.content[0].text).toBe("true");

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const afterHideResult = await callRPC("exec_js", {
        win_id: testWinId,
        code: "return document.getElementById('test-red-div') === null",
      });
      expect(afterHideResult.content[0].text).toBe("true");
    });

    test("注入后导航到同域不同URL验证自动执行", async () => {
      const injectCode =
        "(function() { window.__inject_test_marker__ = true; window.__inject_test_time__ = Date.now(); })();";
      const injectResult = await callRPC("inject_auto_run_when_dom_ready_js", { win_id: testWinId, code: injectCode });
      expect(injectResult.content[0].text).toContain("注入成功");

      await callRPC("load_url", { win_id: testWinId, url: "https://example.com/different-page" });
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const checkResult = await callRPC("exec_js", {
        win_id: testWinId,
        code: "return JSON.stringify({ marker: window.__inject_test_marker__, hasTime: window.__inject_test_time__ > 0 })",
      });

      const resultText = checkResult.content[0].text;
      expect(resultText).toContain("true");
    });
  });
});
