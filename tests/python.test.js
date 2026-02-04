/**
 * Python 执行测试
 * 测试 execute_python 工具
 */

const request = require('supertest');
const http = require('http');
const { cleanupPort, startMCPServer, establishSSEConnection, waitForSSEResponse, cleanupProcess } = require('./setup');

describe('Python 执行测试', () => {
  const PORT = 8104;
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

  // ========== 基础计算测试 ==========
  describe('基础计算', () => {
    test('应该执行简单计算', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_python',
        arguments: { code: 'print(sum([1,2,3,4,5]))' }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.stdout).toContain('15');
      expect(result.result).toBeNull();
    });

    test('应该支持表达式', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_python',
        arguments: { code: 'print(2 ** 10)' }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.stdout).toContain('1024');
    });

    test('应该支持字符串操作', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_python',
        arguments: { code: 'print("hello".upper())' }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.stdout).toContain('HELLO');
    });

    test('应该返回最后表达式的值', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_python',
        arguments: { code: 'sum([1,2,3])' }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.result).toBe('6');
    });
  });

  // ========== JSON 处理测试 ==========
  describe('JSON 处理', () => {
    test('应该支持 JSON 编码', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_python',
        arguments: {
          code: `
import json
data = {"name": "test", "value": 123}
print(json.dumps(data))
          `
        }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.stdout).toContain('"name": "test"');
    });

    test('应该支持 JSON 解析', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_python',
        arguments: {
          code: `
import json
s = '{"key": "value"}'
obj = json.loads(s)
print(obj["key"])
          `
        }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.stdout).toContain('value');
    });
  });

  // ========== 文件操作测试 ==========
  describe('文件操作', () => {
    test('应该支持 os 模块', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_python',
        arguments: {
          code: `
import os
print('package.json' in os.listdir('.'))
          `
        }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.stdout).toContain('True');
    });

    test('应该支持文件读取', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_python',
        arguments: {
          code: `
with open('package.json', 'r') as f:
    print('"name"' in f.readline())
          `
        }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.stdout).toContain('True');
    });
  });

  // ========== 数据结构测试 ==========
  describe('数据结构', () => {
    test('应该支持列表操作', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_python',
        arguments: { code: 'print([x*2 for x in range(5)])' }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.stdout).toContain('[0, 2, 4, 6, 8]');
    });

    test('应该支持字典操作', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_python',
        arguments: {
          code: `
d = {'a': 1, 'b': 2}
d['c'] = 3
print(sum(d.values()))
          `
        }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.stdout).toContain('6');
    });

    test('应该支持集合操作', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_python',
        arguments: { code: 'print(set([1, 2, 2, 3]))' }
      });
      
      const result = JSON.parse(response.result[0].text);
      expect(result.stdout).toContain('{1, 2, 3}');
    });
  });

  // ========== pip 包安装测试 ==========
  describe('pip 包安装', () => {
    test('应该安装并使用 requests', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_python',
        arguments: {
          code: 'import requests; print("requests version:", requests.__version__)',
          packages: ['requests']
        },
        timeout: 120000
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.stdout).toContain('requests version');
    }, 180000);

    test('应该处理 pip 安装失败', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_python',
        arguments: {
          code: 'import non_existent_pkg; print("success")',
          packages: ['non_existent_pkg_xyz']
        },
        timeout: 60000
      });
      
      expect(response.result.isError).toBe(true);
    }, 90000);
  });

  // ========== 超时测试 ==========
  describe('超时控制', () => {
    test('应该支持自定义超时', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_python',
        arguments: {
          code: 'import time; time.sleep(0.5); print("done")',
          timeout: 10000
        }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.stdout).toContain('done');
    });

    test('超时应该返回错误', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_python',
        arguments: {
          code: 'import time; time.sleep(10); print("done")',
          timeout: 2000
        }
      });
      
      expect(response.result.isError).toBe(true);
      expect(response.result.content[0].text).toContain('Timeout');
    });
  });

  // ========== 错误处理测试 ==========
  describe('错误处理', () => {
    test('语法错误应该返回错误', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_python',
        arguments: { code: 'if True:' }
      });
      
      expect(response.result.isError).toBe(true);
    });

    test('运行时错误应该返回错误', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_python',
        arguments: { code: 'print(undefined_variable)' }
      });
      
      expect(response.result.isError).toBe(true);
    });

    test('除零错误应该返回错误', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_python',
        arguments: { code: 'print(10 / 0)' }
      });
      
      expect(response.result.isError).toBe(true);
    });
  });

  // ========== 内置模块测试 ==========
  describe('内置模块', () => {
    test('应该支持 datetime 模块', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_python',
        arguments: {
          code: 'import datetime; print(datetime.datetime.now().year)'
        }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.stdout).toMatch(/20\d{2}/);
    });

    test('应该支持 math 模块', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_python',
        arguments: { code: 'import math; print(math.sqrt(16))' }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.stdout).toContain('4.0');
    });

    test('应该支持 random 模块', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_python',
        arguments: {
          code: 'import random; print(0 <= random.random() < 1)'
        }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.stdout).toContain('True');
    });
  });

  // ========== 多行代码测试 ==========
  describe('多行代码', () => {
    test('应该支持多行函数定义', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_python',
        arguments: {
          code: `
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n-1)

print(factorial(5))
          `
        }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.stdout).toContain('120');
    });

    test('应该支持多行循环', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_python',
        arguments: {
          code: `
total = 0
for i in range(5):
    total += i
print(total)
          `
        }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.stdout).toContain('10');
    });
  });
});