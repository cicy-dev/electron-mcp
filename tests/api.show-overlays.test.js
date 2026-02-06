const { setPort, setupTest, teardownTest, sendRequest } = require("./test-utils");

describe("MCP HTTP API - show_overlays 参数测试", () => {
  let winId;

  beforeAll(async () => {
    setPort(9848);
    await setupTest();
  }, 30000);

  afterAll(async () => {
    await teardownTest(true);
  });

  test("应该打开测试窗口", async () => {
    const response = await sendRequest("tools/call", {
      name: "open_window",
      arguments: { 
        url: "https://aistudio.google.com",
        options: { x: 100, y: 50 }
      },
    });
    winId = parseInt(response.result.content[0].text.match(/\d+/)[0]);
    expect(winId).toBeGreaterThan(0);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  });

  test("show_overlays=false 应该不显示遮罩", async () => {
    const response = await sendRequest("tools/call", {
      name: "webpage_snapshot",
      arguments: { win_id: winId, include_screenshot: false, show_overlays: false },
    });
    expect(response.result).toBeDefined();
    expect(response.result.content[0].text).toContain("Interactive Elements");
  });

  test("show_overlays=true 应该显示遮罩", async () => {
    const response = await sendRequest("tools/call", {
      name: "webpage_snapshot",
      arguments: { win_id: winId, include_screenshot: false, show_overlays: true },
    });
    expect(response.result).toBeDefined();
    expect(response.result.content[0].text).toContain("Interactive Elements");
    console.log("\n=== Webpage Snapshot ===");
    console.log(response.result.content[0].text);
    console.log("========================\n");
    
    // 显示浮动框
    const floatResponse = await sendRequest("tools/call", {
      name: "show_float_div",
      arguments: { win_id: winId, x: 50, y: 50, w: 400, h: 300 },
    });
    console.log("Float div:", floatResponse.result.content[0].text);
    
    // 等待遮罩显示
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });
});
