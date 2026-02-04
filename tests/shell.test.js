/**
 * Shell 执行测试
 * 测试 execute_shell 工具
 */

const request = require('supertest');
const { spawn } = require('child_process');
const http = require('http');
const { cleanupPort, startMCPServer, establishSSEConnection, waitForSSEResponse, cleanupProcess } = require('./setup');

describe('Shell 执行测试', () => {
  const PORT = 8103;
  const baseURL = `http://localhost:${PORT}`;
  let electronProcess;
  let sessionId;
  let sseReq;
  let sseResponses = {};
  let requestId = 1;

  beforeAll(async () => {
    await cleanupPort(PORT);
    electronProcess = await startMCPServer(PORT, 20000);
    sessionId = await establishSSEConnection(baseURL, PORT);
  }, 30000);

  afterAll(async () => {
    await cleanupProcess(electronProcess, sessionId, sseReq);
  });

  const sendRequest = async (method, params = {}) => {
    const id = requestId++;
    const response = await request(baseURL)
      .post(`/message?sessionId=${sessionId}`)
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({ jsonrpc: '2.0', id, method, params });

    expect(response.status).toBe(202);
    await waitForSSEResponse(sseResponses, id);
    return sseResponses[id];
  };

  // ========== 基础命令测试 ==========
  describe('基础命令', () => {
    test('应该执行 echo 命令', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_shell',
        arguments: { command: 'echo "hello world"' }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.stdout).toContain('hello world');
      expect(result.exitCode).toBe(0);
    });

    test('应该执行 ls 命令', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_shell',
        arguments: { command: 'ls -la' }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.stdout).toContain('package.json');
      expect(result.exitCode).toBe(0);
    });

    test('应该执行 pwd 命令', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_shell',
        arguments: { command: 'pwd' }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.stdout).toContain('/Users');
      expect(result.exitCode).toBe(0);
    });

    test('应该执行 date 命令', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_shell',
        arguments: { command: 'date' }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.stdout).toMatch(/\w{3} \w{3}/);
      expect(result.exitCode).toBe(0);
    });
  });

  // ========== 管道命令测试 ==========
  describe('管道命令', () => {
    test('应该支持管道操作', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_shell',
        arguments: { command: 'echo "test123" | grep test' }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.stdout).toContain('test123');
      expect(result.exitCode).toBe(0);
    });

    test('应该支持复杂管道', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_shell',
        arguments: { command: 'ps aux | grep node | head -5' }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.stdout).toBeDefined();
      expect(result.exitCode).toBe(0);
    });
  });

  // ========== 环境变量测试 ==========
  describe('环境变量', () => {
    test('应该支持自定义环境变量', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_shell',
        arguments: {
          command: 'echo $TEST_VAR',
          env: { TEST_VAR: 'custom_value' }
        }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.stdout).toContain('custom_value');
      expect(result.exitCode).toBe(0);
    });

    test('应该继承系统环境变量', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_shell',
        arguments: { command: 'echo $HOME' }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.stdout).toContain('/Users');
      expect(result.exitCode).toBe(0);
    });
  });

  // ========== 超时测试 ==========
  describe('超时控制', () => {
    test('应该支持自定义超时时间', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_shell',
        arguments: {
          command: 'sleep 1 && echo "done"',
          timeout: 5000
        }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.stdout).toContain('done');
      expect(result.exitCode).toBe(0);
    }, 10000);

    test('超时应该返回错误', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_shell',
        arguments: {
          command: 'sleep 10 && echo "done"',
          timeout: 1000
        }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.error).toBe('timeout');
      expect(response.result.isError).toBe(true);
    }, 5000);
  });

  // ========== 退出码测试 ==========
  describe('退出码', () => {
    test('成功命令应该返回 exitCode 0', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_shell',
        arguments: { command: 'echo "success"' }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.exitCode).toBe(0);
      expect(response.result.isError).toBeFalsy();
    });

    test('失败命令应该返回非零 exitCode', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_shell',
        arguments: { command: 'ls /nonexistent_path' }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.exitCode).not.toBe(0);
      expect(response.result.isError).toBeFalsy(); // 结构化错误，不是工具错误
    });

    test('应该返回 stdout 和 stderr', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_shell',
        arguments: { command: 'echo "out" && echo "err" >&2' }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.stdout).toContain('out');
      expect(result.stderr).toContain('err');
    });
  });

  // ========== 工作目录测试 ==========
  describe('工作目录', () => {
    test('应该支持自定义工作目录', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_shell',
        arguments: {
          command: 'pwd',
          cwd: '/tmp'
        }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.stdout).toContain('/tmp');
    });
  });

  // ========== 错误处理测试 ==========
  describe('错误处理', () => {
    test('空命令应该返回错误', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_shell',
        arguments: { command: '' }
      });
      
      expect(response.result.isError).toBe(true);
    });

    test('无效命令应该返回错误', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_shell',
        arguments: { command: 'invalid_command_xyz' }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.exitCode).not.toBe(0);
      expect(response.result.isError).toBeFalsy();
    });
  });
});