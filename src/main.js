const { app } = require('electron');
const http = require('http');
const ElectronMcpServer = require('./electron-mcp-server');

const PORT = parseInt(process.env.PORT || process.argv.find(arg => arg.startsWith('--port='))?.split('=')[1] || '8101');

if(process.platform === "linux"){
  console.log("linux...")
  // 1. 解决 D-Bus 和桌面环境依赖问题
  // app.commandLine.appendSwitch('no-sandbox'); // Linux 服务器环境通常需要
  app.commandLine.appendSwitch('disable-gpu'); // 除非你有显卡驱动，否则禁用 GPU 加速
  app.commandLine.appendSwitch('disable-software-rasterizer');
  app.commandLine.appendSwitch('disable-dev-shm-usage'); // 防止在 Docker/GCP 等容器环境内存不足
  app.commandLine.appendSwitch('disable-setuid-sandbox');

  // 2. 忽略 D-Bus 错误（解决你日志中的 ERROR:dbus）
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
  process.env.DBUS_SESSION_BUS_ADDRESS = '/dev/null'; // 强制让它找不到 bus，从而停止报错尝试

}


// 创建 MCP 服务器实例
const mcpServer = new ElectronMcpServer();

// 创建 HTTP 服务器
const httpServer = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200).end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/mcp' && req.method === 'POST') {
    // Parse JSON body
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        req.body = JSON.parse(body);
        req.query = Object.fromEntries(url.searchParams);
        await mcpServer.handleRequest(req, res);
      } catch (error) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
          res.writeHead(500).end(JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: -32603,
              message: 'Internal server error',
            },
            id: null,
          }));
        }
      }
    });
  } else if (url.pathname === '/mcp' && req.method === 'GET') {
    // SSE endpoint
    await mcpServer.handleSSEConnection(req, res);
  } else {
    res.writeHead(404).end('Not found');
  }
});

// 应用初始化
app.whenReady().then(async () => {
  httpServer.listen(PORT, () => {
    console.log(`MCP HTTP Server running on http://localhost:${PORT}`);
    console.log(`SSE endpoint: http://localhost:${PORT}/mcp`);

    // 初始化测试 transport
    mcpServer.initTestTransport();
  });

  // 测试环境自动创建窗口
  if (process.env.TEST) {
    mcpServer.createTestWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});