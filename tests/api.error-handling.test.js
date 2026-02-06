const { setupTest, teardownTest, sendRequest } = require("./test-utils");

describe("Error Handling", () => {
  beforeAll(async () => {
    await setupTest();
  }, 30000);

  afterAll(async () => {
    await teardownTest();
  });

  test("should handle invalid window ID", async () => {
    const response = await sendRequest("tools/call", {
      name: "get_window_info",
      arguments: { win_id: 99999 },
    });
    expect(response.result.content[0].text).toContain("not found");
  });

  test("should handle invalid URL", async () => {
    const response = await sendRequest("tools/call", {
      name: "open_window",
      arguments: { url: "invalid-url" },
    });
    expect(response.result.content[0].text).toBeDefined();
  });

  test("should handle missing required parameters", async () => {
    const response = await sendRequest("tools/call", {
      name: "cdp_click",
      arguments: { win_id: 1 },
    });
    expect(response.result.content[0].text).toBeDefined();
  });

  test("should handle invalid selector", async () => {
    const winResponse = await sendRequest("tools/call", {
      name: "open_window",
      arguments: { url: "https://example.com" },
    });
    const winId = parseInt(winResponse.result.content[0].text.match(/ID: (\d+)/)[1]);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const response = await sendRequest("tools/call", {
      name: "get_element_client_bound",
      arguments: { win_id: winId, selector: "#nonexistent-element-12345" },
    });
    expect(response.result.content[0].text).toBeDefined();
  });

  test("should handle CDP command on closed window", async () => {
    const winResponse = await sendRequest("tools/call", {
      name: "open_window",
      arguments: { url: "https://example.com" },
    });
    const winId = parseInt(winResponse.result.content[0].text.match(/ID: (\d+)/)[1]);

    await sendRequest("tools/call", {
      name: "close_window",
      arguments: { win_id: winId },
    });

    const response = await sendRequest("tools/call", {
      name: "cdp_click",
      arguments: { win_id: winId, x: 100, y: 100 },
    });
    expect(response.result.content[0].text).toContain("not found");
  });

  test("should handle invalid account index", async () => {
    const response = await sendRequest("tools/call", {
      name: "open_window",
      arguments: { url: "https://example.com", accountIdx: -1 },
    });
    expect(response.result.content[0].text).toBeDefined();
  });

  test("should handle exec_js with syntax error", async () => {
    const winResponse = await sendRequest("tools/call", {
      name: "open_window",
      arguments: { url: "https://example.com" },
    });
    const winId = parseInt(winResponse.result.content[0].text.match(/ID: (\d+)/)[1]);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const response = await sendRequest("tools/call", {
      name: "exec_js",
      arguments: { win_id: winId, code: "invalid javascript syntax {{{" },
    });
    expect(response.result.content[0].text).toBeDefined();
  });
});
