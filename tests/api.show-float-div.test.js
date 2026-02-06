const { setPort, setupTest, teardownTest, sendRequest } = require("./test-utils");

describe("show_float_div on google.com", () => {
  let winId;

  beforeAll(async () => {
    setPort(9849);
    await setupTest();
  }, 30000);

  afterAll(async () => {
    await teardownTest(true);
  });

  test("should show float div on google.com", async () => {
    // 打开 google.com
    const openResponse = await sendRequest("tools/call", {
      name: "open_window",
      arguments: { url: "https://www.google.com" },
    });
    const openText = openResponse.result.content[0].text;
    console.log("Open window result:", openText);
    
    const winIdMatch = openText.match(/ID:\s*(\d+)/);
    expect(winIdMatch).toBeTruthy();
    winId = parseInt(winIdMatch[1]);
    expect(winId).toBeGreaterThan(0);

    // 等待页面加载
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 显示浮动框
    const showResponse = await sendRequest("tools/call", {
      name: "show_float_div",
      arguments: { win_id: winId },
    });
    console.log("Show float div result:", showResponse.result.content[0].text);
    expect(showResponse.result.content[0].text).toContain("OK");

    // 等待浮动框渲染
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 检查浮动框是否存在
    const checkResponse = await sendRequest("tools/call", {
      name: "exec_js",
      arguments: {
        win_id: winId,
        code: `!!document.getElementById('__float_div__')`,
      },
    });
    console.log("Check float div result:", checkResponse.result.content[0].text);
    expect(checkResponse.result.content[0].text).toBe("true");

    // 等待10秒让你能看到浮动框
    console.log("Waiting 10 seconds to observe the float div...");
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // 获取搜索框位置
    const boundResponse = await sendRequest("tools/call", {
      name: "get_element_client_bound",
      arguments: { win_id: winId, selector: "textarea[name='q'], input[name='q']" },
    });
    console.log("Search input bounds:", boundResponse.result.content[0].text);
    const bounds = JSON.parse(boundResponse.result.content[0].text);
    const clickX = Math.round(bounds.x + bounds.width / 2);
    const clickY = Math.round(bounds.y + bounds.height / 2);

    // 点击搜索框
    await sendRequest("tools/call", {
      name: "cdp_click",
      arguments: { win_id: winId, x: clickX, y: clickY },
    });
    console.log(`Clicked search input at ${clickX}, ${clickY}`);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 输入 "react"
    await sendRequest("tools/call", {
      name: "cdp_type_text",
      arguments: { win_id: winId, text: "react" },
    });
    console.log("Typed 'react'");
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 按回车
    await sendRequest("tools/call", {
      name: "cdp_press_enter",
      arguments: { win_id: winId },
    });
    console.log("Pressed Enter");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  });
});
