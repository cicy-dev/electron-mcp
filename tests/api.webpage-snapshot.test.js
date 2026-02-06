const { setPort, setupTest, teardownTest, sendRequest } = require("./test-utils");

describe("MCP HTTP API - webpage_snapshot 工具测试", () => {
  let winId;
  const testPageUrl = "https://example.com";

  beforeAll(async () => {
    setPort(9845);
    await setupTest();
  }, 30000);

  afterAll(async () => {
    await teardownTest();
  });

  describe("基础功能测试", () => {
    test("应该打开测试窗口并加载页面", async () => {
      const response = await sendRequest("tools/call", {
        name: "open_window",
        arguments: { url: testPageUrl },
      });
      expect(response.result).toBeDefined();
      const text = response.result.content[0].text;
      expect(text).toContain("Opened window");
      winId = parseInt(text.match(/\d+/)[0]);
      expect(winId).toBeGreaterThan(0);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    });

    test("应该获取窗口基本信息", async () => {
      const response = await sendRequest("tools/call", {
        name: "get_window_info",
        arguments: { win_id: winId },
      });
      expect(response.result).toBeDefined();
      const info = JSON.parse(response.result.content[0].text);
      expect(info.id).toBe(winId);
    });
  });

  describe("webpage_snapshot 基础测试", () => {
    test("应该返回页面结构快照基本信息", async () => {
      const response = await sendRequest("tools/call", {
        name: "webpage_snapshot",
        arguments: { win_id: winId },
      });

      expect(response.result).toBeDefined();
      expect(response.result.content).toBeDefined();
      expect(response.result.content.length).toBeGreaterThan(0);

      const textContent = response.result.content[0].text;
      expect(textContent).toContain("Page Snapshot");
      expect(textContent).toContain("Interactive Elements");
    });

    test("应该包含页面 url (小写) 和标题", async () => {
      const response = await sendRequest("tools/call", {
        name: "webpage_snapshot",
        arguments: { win_id: winId },
      });

      const textContent = response.result.content[0].text;
      expect(textContent).toContain("url:");
      expect(textContent).toContain("title:");
      expect(textContent).toContain(testPageUrl);
    });

    test("应该包含视口信息", async () => {
      const response = await sendRequest("tools/call", {
        name: "webpage_snapshot",
        arguments: { win_id: winId },
      });

      const textContent = response.result.content[0].text;
      expect(textContent).toContain("viewport:");
      expect(textContent).toMatch(/viewport:\s*\d+x\d+/);
    });

    test("应该包含滚动信息", async () => {
      const response = await sendRequest("tools/call", {
        name: "webpage_snapshot",
        arguments: { win_id: winId },
      });

      const textContent = response.result.content[0].text;
      expect(textContent).toContain("scroll:");
      expect(textContent).toMatch(/scroll:\s*\(\d+,\s*\d+\)/);
    });

    test("应该显示交互元素数量", async () => {
      const response = await sendRequest("tools/call", {
        name: "webpage_snapshot",
        arguments: { win_id: winId },
      });

      const textContent = response.result.content[0].text;
      expect(textContent).toMatch(/Interactive Elements \(\d+\)/);
    });

    test("每个元素应该包含标签、文本、坐标和尺寸", async () => {
      const response = await sendRequest("tools/call", {
        name: "webpage_snapshot",
        arguments: { win_id: winId, max_elements: 5 },
      });

      const textContent = response.result.content[0].text;
      const lines = textContent.split("\n");
      const elementLines = lines.filter((line) => /^\d+\.\s*\[/.test(line.trim()));

      if (elementLines.length > 0) {
        const elementLine = elementLines[0];
        expect(elementLine).toContain("[");
        expect(elementLine).toContain("]");
        expect(elementLine).toContain("@");
        expect(elementLine).toContain("(");
        expect(elementLine).toContain(")");
        expect(elementLine).toMatch(/\d+x\d+/);
      }
    });
  });

  describe("max_elements 参数测试", () => {
    test("应该支持 max_elements 参数限制返回数量", async () => {
      await sendRequest("tools/call", {
        name: "load_url",
        arguments: { win_id: winId, url: "https://www.wikipedia.org" },
      });
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const response = await sendRequest("tools/call", {
        name: "webpage_snapshot",
        arguments: { win_id: winId, max_elements: 5 },
      });

      const textContent = response.result.content[0].text;
      const lines = textContent.split("\n");
      const elementLines = lines.filter((line) => /^\d+\.\s*\[/.test(line.trim()));
      expect(elementLines.length).toBeLessThanOrEqual(5);
    });
  });

  describe("截图功能测试", () => {
    test("应该默认包含截图", async () => {
      const response = await sendRequest("tools/call", {
        name: "webpage_snapshot",
        arguments: { win_id: winId },
      });

      expect(response.result.content).toBeDefined();
      const hasImage = response.result.content.some((item) => item.type === "image");
      expect(hasImage).toBe(true);

      const imageContent = response.result.content.find((item) => item.type === "image");
      expect(imageContent.data).toBeDefined();
      expect(imageContent.mimeType).toBe("image/png");
      expect(imageContent.data.length).toBeGreaterThan(100);
    });

    test("可以在不带截图的情况下获取快照", async () => {
      const response = await sendRequest("tools/call", {
        name: "webpage_snapshot",
        arguments: { win_id: winId, include_screenshot: false },
      });

      expect(response.result.content).toBeDefined();
      const hasImage = response.result.content.some((item) => item.type === "image");
      expect(hasImage).toBe(false);

      const textContent = response.result.content.find((item) => item.type === "text");
      expect(textContent).toBeDefined();
      expect(textContent.text).toContain("Page Snapshot");
    });
  });

  describe("复杂页面测试", () => {
    test("应该处理维基百科多个交互元素", async () => {
      await sendRequest("tools/call", {
        name: "load_url",
        arguments: { win_id: winId, url: "https://www.wikipedia.org" },
      });
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const response = await sendRequest("tools/call", {
        name: "webpage_snapshot",
        arguments: { win_id: winId, max_elements: 20 },
      });

      const textContent = response.result.content[0].text;
      expect(textContent).toMatch(/Interactive Elements \(\d+\)/);
      expect(textContent).toContain("Wikipedia");
    });
  });

  describe("错误处理测试", () => {
    test("应该处理无效窗口ID", async () => {
      const response = await sendRequest("tools/call", {
        name: "webpage_snapshot",
        arguments: { win_id: 999999 },
      });

      expect(response.result.isError).toBe(true);
      expect(response.result.content[0].text).toContain("Error");
      expect(response.result.content[0].text).toContain("not found");
    });

    test("应该处理缺失窗口ID（使用默认值）", async () => {
      const response = await sendRequest("tools/call", {
        name: "webpage_snapshot",
        arguments: {},
      });

      expect(response.result).toBeDefined();
      expect(response.result.content).toBeDefined();
    });
  });

  describe("默认参数测试", () => {
    test("应该默认返回元素（当前限制20）", async () => {
      const response = await sendRequest("tools/call", {
        name: "webpage_snapshot",
        arguments: { win_id: winId },
      });

      const textContent = response.result.content[0].text;
      const lines = textContent.split("\n");
      const elementLines = lines.filter((line) => /^\d+\.\s*\[/.test(line.trim()));
      expect(elementLines.length).toBeLessThanOrEqual(20);
    });
  });

  describe("性能测试", () => {
    test("快照应该在合理时间内返回", async () => {
      const startTime = Date.now();

      await sendRequest("tools/call", {
        name: "webpage_snapshot",
        arguments: { win_id: winId },
      });

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(10000);
    });
  });

  describe("功能验证", () => {
    test("验证工具功能是否已实现", async () => {
      const response = await sendRequest("tools/call", {
        name: "webpage_snapshot",
        arguments: { win_id: winId },
      });

      const textContent = response.result.content[0].text;

      const features = {
        "视口信息 (viewport:)": textContent.includes("viewport:"),
        "滚动信息 (scroll:)": textContent.includes("scroll:"),
        元素数量: textContent.includes("Interactive Elements"),
        "截图 (image)": response.result.content.some((i) => i.type === "image"),
      };

      console.log("工具功能状态:");
      Object.entries(features).forEach(([feature, supported]) => {
        console.log(`  ${supported ? "✓" : "✗"} ${feature}`);
      });

      expect(features["视口信息 (viewport:)"]).toBe(true);
      expect(features["滚动信息 (scroll:)"]).toBe(true);
      expect(features["截图 (image)"]).toBe(true);
    });
  });
});
