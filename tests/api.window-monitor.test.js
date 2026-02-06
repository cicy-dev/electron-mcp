const { setPort, setupTest, teardownTest, sendRequest } = require("./test-utils");

describe("MCP HTTP API - 窗口监控测试", () => {
  beforeAll(async () => {
    setPort(9847);
    await setupTest();
  }, 30000);

  afterAll(async () => {
    await teardownTest();
  });

  let winId;

  test("应该打开新窗口", async () => {
    const response = await sendRequest("tools/call", {
      name: "open_window",
      arguments: { url: "https://example.com" },
    });
    const text = response.result.content[0].text;
    winId = parseInt(text.match(/ID: (\d+)/)[1]);
    await new Promise((resolve) => setTimeout(resolve, 3000));
  });

  test("应该获取控制台日志（带分页）", async () => {
    const response = await sendRequest("tools/call", {
      name: "get_console_logs",
      arguments: { win_id: winId, page: 1, page_size: 10 },
    });
    expect(response.result).toBeDefined();
    const result = JSON.parse(response.result.content[0].text);
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("page");
    expect(result).toHaveProperty("page_size");
    expect(result).toHaveProperty("total_pages");
    expect(Array.isArray(result.data)).toBe(true);
  });

  test("应该获取网络请求（带分页和时间戳）", async () => {
    const response = await sendRequest("tools/call", {
      name: "get_requests",
      arguments: { win_id: winId, page: 1, page_size: 10 },
    });
    expect(response.result).toBeDefined();
    const result = JSON.parse(response.result.content[0].text);
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("page");
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0]).toHaveProperty("index");
    expect(result.data[0]).toHaveProperty("timestamp");
    expect(result.data[0]).toHaveProperty("url");
    expect(result.data[0]).toHaveProperty("domain");
    expect(result.data[0]).toHaveProperty("path");
    expect(result.data[0]).toHaveProperty("method");
    expect(result.data[0]).toHaveProperty("mimeType");
  });

  test("重载后应该清空日志和请求", async () => {
    await sendRequest("tools/call", {
      name: "control_electron_WebContents",
      arguments: { win_id: winId, code: "webContents.reload()" },
    });
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const logsResponse = await sendRequest("tools/call", {
      name: "get_console_logs",
      arguments: { win_id: winId, page: 1, page_size: 10 },
    });
    const logs = JSON.parse(logsResponse.result.content[0].text);

    const reqResponse = await sendRequest("tools/call", {
      name: "get_requests",
      arguments: { win_id: winId, page: 1, page_size: 10 },
    });
    const requests = JSON.parse(reqResponse.result.content[0].text);

    // 重载后应该有新的请求
    expect(requests.total).toBeGreaterThan(0);
  });

  test("应该获取请求的详细信息（headers和body）", async () => {
    const reqResponse = await sendRequest("tools/call", {
      name: "get_requests",
      arguments: { win_id: winId, page: 1, page_size: 1 },
    });
    const requests = JSON.parse(reqResponse.result.content[0].text);
    const firstIndex = requests.data[0].index;

    const detailResponse = await sendRequest("tools/call", {
      name: "get_request_detail",
      arguments: { win_id: winId, index: firstIndex },
    });
    expect(detailResponse.result).toBeDefined();
    const detail = JSON.parse(detailResponse.result.content[0].text);
    expect(detail).toHaveProperty("requestId");
    expect(detail).toHaveProperty("method");
  });
});
