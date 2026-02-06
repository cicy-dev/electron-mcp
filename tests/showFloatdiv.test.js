const { setPort, setupTest, teardownTest, sendRequest } = require("./test-utils");

describe("MCP HTTP API - show_float_div 测试套件", () => {
  beforeAll(async () => {
    setPort(9899);
    await setupTest();
  }, 30000);

  afterAll(async () => {
    await teardownTest(true);
  });

  describe("基础功能测试", () => {
    test("应该打开测试窗口", async () => {
      const response = await sendRequest("tools/call", {
        name: "open_window",
        arguments: { url: "https://example.com" },
      });
      expect(response.result).toBeDefined();
      const text = response.result.content[0].text;
      console.log(response.result)
      const match = text.match(/ID[:\s]+(\d+)/i);
      expect(match).toBeTruthy();
      global.testWinId = parseInt(match[1]);
      console.log(global.testWinId)
      expect(global.testWinId).toBeDefined();
    });

    test("应该等待窗口加载完成", async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const response = await sendRequest("tools/call", {
        name: "get_window_info",
        arguments: { win_id: global.testWinId },
      });
      expect(response.result.content[0].text).toBeDefined();
    });

    test("show_float_div 应该正常执行", async () => {
      const response = await sendRequest("tools/call", {
        name: "show_float_div",
        arguments: { win_id: global.testWinId },
      });
      expect(response.result).toBeDefined();
      expect(response.result.content[0].text).toContain("OK");
    });

    test("浮动 div 应该存在于 DOM", async () => {
      const response = await sendRequest("tools/call", {
        name: "exec_js",
        arguments: {
          win_id: global.testWinId,
          code: "document.getElementById('__float_div__') !== null",
        },
      });
      expect(response.result.content[0].text).toContain("true");
    });

    test("应该能获取浮动 div 的位置和尺寸", async () => {
      const response = await sendRequest("tools/call", {
        name: "get_element_client_bound",
        arguments: {
          win_id: global.testWinId,
          selector: "#__float_div__",
        },
      });
      const text = response.result.content[0].text;
      expect(text).toContain("left");
      expect(text).toContain("top");
      expect(text).toContain("width");
      expect(text).toContain("height");
    });
  });
});
