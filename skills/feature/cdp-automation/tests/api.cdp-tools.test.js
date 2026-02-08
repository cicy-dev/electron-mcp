const { startTestServer, stopTestServer } = require("./setup-test-server");
const { callRPC } = require("./rpc-helper");

describe("RPC API - CDP 工具测试", () => {
  let winId;

  beforeAll(async () => {
    await startTestServer();

    const result = await callRPC("open_window", { url: "https://google.com" });
    const text = result.content[0].text;
    winId = parseInt(text.match(/\d+/)[0]);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }, 30000);

  afterAll(async () => {
    await stopTestServer();
  });

  test("应该使用 CDP 点击页面", async () => {
    const result = await callRPC("cdp_click", { win_id: winId, x: 100, y: 100 });
    expect(result).toBeDefined();
    expect(result.content[0].text).toContain("Clicked at (100, 100)");
  });

  test("应该使用 CDP 双击页面", async () => {
    const result = await callRPC("cdp_dblclick", { win_id: winId, x: 150, y: 150 });
    expect(result).toBeDefined();
    expect(result.content[0].text).toContain("Double clicked at (150, 150)");
  });

  test("应该使用 CDP 按下按键", async () => {
    const result = await callRPC("cdp_press_key", { win_id: winId, key: "a" });
    expect(result.content[0].text).toContain("Pressed key: a");
  });

  test("应该使用 CDP 按下回车键", async () => {
    const result = await callRPC("cdp_press_enter", { win_id: winId });
    expect(result.content[0].text).toContain("Pressed Enter");
  });

  test("应该使用 CDP 按下退格键", async () => {
    const result = await callRPC("cdp_press_backspace", { win_id: winId });
    expect(result.content[0].text).toContain("Pressed Backspace");
  });

  test("应该使用 CDP 执行复制操作", async () => {
    const result = await callRPC("cdp_press_copy", { win_id: winId });
    expect(result.content[0].text).toContain("Ctrl+C");
  });

  test("应该使用 CDP 执行粘贴操作", async () => {
    const result = await callRPC("cdp_press_paste", { win_id: winId });
    expect(result.content[0].text).toContain("Ctrl+V");
  });

  test("应该使用 CDP 执行全选操作", async () => {
    const result = await callRPC("cdp_press_selectall", { win_id: winId });
    expect(result.content[0].text).toContain("Ctrl+A");
  });

  test("应该使用 CDP 执行剪切操作", async () => {
    const result = await callRPC("cdp_press_cut", { win_id: winId });
    expect(result.content[0].text).toContain("Ctrl+X");
  });

  test("应该使用 CDP 输入文本", async () => {
    const result = await callRPC("cdp_type_text", { win_id: winId, text: "Hello World" });
    expect(result.content[0].text).toContain("Typed text: Hello World");
  });

  test("应该使用 CDP 滚动页面", async () => {
    const result = await callRPC("cdp_scroll", { win_id: winId, y: 100 });
    expect(result.content[0].text).toContain("Scrolled");
  });
});
