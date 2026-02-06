const { setPort, setupTest, teardownTest, sendRequest } = require("./test-utils");

describe("CDP Tools Action Test", () => {
  let winId;

  beforeAll(async () => {
    setPort(9846);
    await setupTest();
  }, 30000);

  afterAll(async () => {
    await teardownTest(true);
  });

  test("应该打开抖音视频页面并滚动到底部", async () => {
    // 打开窗口（显示窗口）
    const openResponse = await sendRequest("tools/call", {
      name: "open_window",
      arguments: { 
        url: "https://www.douyin.com/video/7594434780347813155",
        options: { show: true, width: 1200, height: 800 }
      },
    });
    expect(openResponse.result).toBeDefined();
    const text = openResponse.result.content[0].text;
    expect(text).toContain("Opened window");
    winId = parseInt(text.match(/\d+/)[0]);
    expect(winId).toBeGreaterThan(0);

    // 注入自动运行的 JS（在 dom-ready 时执行）
    const injectResponse = await sendRequest("tools/call", {
      name: "inject_auto_run_when_dom_ready_js",
      arguments: { 
        win_id: winId, 
        code: `
          console.log('[AUTO-INJECT] Log message at:', new Date().toISOString());
          console.debug('[AUTO-INJECT] Debug message - checking variables');
          console.info('[AUTO-INJECT] Info message - script initialized');
          console.warn('[AUTO-INJECT] Warning message - this is a test warning');
          console.error('[AUTO-INJECT] Error message - this is a test error');
          
          // 创建测试 div
          const testDiv = document.createElement('div');
          testDiv.id = 'auto-inject-test-div';
          testDiv.style.cssText = 'position:fixed;top:10px;right:10px;width:250px;padding:15px;background:lime;border:3px solid green;z-index:999999;font-size:14px;font-weight:bold;box-shadow:0 4px 8px rgba(0,0,0,0.3);';
          testDiv.innerHTML = '<div>✅ Auto-Inject Success!</div><div style="font-size:12px;margin-top:5px;">DOM Ready: ' + new Date().toLocaleTimeString() + '</div>';
          document.body.appendChild(testDiv);
          
          console.log('[AUTO-INJECT] Test div created successfully');
        `
      },
    });
    console.log("Inject response:", injectResponse.result.content[0].text);

    // 刷新页面以触发自动注入的 JS
    await sendRequest("tools/call", {
      name: "control_electron_WebContents",
      arguments: { win_id: winId, code: "webContents.reload()" },
    });
    console.log("Page reloaded to trigger auto-inject");

    // 等待页面重新加载和自动注入执行
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 捕获所有控制台日志
    const consoleLogsResponse = await sendRequest("tools/call", {
      name: "get_console_logs",
      arguments: { win_id: winId },
    });
    const logs = JSON.parse(consoleLogsResponse.result.content[0].text);
    console.log("Total console logs:", logs.total);
    
    // 使用关键词过滤自动注入的日志
    const autoInjectLogsResponse = await sendRequest("tools/call", {
      name: "get_console_logs",
      arguments: { win_id: winId, keyword: "AUTO-INJECT" },
    });
    const autoInjectLogs = JSON.parse(autoInjectLogsResponse.result.content[0].text);
    console.log("Auto-inject logs (filtered by keyword):", autoInjectLogs.total);
    
    // 按级别过滤 - 只看错误
    const errorLogsResponse = await sendRequest("tools/call", {
      name: "get_console_logs",
      arguments: { win_id: winId, keyword: "AUTO-INJECT", level: "error" },
    });
    const errorLogs = JSON.parse(errorLogsResponse.result.content[0].text);
    console.log("\n=== Error Logs (level=error) ===");
    console.log(`Total: ${errorLogs.total}`);
    errorLogs.data.forEach(log => {
      console.log(`  [${log.level}] ${log.message}`);
    });
    
    // 按级别过滤 - 只看警告
    const warningLogsResponse = await sendRequest("tools/call", {
      name: "get_console_logs",
      arguments: { win_id: winId, keyword: "AUTO-INJECT", level: "warning" },
    });
    const warningLogs = JSON.parse(warningLogsResponse.result.content[0].text);
    console.log("\n=== Warning Logs (level=warning) ===");
    console.log(`Total: ${warningLogs.total}`);
    warningLogs.data.forEach(log => {
      console.log(`  [${log.level}] ${log.message}`);
    });
    
    // 按级别过滤 - 只看 info
    const infoLogsResponse = await sendRequest("tools/call", {
      name: "get_console_logs",
      arguments: { win_id: winId, keyword: "AUTO-INJECT", level: "info" },
    });
    const infoLogs = JSON.parse(infoLogsResponse.result.content[0].text);
    console.log("\n=== Info Logs (level=info) ===");
    console.log(`Total: ${infoLogs.total}`);
    infoLogs.data.slice(0, 3).forEach(log => {
      console.log(`  [${log.level}] ${log.message}`);
    });
    
    // 按级别过滤 - verbose (debug)
    const verboseLogsResponse = await sendRequest("tools/call", {
      name: "get_console_logs",
      arguments: { win_id: winId, keyword: "AUTO-INJECT", level: "verbose" },
    });
    const verboseLogs = JSON.parse(verboseLogsResponse.result.content[0].text);
    console.log("\n=== Verbose Logs (level=verbose) ===");
    console.log(`Total: ${verboseLogs.total}`);
    verboseLogs.data.forEach(log => {
      console.log(`  [${log.level}] ${log.message}`);
    });

    // 打开开发者工具
    const devToolsResponse = await sendRequest("tools/call", {
      name: "control_electron_BrowserWindow",
      arguments: { win_id: winId, code: "win.webContents.openDevTools()" },
    });
    expect(devToolsResponse.result).toBeDefined();
    console.log("DevTools opened");

    // 获取窗口信息确认 dom-ready
    const infoResponse = await sendRequest("tools/call", {
      name: "get_window_info",
      arguments: { win_id: winId },
    });
    expect(infoResponse.result.content[0].text).toContain("isDomReady");

    // 等待页面完全加载
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 先检查控制台日志
    const consoleResponse1 = await sendRequest("tools/call", {
      name: "get_console_logs",
      arguments: { win_id: winId },
    });
    console.log("Console logs before snapshot:", JSON.stringify(consoleResponse1.result.content[0].text).substring(0, 500));

    // 网页快照显示可点击覆盖层
    const snapshotResponse = await sendRequest("tools/call", {
      name: "webpage_snapshot",
      arguments: { win_id: winId, show_overlays: true },
    });
    expect(snapshotResponse.result).toBeDefined();
    console.log("Snapshot response:", JSON.stringify(snapshotResponse.result.content[0].text).substring(0, 200));

    // 等待 overlay 渲染
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 检查页面上是否有 overlay 元素
    const checkOverlay = await sendRequest("tools/call", {
      name: "exec_js",
      arguments: { 
        win_id: winId, 
        code: `
          const overlays = document.querySelectorAll('div[style*="position:fixed"][style*="rgba(255,0,0"]');
          return JSON.stringify({
            count: overlays.length,
            allDivs: document.querySelectorAll('div').length,
            bodyChildren: document.body.children.length
          })
        `
      },
    });
    console.log("Overlay check:", checkOverlay.result.content[0].text);

    // 测试直接插入 div（检查是否有安全限制）
    const testDivResponse = await sendRequest("tools/call", {
      name: "exec_js",
      arguments: { 
        win_id: winId, 
        code: `
          try {
            const testDiv = document.createElement('div');
            testDiv.id = 'test-security-div';
            testDiv.style.cssText = 'position:fixed;top:10px;left:10px;width:200px;height:100px;background:yellow;border:3px solid red;z-index:999999;padding:10px;font-size:16px;';
            testDiv.textContent = 'Test Div - Security Check';
            document.body.appendChild(testDiv);
            return JSON.stringify({ success: true, divExists: !!document.getElementById('test-security-div') });
          } catch(e) {
            return JSON.stringify({ success: false, error: e.message });
          }
        `
      },
    });
    console.log("Test div insert:", testDivResponse.result.content[0].text);

    // 使用 show_float_div 工具
    const floatDivResponse = await sendRequest("tools/call", {
      name: "show_float_div",
      arguments: { 
        win_id: winId,
        x: 100,
        y: 100,
        width: 300,
        height: 200,
        content: "Float Div Test - Can you see this?"
      },
    });
    console.log("Float div response:", floatDivResponse.result.content[0].text);

    // 检查快照后的控制台错误
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const consoleResponse2 = await sendRequest("tools/call", {
      name: "get_console_logs",
      arguments: { win_id: winId },
    });
    console.log("Console logs after snapshot:", JSON.stringify(consoleResponse2.result.content[0].text).substring(0, 500));

    // 滚动到底部
    for (let i = 0; i < 5; i++) {
      const scrollResponse = await sendRequest("tools/call", {
        name: "cdp_scroll",
        arguments: { win_id: winId, y: 500 },
      });
      expect(scrollResponse.result.content[0].text).toContain("Scrolled");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("Scrolled to bottom successfully");
    
    // 保持窗口打开30秒以便查看
    await new Promise((resolve) => setTimeout(resolve, 30000));
  }, 90000);

  test("应该捕获和过滤网络请求", async () => {
    // 打开窗口
    if (!winId) {
      const openResponse = await sendRequest("tools/call", {
        name: "open_window",
        arguments: { 
          url: "https://www.douyin.com/video/7594434780347813155",
          options: { show: true, width: 1200, height: 800 }
        },
      });
      const text = openResponse.result.content[0].text;
      winId = parseInt(text.match(/\d+/)[0]);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    
    // 获取所有网络请求
    const requestsResponse = await sendRequest("tools/call", {
      name: "get_requests",
      arguments: { win_id: winId },
    });
    const requests = JSON.parse(requestsResponse.result.content[0].text);
    console.log(`\nTotal network requests: ${requests.total}`);
    
    // 过滤 XHR 请求
    const xhrResponse = await sendRequest("tools/call", {
      name: "filter_requests",
      arguments: { win_id: winId, doc_type: "json" },
    });
    const xhrRequests = JSON.parse(xhrResponse.result.content[0].text);
    console.log(`JSON requests: ${xhrRequests.total}`);
    
    // 过滤包含 slardar 的请求
    const slardarResponse = await sendRequest("tools/call", {
      name: "filter_requests",
      arguments: { win_id: winId, keyword: "slardar" },
    });
    const slardarRequests = JSON.parse(slardarResponse.result.content[0].text);
    console.log(`\nRequests containing 'slardar': ${slardarRequests.total}`);
    
    // 打印前3个 slardar 请求的详细信息
    for (let i = 0; i < Math.min(3, slardarRequests.data.length); i++) {
      const req = slardarRequests.data[i];
      console.log(`\n${i + 1}. [${req.type}] ${req.method}`);
      console.log(`   URL: ${req.url}`);
      console.log(`   Domain: ${req.domain}`);
      
      // 获取请求详细信息
      const detailResponse = await sendRequest("tools/call", {
        name: "get_request_detail",
        arguments: { win_id: winId, index: req.index },
      });
      const detail = JSON.parse(detailResponse.result.content[0].text);
      console.log(`   Status: ${detail.status || 'pending'}`);
      if (detail.responseBodySize) {
        console.log(`   Response Size: ${detail.responseBodySize} bytes`);
      }
    }
    
    expect(requests.total).toBeGreaterThan(0);
    expect(slardarRequests.total).toBeGreaterThan(0);
  }, 90000);

  test("应该打开窗口并最大化显示DevTools", async () => {
    // 打开新窗口（带 DevTools）
    const openResponse = await sendRequest("tools/call", {
      name: "open_window",
      arguments: { 
        url: "https://www.douyin.com/video/7594434780347813155",
        options: { 
          show: true, 
          width: 1920, 
          height: 1080,
          webPreferences: {
            devTools: true
          }
        }
      },
    });
    const text = openResponse.result.content[0].text;
    const newWinId = parseInt(text.match(/\d+/)[0]);
    console.log(`Opened window: ${newWinId}`);
    
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // 最大化窗口
    await sendRequest("tools/call", {
      name: "control_electron_BrowserWindow",
      arguments: { 
        win_id: newWinId,
        method: "maximize",
        args: []
      },
    });
    console.log("Window maximized");
    
    // 打开 DevTools
    const devToolsResponse = await sendRequest("tools/call", {
      name: "control_electron_WebContents",
      arguments: { 
        win_id: newWinId,
        code: "webContents.openDevTools()"
      },
    });
    console.log("DevTools opened:", devToolsResponse.result.content[0].text);
    
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("\nWindow will stay open. Check VNC DISPLAY=:1");
    
    // 保持窗口打开
    await teardownTest(true);
  }, 90000);

  test("应该捕获包含__vid的视频流请求", async () => {
    // 打开新窗口
    const openResponse = await sendRequest("tools/call", {
      name: "open_window",
      arguments: { 
        url: "https://www.douyin.com/video/7594434780347813155",
        options: { show: true, width: 1200, height: 800 }
      },
    });
    const text = openResponse.result.content[0].text;
    const newWinId = parseInt(text.match(/\d+/)[0]);
    console.log(`Opened window: ${newWinId}`);
    
    // 等待视频加载（视频流请求会在这时触发）
    console.log("Waiting for video to load (30 seconds)...");
    await new Promise((resolve) => setTimeout(resolve, 30000));
    
    // 获取所有请求
    const allResponse = await sendRequest("tools/call", {
      name: "get_requests",
      arguments: { win_id: newWinId, page_size: 1000 },
    });
    const allRequests = JSON.parse(allResponse.result.content[0].text);
    console.log(`\nTotal requests: ${allRequests.total}`);
    
    // 客户端过滤包含 __vid 的请求
    const vidRequests = allRequests.data.filter(req => req.url.includes('__vid'));
    console.log(`Requests containing '__vid': ${vidRequests.length}\n`);
    
    // 打印前50个请求的 URL 看看
    console.log("=== First 50 requests ===");
    allRequests.data.slice(0, 50).forEach((req, idx) => {
      const hasVid = req.url.includes('__vid') || req.url.includes('video');
      const marker = hasVid ? ' <<<' : '';
      console.log(`${idx + 1}. [${req.type}] ${req.url.substring(0, 120)}${marker}`);
    });
    console.log("\n");
    
    // 打印所有包含 __vid 的请求
    vidRequests.forEach((req, idx) => {
      console.log(`\n${idx + 1}. [${req.type}] ${req.method}`);
      console.log(`   Index: ${req.index}`);
      console.log(`   RequestId: ${req.requestId}`);
      console.log(`   Timestamp: ${new Date(req.timestamp).toISOString()}`);
      console.log(`   URL: ${req.url}`);
      console.log(`   Domain: ${req.domain}`);
    });
    
    // 保存到文件
    if (vidRequests.length > 0) {
      const fs = require('fs');
      fs.writeFileSync('/home/w3c_offical/vid_requests.json', JSON.stringify(vidRequests, null, 2));
      console.log('\nSaved __vid requests to ~/vid_requests.json');
      console.log(`Total: ${vidRequests.length} requests`);
      
      // 检查是否有重复的 requestId
      const requestIds = vidRequests.map(r => r.requestId);
      const uniqueIds = [...new Set(requestIds)];
      console.log(`Unique requestIds: ${uniqueIds.length}`);
      if (uniqueIds.length < requestIds.length) {
        console.log('⚠️  Found duplicate requestIds!');
      }
      
      // 下载第一个视频
      const firstReq = vidRequests[0];
      console.log(`\nDownloading video from: ${firstReq.url.substring(0, 100)}...`);
      
      const downloadResponse = await sendRequest("tools/call", {
        name: "session_download_url",
        arguments: { 
          win_id: newWinId,
          url: firstReq.url,
          save_path: "/home/w3c_offical/Desktop/douyin_video.mp4"
        },
      });
      console.log("Download result:", downloadResponse.result.content[0].text);
    }
    
    expect(vidRequests.length).toBeGreaterThan(0);
  }, 120000);
});
