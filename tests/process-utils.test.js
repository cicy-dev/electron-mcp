const { isPortOpen, killPort } = require('../src/utils/process-utils');
const { spawn } = require('child_process');

describe('Process Utils', () => {
  let testServerProcess;
  const TEST_PORT = 18888;

  // 启动测试服务器（在子进程中）
  const startTestServer = (port) => {
    return new Promise((resolve, reject) => {
      testServerProcess = spawn('node', ['-e', `
        const http = require('http');
        const server = http.createServer((req, res) => {
          res.writeHead(200);
          res.end('test');
        });
        server.listen(${port}, () => {
          console.log('ready');
        });
      `]);

      testServerProcess.stdout.on('data', (data) => {
        if (data.toString().includes('ready')) {
          resolve(testServerProcess);
        }
      });

      testServerProcess.on('error', reject);
      
      setTimeout(() => reject(new Error('Server start timeout')), 5000);
    });
  };

  // 停止测试服务器
  const stopTestServer = () => {
    return new Promise((resolve) => {
      if (testServerProcess && !testServerProcess.killed) {
        testServerProcess.on('exit', () => {
          testServerProcess = null;
          resolve();
        });
        testServerProcess.kill('SIGKILL');
      } else {
        testServerProcess = null;
        resolve();
      }
    });
  };

  afterEach(async () => {
    await stopTestServer();
    // 等待端口释放
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('isPortOpen', () => {
    test('should return true when port is open', async () => {
      await startTestServer(TEST_PORT);
      // 等待端口完全打开
      await new Promise(resolve => setTimeout(resolve, 100));
      const result = await isPortOpen(TEST_PORT);
      expect(result).toBe(true);
    }, 10000);

    test('should return false when port is closed', async () => {
      const result = await isPortOpen(TEST_PORT);
      expect(result).toBe(false);
    }, 5000);

    test('should return false for invalid port', async () => {
      const result = await isPortOpen(99999);
      expect(result).toBe(false);
    }, 5000);
  });

  describe('killPort', () => {
    test('should kill process on occupied port', async () => {
      await startTestServer(TEST_PORT);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 确认端口被占用
      const beforeKill = await isPortOpen(TEST_PORT);
      expect(beforeKill).toBe(true);

      // 杀死进程
      const result = await killPort(TEST_PORT);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Killed');

      // 等待端口释放
      await new Promise(resolve => setTimeout(resolve, 500));

      // 确认端口已释放
      const afterKill = await isPortOpen(TEST_PORT);
      expect(afterKill).toBe(false);
      
      testServerProcess = null; // 已被杀死，不需要再清理
    }, 15000);

    test('should return false when no process on port', async () => {
      const result = await killPort(TEST_PORT);
      expect(result.success).toBe(false);
      expect(result.message).toContain('No process found');
    }, 5000);
  });
});
