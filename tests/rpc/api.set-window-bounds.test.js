const { startTestServer, stopTestServer } = require("./setup-test-server");
const { callRPC } = require("./rpc-helper");

describe("RPC API - set_window_bounds", () => {
  beforeAll(async () => {
    await startTestServer();
  }, 30000);

  afterAll(async () => {
    await stopTestServer();
  });

  test("should set window position and size", async () => {
    const openResult = await callRPC("open_window", { url: "https://www.google.com" });
    expect(openResult).toBeDefined();

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const setBoundsResult = await callRPC("set_window_bounds", { win_id: 1, x: 100, y: 100, width: 1280, height: 720 });
    expect(setBoundsResult).toBeDefined();
    expect(setBoundsResult.content[0].text).toContain("位置和大小已更新");

    const infoResult = await callRPC("get_window_info", { win_id: 1 });
    const info = JSON.parse(infoResult.content[0].text);
    expect(info.bounds.x).toBe(100);
    expect(info.bounds.y).toBe(100);
    expect(info.bounds.width).toBe(1280);
    expect(info.bounds.height).toBe(720);
  }, 30000);

  test("should set only position", async () => {
    const result = await callRPC("set_window_bounds", { win_id: 1, x: 200, y: 200 });
    expect(result).toBeDefined();
    expect(result.content[0].text).toContain("位置和大小已更新");

    const infoResult = await callRPC("get_window_info", { win_id: 1 });
    const info = JSON.parse(infoResult.content[0].text);
    expect(info.bounds.x).toBe(200);
    expect(info.bounds.y).toBe(200);
  }, 10000);

  test("should set only size", async () => {
    const result = await callRPC("set_window_bounds", { win_id: 1, width: 1920, height: 1080 });
    expect(result).toBeDefined();
    expect(result.content[0].text).toContain("位置和大小已更新");

    const infoResult = await callRPC("get_window_info", { win_id: 1 });
    const info = JSON.parse(infoResult.content[0].text);
    expect(info.bounds.width).toBe(1920);
    expect(info.bounds.height).toBe(1080);
  }, 10000);

  test("should return error for non-existent window", async () => {
    const result = await callRPC("set_window_bounds", { win_id: 999, x: 100, y: 100 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("未找到窗口");
  }, 10000);
});
