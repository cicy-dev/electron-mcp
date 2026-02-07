const { isPortOpen, killPort } = require('../src/utils/process-utils');
const http = require('http');

describe('Process Utils', () => {
  let testServer;
  const TEST_PORT = 18888;

  // 启动测试服务器
  const startTestServer = (port) => {
    return new Promise((resolve) => {
      testServer = http.createServer((req, res) => {
        res.writeHead(200);
        res.end('test');
      });
      testServer.listen(port, () => {
        resolve(testServer);
      });
    });
  };

  // 停止测试服务器
  const stopTestServer = () => {
    return new Promise((resolve) => {
      if (testServer) {
        testServer.close(() => {
          testServer = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  };

  afterEach(async () => {
    await stopTestServer();
  });

  describe('isPortOpen', () => {
    test('should return true when port is open', async () => {
      await startTestServer(TEST_PORT);
      const result = await isPortOpen(TEST_PORT);
      expect(result).toBe(true);
    });

    test('should return false when port is closed', async () => {
      const result = await isPortOpen(TEST_PORT);
      expect(result).toBe(false);
    });

    test('should handle custom host', async () => {
      await startTestServer(TEST_PORT);
      const result = await isPortOpen(TEST_PORT, '127.0.0.1');
      expect(result).toBe(true);
    });

    test('should handle custom timeout', async () => {
      const result = await isPortOpen(TEST_PORT, 'localhost', 500);
      expect(result).toBe(false);
    });

    test('should return false for invalid port', async () => {
      const result = await isPortOpen(99999);
      expect(result).toBe(false);
    });
  });

  describe('killPort', () => {
    test('should kill process on occupied port', async () => {
      await startTestServer(TEST_PORT);
      
      // 确认端口被占用
      const beforeKill = await isPortOpen(TEST_PORT);
      expect(beforeKill).toBe(true);

      // 杀死进程
      const result = await killPort(TEST_PORT);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Killed');

      // 等待端口释放
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 确认端口已释放
      const afterKill = await isPortOpen(TEST_PORT);
      expect(afterKill).toBe(false);
    });

    test('should return false when no process on port', async () => {
      const result = await killPort(TEST_PORT);
      expect(result.success).toBe(false);
      expect(result.message).toContain('No process found');
    });

    test('should handle invalid port gracefully', async () => {
      const result = await killPort(99999);
      expect(result.success).toBe(false);
    });
  });

  describe('Cross-platform compatibility', () => {
    test('should work on current platform', async () => {
      const platform = process.platform;
      console.log(`Testing on platform: ${platform}`);
      
      await startTestServer(TEST_PORT);
      const isOpen = await isPortOpen(TEST_PORT);
      expect(isOpen).toBe(true);

      const killResult = await killPort(TEST_PORT);
      expect(killResult.success).toBe(true);
    });
  });
});
