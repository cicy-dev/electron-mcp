// Jest 全局设置脚本

// 重写 console.log，直接输出到 stderr，绕过 Jest 拦截
console.log = (...args) => {
  process.stderr.write(args.join(" ") + "\n");
};

// 设置全局超时时间
jest.setTimeout(30000);

// 全局错误处理
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
});

// 全局 WebSocket 客户端（复用 SSE 连接）
let globalWSClient = null;

global.getGlobalMCPClient = async (wsPort = 8102) => {
  if (!globalWSClient) {
    const WSMCPClient = require('./ws-client');
    globalWSClient = new WSMCPClient(wsPort);
    await globalWSClient.connect();
    console.log('✅ Global WS client connected');
  }
  return globalWSClient;
};

global.closeGlobalMCPClient = () => {
  if (globalWSClient) {
    globalWSClient.close();
    globalWSClient = null;
    console.log('✅ Global WS client closed');
  }
};
