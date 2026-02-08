const { setPort, setupTest, teardownTest, sendRequest } = require("./test-utils");

describe("set_window_bounds API", () => {
  beforeAll(async () => {
    setPort(8103);
    await setupTest();
  }, 30000);

  afterAll(async () => {
    await teardownTest();
  });

  test("should set window position and size", async () => {
    // 打开窗口
    const openResponse = await sendRequest("tools/call", {
      name: "open_window",
      arguments: { url: "https://www.google.com" },
    });
    expect(openResponse.result).toBeDefined();

    // 等待窗口加载
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 设置窗口位置和大小
    const setBoundsResponse = await sendRequest("tools/call", {
      name: "set_window_bounds",
      arguments: { win_id: 1, x: 100, y: 100, width: 1280, height: 720 },
    });
    expect(setBoundsResponse.result).toBeDefined();
    expect(setBoundsResponse.result.content[0].text).toContain("位置和大小已更新");

    // 验证窗口信息
    const infoResponse = await sendRequest("tools/call", {
      name: "get_window_info",
      arguments: { win_id: 1 },
    });
    const info = JSON.parse(infoResponse.result.content[0].text);
    expect(info.bounds.x).toBe(100);
    expect(info.bounds.y).toBe(100);
    expect(info.bounds.width).toBe(1280);
    expect(info.bounds.height).toBe(720);
  }, 30000);

  test("should set only position", async () => {
    const response = await sendRequest("tools/call", {
      name: "set_window_bounds",
      arguments: { win_id: 1, x: 200, y: 200 },
    });
    expect(response.result).toBeDefined();
    expect(response.result.content[0].text).toContain("位置和大小已更新");

    const infoResponse = await sendRequest("tools/call", {
      name: "get_window_info",
      arguments: { win_id: 1 },
    });
    const info = JSON.parse(infoResponse.result.content[0].text);
    expect(info.bounds.x).toBe(200);
    expect(info.bounds.y).toBe(200);
  }, 10000);

  test("should set only size", async () => {
    const response = await sendRequest("tools/call", {
      name: "set_window_bounds",
      arguments: { win_id: 1, width: 1920, height: 1080 },
    });
    expect(response.result).toBeDefined();
    expect(response.result.content[0].text).toContain("位置和大小已更新");

    const infoResponse = await sendRequest("tools/call", {
      name: "get_window_info",
      arguments: { win_id: 1 },
    });
    const info = JSON.parse(infoResponse.result.content[0].text);
    expect(info.bounds.width).toBe(1920);
    expect(info.bounds.height).toBe(1080);
  }, 10000);

  test("should return error for non-existent window", async () => {
    const response = await sendRequest("tools/call", {
      name: "set_window_bounds",
      arguments: { win_id: 999, x: 100, y: 100 },
    });
    expect(response.result.isError).toBe(true);
    expect(response.result.content[0].text).toContain("未找到窗口");
  }, 10000);
});
