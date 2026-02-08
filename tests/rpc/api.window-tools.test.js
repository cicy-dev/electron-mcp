const { startTestServer, stopTestServer } = require("./setup-test-server");
const { callRPC } = require("./rpc-helper");

describe("RPC API - 窗口工具测试", () => {
  beforeAll(async () => {
    await startTestServer();
  }, 30000);

  afterAll(async () => {
    await stopTestServer();
  });

  describe("窗口管理工具", () => {
    let winId;

    test("应该打开新窗口", async () => {
      const result = await callRPC("open_window", { url: "https://google.com" });
      expect(result).toBeDefined();
      const text = result.content[0].text;
      expect(text).toContain("Opened window");
      winId = parseInt(text.match(/\d+/)[0]);
      expect(winId).toBeGreaterThan(0);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    });

    test("应该获取所有窗口列表", async () => {
      const result = await callRPC("get_windows", {});
      expect(result.content[0].text).toContain(winId.toString());
    });

    test("应该获取窗口标题", async () => {
      const result = await callRPC("get_title", { win_id: winId });
      expect(result.content[0].text).toBeTruthy();
    });

    test("应该加载新URL", async () => {
      const result = await callRPC("load_url", { win_id: winId, url: "https://www.google.com" });
      expect(result.content[0].text).toContain("Loaded");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    });

    test("应该捕获页面截图并复制到剪贴板", async () => {
      const result = await callRPC("webpage_screenshot_and_to_clipboard", { win_id: winId });
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);

      const hasImage = result.content.some((item) => item.type === "image");
      expect(hasImage).toBe(true);

      const imageContent = result.content.find((item) => item.type === "image");
      expect(imageContent.data).toBeDefined();
      expect(imageContent.mimeType).toBe("image/png");
    });

    test("应该捕获页面结构快照", async () => {
      const result = await callRPC("webpage_snapshot", { win_id: winId });
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain("Page Snapshot");
      expect(result.content[0].text).toContain("url:");
      expect(result.content[0].text).toContain("Interactive Elements");
    });

    test.skip("应该关闭窗口", async () => {
      const result = await callRPC("close_window", { win_id: winId });
      expect(result.content[0].text).toContain("Closed");
    });
  });
});
