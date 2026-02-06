const { setupTest, teardownTest, sendRequest } = require("./test-utils");

describe("Multi-Account System", () => {
  beforeAll(async () => {
    await setupTest();
  }, 30000);

  afterAll(async () => {
    await teardownTest();
  });

  test("should create windows with different accounts", async () => {
    const win1 = await sendRequest("tools/call", {
      name: "open_window",
      arguments: { url: "https://example.com", accountIdx: 0 },
    });
    expect(win1.result.content[0].text).toContain("Opened window");

    const win2 = await sendRequest("tools/call", {
      name: "open_window",
      arguments: { url: "https://example.com", accountIdx: 1 },
    });
    expect(win2.result.content[0].text).toContain("Opened window");

    const win3 = await sendRequest("tools/call", {
      name: "open_window",
      arguments: { url: "https://example.com", accountIdx: 2 },
    });
    expect(win3.result.content[0].text).toContain("Opened window");
  });

  test("should show account info in window title", async () => {
    const windows = await sendRequest("tools/call", {
      name: "get_windows",
      arguments: {},
    });

    const windowList = JSON.parse(windows.content[0].text);
    expect(windowList.length).toBeGreaterThan(0);
    
    windowList.forEach(win => {
      expect(win.title).toMatch(/^\d+-\d+/);
    });
  });

  test("should isolate cookies between accounts", async () => {
    const win1 = await sendRequest("tools/call", {
      name: "open_window",
      arguments: { url: "https://httpbin.org/cookies/set?account0=test", accountIdx: 0 },
    });
    const winId1 = parseInt(win1.result.content[0].text.match(/ID: (\d+)/)[1]);

    const win2 = await sendRequest("tools/call", {
      name: "open_window",
      arguments: { url: "https://httpbin.org/cookies", accountIdx: 1 },
    });
    const winId2 = parseInt(win2.result.content[0].text.match(/ID: (\d+)/)[1]);

    await new Promise(resolve => setTimeout(resolve, 2000));

    const info1 = await sendRequest("tools/call", {
      name: "get_window_info",
      arguments: { win_id: winId1 },
    });
    expect(info1.result.content[0].text).toContain("accountIdx");

    const info2 = await sendRequest("tools/call", {
      name: "get_window_info",
      arguments: { win_id: winId2 },
    });
    expect(info2.result.content[0].text).toContain("accountIdx");
  });
});
