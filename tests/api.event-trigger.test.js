const { setPort, setupTest, teardownTest, sendRequest } = require("./test-utils");

describe("Event Trigger Tests", () => {
  let winId;

  beforeAll(async () => {
    setPort(9843);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await setupTest();

    const openResponse = await sendRequest("tools/call", {
      name: "open_window",
      arguments: { url: "https://google.com" },
    });
    const text = openResponse.result.content[0].text;
    winId = parseInt(text.match(/\d+/)[0]);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }, 60000);

  afterAll(async () => {
    await teardownTest();
  }, 60000);

  test("Keyboard and mouse events trigger console.log", async () => {

    // 创建输入框并绑定事件
    const setupCode = `
      const input = document.createElement('input');
      input.id = 'test-input';
      input.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;height:60px;font-size:24px;padding:10px;border:3px solid blue;z-index:999999';
      document.body.appendChild(input);
      input.focus();

      // 绑定键盘事件
      input.addEventListener('keydown', (e) => {
        console.log('🎹 KEYDOWN:', e.key, 'code:', e.code);
      });

      input.addEventListener('keyup', (e) => {
        console.log('🎹 KEYUP:', e.key);
      });

      input.addEventListener('input', (e) => {
        console.log('📝 INPUT:', e.target.value);
      });

      // 绑定鼠标事件
      input.addEventListener('click', (e) => {
        console.log('🖱️ CLICK at', e.clientX, e.clientY);
      });

      input.addEventListener('dblclick', (e) => {
        console.log('🖱️ DBLCLICK at', e.clientX, e.clientY);
      });

      'Events bound successfully';
    `;

    const setupResult = await sendRequest("tools/call", {
      name: "exec_js",
      arguments: { win_id: winId, code: setupCode },
    });
    console.log("✅ Setup:", setupResult.result.content[0].text);

    // 等待页面渲染
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 获取输入框位置
    const boundResult = await sendRequest("tools/call", {
      name: "get_element_client_bound",
      arguments: { win_id: winId, selector: "#test-input" },
    });
    const bound = JSON.parse(boundResult.result.content[0].text);
    const centerX = bound.x + bound.width / 2;
    const centerY = bound.y + bound.height / 2;

    console.log(`📍 Input box at (${centerX}, ${centerY})`);

    // 1. 点击输入框
    await sendRequest("tools/call", {
      name: "cdp_click",
      arguments: { win_id: winId, x: centerX, y: centerY },
    });
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 2. 输入文本
    await sendRequest("tools/call", {
      name: "cdp_type_text",
      arguments: { win_id: winId, text: "Hello" },
    });
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 3. 按回车
    await sendRequest("tools/call", {
      name: "cdp_press_enter",
      arguments: { win_id: winId },
    });
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 4. 双击输入框
    await sendRequest("tools/call", {
      name: "cdp_dblclick",
      arguments: { win_id: winId, x: centerX, y: centerY },
    });
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 5. 按退格键
    await sendRequest("tools/call", {
      name: "cdp_press_backspace",
      arguments: { win_id: winId },
    });
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 获取控制台日志
    const logsResult = await sendRequest("tools/call", {
      name: "get_console_logs",
      arguments: { win_id: winId, page_size: 100 },
    });
    const logsData = JSON.parse(logsResult.result.content[0].text);
    const logArray = logsData.data || [];

    console.log(`\n📋 Console Logs Captured (${logsData.total} total):`);
    console.log("─".repeat(80));
    logArray.forEach((log, i) => {
      console.log(`${i + 1}. [${log.level}] ${log.message}`);
    });
    console.log("─".repeat(80));

    // 验证事件
    const logTexts = logArray.map((l) => l.message).join(" ");

    expect(logTexts).toContain("CLICK");
    expect(logTexts).toContain("KEYDOWN");
    expect(logTexts).toContain("INPUT");
    expect(logTexts).toContain("DBLCLICK");

    console.log("\n✅ All events captured successfully!");
  }, 60000);
});
