const { setupTest, teardownTest, sendRequest } = require("./test-utils");

describe("CDP Keyboard Operations", () => {
  let winId;

  beforeAll(async () => {
    await setupTest();

    const winResponse = await sendRequest("tools/call", {
      name: "open_window",
      arguments: { url: "https://www.google.com" },
    });
    winId = parseInt(winResponse.result.content[0].text.match(/ID: (\d+)/)[1]);
    await new Promise(resolve => setTimeout(resolve, 3000));
  }, 30000);

  afterAll(async () => {
    await teardownTest();
  });

  test("cdp_press_enter should work", async () => {
    const response = await sendRequest("tools/call", {
      name: "cdp_press_enter",
      arguments: { win_id: winId },
    });
    expect(response.result.content[0].text).toContain("Pressed");
  });

  test("cdp_press_backspace should work", async () => {
    const response = await sendRequest("tools/call", {
      name: "cdp_press_backspace",
      arguments: { win_id: winId },
    });
    expect(response.result.content[0].text).toContain("Pressed");
  });

  test("cdp_press_copy should work", async () => {
    const response = await sendRequest("tools/call", {
      name: "cdp_press_copy",
      arguments: { win_id: winId },
    });
    expect(response.result.content[0].text).toContain("Pressed");
  });

  test("cdp_press_paste should work", async () => {
    const response = await sendRequest("tools/call", {
      name: "cdp_press_paste",
      arguments: { win_id: winId },
    });
    expect(response.result.content[0].text).toContain("Pressed");
  });

  test("cdp_press_selectall should work", async () => {
    const response = await sendRequest("tools/call", {
      name: "cdp_press_selectall",
      arguments: { win_id: winId },
    });
    expect(response.result.content[0].text).toContain("Pressed");
  });

  test("cdp_press_cut should work", async () => {
    const response = await sendRequest("tools/call", {
      name: "cdp_press_cut",
      arguments: { win_id: winId },
    });
    expect(response.result.content[0].text).toContain("Pressed");
  });

  test("cdp_type_text should input text", async () => {
    const response = await sendRequest("tools/call", {
      name: "cdp_type_text",
      arguments: { win_id: winId, text: "Hello World" },
    });
    expect(response.result.content[0].text).toContain("Typed");
  });

  test("cdp_press_key should handle custom keys", async () => {
    const response = await sendRequest("tools/call", {
      name: "cdp_press_key",
      arguments: { win_id: winId, key: "Tab" },
    });
    expect(response.result.content[0].text).toContain("Pressed");
  });
});
