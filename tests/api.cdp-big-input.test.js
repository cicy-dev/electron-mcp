const { setPort, setupTest, teardownTest, sendRequest } = require("./test-utils");

describe("CDP Type Text with Big Input", () => {
  let winId;

  beforeAll(async () => {
    setPort(9852);
    // 等待服务器完全启动
    await new Promise((resolve) => setTimeout(resolve, 10000));
    await setupTest();
  }, 90000);

  afterAll(async () => {
    // 不关闭服务器，手动管理
    // await teardownTest(true);
  });

  test("Type text in big input box", async () => {
    try {
      // 打开窗口
      console.log("Opening window...");
      const openResponse = await sendRequest("tools/call", {
        name: "open_window",
        arguments: { url: "https://www.google.com" },
      });
      console.log("Open response:", openResponse.result.content[0].text);
      winId = parseInt(openResponse.result.content[0].text.match(/ID:\s*(\d+)/)[1]);
      console.log("Window ID:", winId);
      await new Promise((resolve) => setTimeout(resolve, 3000));

    // 创建大输入框
    await sendRequest("tools/call", {
      name: "exec_js",
      arguments: {
        win_id: winId,
        code: `
          const input = document.createElement('input');
          input.id = 'big-input';
          input.type = 'text';
          input.placeholder = 'Type here...';
          input.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;padding:30px;font-size:32px;border:4px solid #2196F3;border-radius:16px;z-index:999999;box-shadow:0 8px 16px rgba(0,0,0,0.3);';
          document.body.appendChild(input);
          input.focus();
          'OK';
        `,
      },
    });
    console.log("✅ Big input box created");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 点击输入框
    const boundResponse = await sendRequest("tools/call", {
      name: "get_element_client_bound",
      arguments: { win_id: winId, selector: "#big-input" },
    });
    const bounds = JSON.parse(boundResponse.result.content[0].text);
    const x = Math.round(bounds.x + bounds.width / 2);
    const y = Math.round(bounds.y + bounds.height / 2);

    await sendRequest("tools/call", {
      name: "cdp_click",
      arguments: { win_id: winId, x, y },
    });
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 输入文本
    await sendRequest("tools/call", {
      name: "cdp_type_text",
      arguments: { win_id: winId, text: "Hello CDP Testing! This is a big input box." },
    });
    console.log("✅ Text typed");

    // 等待观察
    console.log("⏸️  Waiting 10 seconds to observe...");
    await new Promise((resolve) => setTimeout(resolve, 10000));
    } catch (error) {
      console.error("Test error:", error);
      throw error;
    }
  });
});
