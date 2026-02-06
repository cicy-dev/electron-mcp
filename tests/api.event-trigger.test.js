const { setupTest, teardownTest, callTool } = require("./test-utils");

describe("Event Trigger Tests", () => {
  let context;

  beforeAll(async () => {
    context = await setupTest();
  }, 60000);

  afterAll(async () => {
    await teardownTest(context);
  }, 60000);

  test("Keyboard and mouse events trigger console.log", async () => {
    const { win_id } = context;

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

    const setupResult = await callTool(context, "exec_js", {
      win_id,
      code: setupCode,
    });
    console.log("✅ Setup:", setupResult.content[0].text);

    // 等待页面渲染
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 获取输入框位置
    const boundResult = await callTool(context, "get_element_client_bound", {
      win_id,
      selector: "#test-input",
    });
    const bound = JSON.parse(boundResult.content[0].text);
    const centerX = bound.x + bound.width / 2;
    const centerY = bound.y + bound.height / 2;

    console.log(`📍 Input box at (${centerX}, ${centerY})`);

    // 清空之前的日志
    await callTool(context, "exec_js", {
      win_id,
      code: "console.clear(); 'Logs cleared';",
    });

    // 1. 点击输入框
    await callTool(context, "cdp_click", {
      win_id,
      x: centerX,
      y: centerY,
    });
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 2. 输入文本
    await callTool(context, "cdp_type_text", {
      win_id,
      text: "Hello",
    });
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 3. 按回车
    await callTool(context, "cdp_press_enter", { win_id });
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 4. 双击输入框
    await callTool(context, "cdp_dblclick", {
      win_id,
      x: centerX,
      y: centerY,
    });
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 5. 按退格键
    await callTool(context, "cdp_press_backspace", { win_id });
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 获取控制台日志
    const logsResult = await callTool(context, "get_console_logs", { win_id });
    const logs = JSON.parse(logsResult.content[0].text);

    console.log("\n📋 Console Logs Captured:");
    console.log("─".repeat(80));
    logs.forEach((log, i) => {
      console.log(`${i + 1}. [${log.type}] ${log.text}`);
    });
    console.log("─".repeat(80));

    // 验证事件
    const logTexts = logs.map((l) => l.text).join(" ");

    expect(logTexts).toContain("CLICK");
    expect(logTexts).toContain("KEYDOWN");
    expect(logTexts).toContain("INPUT");
    expect(logTexts).toContain("DBLCLICK");

    console.log("\n✅ All events captured successfully!");
  }, 60000);
});
