const http = require("http");

const PORT = 9847;
let sessionId = null;

function sendRequest(endpoint, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: "localhost",
      port: PORT,
      path: `/${endpoint}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve(JSON.parse(body)));
    });

    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

async function test() {
  console.log("等待服务器启动...");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // 建立 SSE 连接
  const sseReq = http.get(`http://localhost:${PORT}/mcp`, (res) => {
    res.on("data", (chunk) => {
      const text = chunk.toString();
      if (text.includes("sessionId")) {
        const match = text.match(/"sessionId":"([^"]+)"/);
        if (match) sessionId = match[1];
      }
    });
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 打开窗口
  console.log("\n1. 打开窗口...");
  const openRes = await sendRequest("messages", {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "open_window",
      arguments: { url: "https://example.com" },
    },
  });
  const winId = parseInt(openRes.result.content[0].text.match(/\d+/)[0]);
  console.log(`窗口 ID: ${winId}`);

  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 测试不显示遮罩
  console.log("\n2. 测试 show_overlays=false (默认)...");
  const snapshot1 = await sendRequest("messages", {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "webpage_snapshot",
      arguments: { win_id: winId, include_screenshot: false },
    },
  });
  console.log("结果:", snapshot1.result.content[0].text.substring(0, 200));

  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 测试显示遮罩
  console.log("\n3. 测试 show_overlays=true...");
  const snapshot2 = await sendRequest("messages", {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "webpage_snapshot",
      arguments: { win_id: winId, include_screenshot: false, show_overlays: true },
    },
  });
  console.log("结果:", snapshot2.result.content[0].text.substring(0, 200));
  console.log("\n✅ 遮罩应该已显示在浏览器窗口中，5秒后消失");

  await new Promise((resolve) => setTimeout(resolve, 6000));

  console.log("\n测试完成！");
  process.exit(0);
}

test().catch(console.error);
