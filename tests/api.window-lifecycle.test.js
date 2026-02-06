const { setupTest, teardownTest, sendRequest } = require("./test-utils");

describe("Window Lifecycle", () => {
  beforeAll(async () => {
    await setupTest();
  }, 30000);

  afterAll(async () => {
    await teardownTest();
  });

  test("should create and close multiple windows", async () => {
    const windows = [];
    
    for (let i = 0; i < 3; i++) {
      const response = await sendRequest("tools/call", {
        name: "open_window",
        arguments: { url: "https://example.com" },
      });
      const winId = parseInt(response.result.content[0].text.match(/ID: (\d+)/)[1]);
      windows.push(winId);
    }

    expect(windows.length).toBe(3);

    for (const winId of windows) {
      const response = await sendRequest("tools/call", {
        name: "close_window",
        arguments: { win_id: winId },
      });
      expect(response.result.content[0].text).toContain("success");
    }
  });

  test("should navigate window to different URLs", async () => {
    const winResponse = await sendRequest("tools/call", {
      name: "open_window",
      arguments: { url: "https://example.com" },
    });
    const winId = parseInt(winResponse.result.content[0].text.match(/ID: (\d+)/)[1]);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const loadResponse = await sendRequest("tools/call", {
      name: "load_url",
      arguments: { win_id: winId, url: "https://www.google.com" },
    });
    expect(loadResponse.content[0].text).toContain("success");

    await new Promise(resolve => setTimeout(resolve, 2000));

    const titleResponse = await sendRequest("tools/call", {
      name: "get_title",
      arguments: { win_id: winId },
    });
    expect(titleResponse.content[0].text).toBeDefined();
  });

  test("should get window title", async () => {
    const winResponse = await sendRequest("tools/call", {
      name: "open_window",
      arguments: { url: "https://example.com" },
    });
    const winId = parseInt(winResponse.result.content[0].text.match(/ID: (\d+)/)[1]);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const response = await sendRequest("tools/call", {
      name: "get_title",
      arguments: { win_id: winId },
    });
    expect(response.result.content[0].text).toContain("Example Domain");
  });

  test("should list all windows", async () => {
    await sendRequest("tools/call", {
      name: "open_window",
      arguments: { url: "https://example.com" },
    });

    const response = await sendRequest("tools/call", {
      name: "get_windows",
      arguments: {},
    });

    const windows = JSON.parse(response.result.content[0].text);
    expect(Array.isArray(windows)).toBe(true);
    expect(windows.length).toBeGreaterThan(0);
  });

  test("should handle window info retrieval", async () => {
    const winResponse = await sendRequest("tools/call", {
      name: "open_window",
      arguments: { url: "https://example.com", accountIdx: 0 },
    });
    const winId = parseInt(winResponse.result.content[0].text.match(/ID: (\d+)/)[1]);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const response = await sendRequest("tools/call", {
      name: "get_window_info",
      arguments: { win_id: winId },
    });

    const info = JSON.parse(response.result.content[0].text);
    expect(info.id).toBe(winId);
    expect(info.accountIdx).toBe(0);
    expect(info.url).toBeDefined();
  });
});
