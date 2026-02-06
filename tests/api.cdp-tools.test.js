const { setPort, setupTest, teardownTest, sendRequest } = require("./test-utils");

describe("MCP HTTP API - CDP 工具测试", () => {
  let winId;

  beforeAll(async () => {
    setPort(9845);
    await setupTest();

    const openResponse = await sendRequest("tools/call", {
      name: "open_window",
      arguments: { url: "https://example.com" },
    });
    const text = openResponse.result.content[0].text;
    winId = parseInt(text.match(/\d+/)[0]);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }, 30000);

  afterAll(async () => {
    await teardownTest();
  });

  test("应该使用 CDP 点击页面", async () => {
    const response = await sendRequest("tools/call", {
      name: "cdp_click",
      arguments: { win_id: winId, x: 100, y: 100 },
    });
    expect(response.result).toBeDefined();
    expect(response.result.content[0].text).toContain("Clicked at (100, 100)");
  });

  test("应该使用 CDP 双击页面", async () => {
    const response = await sendRequest("tools/call", {
      name: "cdp_dblclick",
      arguments: { win_id: winId, x: 150, y: 150 },
    });
    expect(response.result).toBeDefined();
    expect(response.result.content[0].text).toContain("Double clicked at (150, 150)");
  });

  test("应该使用 CDP 按下按键", async () => {
    const response = await sendRequest("tools/call", {
      name: "cdp_press_key",
      arguments: { win_id: winId, key: "a" },
    });
    expect(response.result.content[0].text).toContain("Pressed key: a");
  });

  test("应该使用 CDP 按下回车键", async () => {
    const response = await sendRequest("tools/call", {
      name: "cdp_press_enter",
      arguments: { win_id: winId },
    });
    expect(response.result.content[0].text).toContain("Pressed Enter");
  });

  test("应该使用 CDP 按下退格键", async () => {
    const response = await sendRequest("tools/call", {
      name: "cdp_press_backspace",
      arguments: { win_id: winId },
    });
    expect(response.result.content[0].text).toContain("Pressed Backspace");
  });

  test("应该使用 CDP 执行复制操作", async () => {
    const response = await sendRequest("tools/call", {
      name: "cdp_press_copy",
      arguments: { win_id: winId },
    });
    expect(response.result.content[0].text).toContain("Ctrl+C");
  });

  test("应该使用 CDP 执行粘贴操作", async () => {
    const response = await sendRequest("tools/call", {
      name: "cdp_press_paste",
      arguments: { win_id: winId },
    });
    expect(response.result.content[0].text).toContain("Ctrl+V");
  });

  test("应该使用 CDP 执行全选操作", async () => {
    const response = await sendRequest("tools/call", {
      name: "cdp_press_selectall",
      arguments: { win_id: winId },
    });
    expect(response.result.content[0].text).toContain("Ctrl+A");
  });

  test("应该使用 CDP 执行剪切操作", async () => {
    const response = await sendRequest("tools/call", {
      name: "cdp_press_cut",
      arguments: { win_id: winId },
    });
    expect(response.result.content[0].text).toContain("Ctrl+X");
  });

  test("应该使用 CDP 输入文本", async () => {
    const response = await sendRequest("tools/call", {
      name: "cdp_type_text",
      arguments: { win_id: winId, text: "Hello World" },
    });
    expect(response.result.content[0].text).toContain("Typed: Hello World");
  });

  test("应该使用 CDP 滚动页面", async () => {
    const response = await sendRequest("tools/call", {
      name: "cdp_scroll",
      arguments: { win_id: winId, y: 100 },
    });
    expect(response.result.content[0].text).toContain("Scrolled");
  });

  test("应该使用 CDP 发送任意命令", async () => {
    const response = await sendRequest("tools/call", {
      name: "cdp_sendcmd",
      arguments: {
        win_id: winId,
        method: "Runtime.evaluate",
        params: { expression: "1 + 1" },
      },
    });
    expect(response.result).toBeDefined();
    expect(response.result.content[0].text).toBeTruthy();
  });
});
