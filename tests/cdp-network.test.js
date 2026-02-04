/**
 * CDP 网络测试
 * 测试网络请求监控和控制台日志
 */

const request = require('supertest');
const http = require('http');
const { cleanupPort, startMCPServer, establishSSEConnection, waitForSSEResponse, cleanupProcess } = require('./setup');

describe('CDP 网络测试', () => {
  const PORT = 8108;
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
    await new Promise(resolve => setTimeout(resolve, 5000));
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

  test('cdp_console_messages 应该获取控制台消息', async () => {
    const response = await sendRequest('tools/call', {
      name: 'cdp_console_messages',
      arguments: { win_id: 1 }
    });
    
    expect(response.result).toBeDefined();
    const result = JSON.parse(response.result.content[0].text);
    expect(result).toHaveProperty('messages');
  });

  test('clear_console 应该清除控制台', async () => {
    const response = await sendRequest('tools/call', {
      name: 'clear_console',
      arguments: { win_id: 1 }
    });
    
    expect(response.result).toBeDefined();
    expect(response.result.content[0].text).toContain('cleared');
  });

  test('cdp_network_requests 应该获取网络请求', async () => {
    const response = await sendRequest('tools/call', {
      name: 'cdp_network_requests',
      arguments: { win_id: 1 }
    });
    
    expect(response.result).toBeDefined();
    const result = JSON.parse(response.result.content[0].text);
    expect(result).toHaveProperty('requests');
  });

  test('cdp_reload 应该支持 clearConsole', async () => {
    const response = await sendRequest('tools/call', {
      name: 'cdp_reload',
      arguments: { win_id: 1, clearConsole: true }
    });
    
    expect(response.result).toBeDefined();
    expect(response.result.content[0].text).toContain('console cleared');
  });
});
