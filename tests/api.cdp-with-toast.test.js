const { setPort, setupTest, teardownTest, sendRequest } = require("./test-utils");

describe("CDP Tools with Big Input Box", () => {
  let winId;

  beforeAll(async () => {
    setPort(9850);
    await setupTest();
    
    // 等待服务器完全启动
    await new Promise((resolve) => setTimeout(resolve, 5000));
    
    // 打开窗口
    const openResponse = await sendRequest("tools/call", {
      name: "open_window",
      arguments: { url: "https://www.google.com" },
    });
    winId = parseInt(openResponse.result.content[0].text.match(/ID:\s*(\d+)/)[1]);
    
    // 等待页面加载
    await new Promise((resolve) => setTimeout(resolve, 3000));
    
    // 直接创建toast和计数器（不用inject）
    await sendRequest("tools/call", {
      name: "exec_js",
      arguments: {
        win_id: winId,
        code: `
          // 创建大输入框
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
    
    console.log("✅ Setup complete: window opened, big input box created");
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }, 50000);

  afterAll(async () => {
    await teardownTest(true);
  });

  test("CDP Click - click input box", async () => {
    // 显示测试名称alert
    await sendRequest("tools/call", {
      name: "exec_js",
      arguments: { win_id: winId, code: "alert('Test: CDP Click')" },
    });
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 获取输入框位置
    const boundResponse = await sendRequest("tools/call", {
      name: "get_element_client_bound",
      arguments: { win_id: winId, selector: "#big-input" },
    });
    const bounds = JSON.parse(boundResponse.result.content[0].text);
    const x = Math.round(bounds.x + bounds.width / 2);
    const y = Math.round(bounds.y + bounds.height / 2);

    // 点击输入框3次
    for (let i = 0; i < 3; i++) {
      await sendRequest("tools/call", {
        name: "cdp_click",
        arguments: { win_id: winId, x, y },
      });
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log("⏸️  Waiting 5 seconds to observe...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  });

  test("CDP Double Click - double click input", async () => {
    await sendRequest("tools/call", {
      name: "exec_js",
      arguments: { win_id: winId, code: "alert('Test: CDP Double Click')" },
    });
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const boundResponse = await sendRequest("tools/call", {
      name: "get_element_client_bound",
      arguments: { win_id: winId, selector: "#big-input" },
    });
    const bounds = JSON.parse(boundResponse.result.content[0].text);
    const x = Math.round(bounds.x + bounds.width / 2);
    const y = Math.round(bounds.y + bounds.height / 2);

    await sendRequest("tools/call", {
      name: "cdp_dblclick",
      arguments: { win_id: winId, x, y },
    });

    console.log("⏸️  Waiting 5 seconds to observe...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  });

  test("CDP Type Text - input in big input box", async () => {
    await sendRequest("tools/call", {
      name: "exec_js",
      arguments: { win_id: winId, code: "alert('Test: CDP Type Text')" },
    });
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 点击大输入框
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
      arguments: { win_id: winId, text: "Hello CDP Testing!" },
    });

    console.log("⏸️  Waiting 5 seconds to observe...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  });

  test("CDP Scroll - show toast", async () => {
    await sendRequest("tools/call", {
      name: "exec_js",
      arguments: { win_id: winId, code: "alert('Test: CDP Scroll')" },
    });
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await sendRequest("tools/call", {
      name: "cdp_scroll",
      arguments: { win_id: winId, y: 500 },
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await sendRequest("tools/call", {
      name: "cdp_scroll",
      arguments: { win_id: winId, y: -500 },
    });

    console.log("⏸️  Waiting 5 seconds to observe...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  });
});
