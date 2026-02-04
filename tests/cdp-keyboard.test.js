/**
 * CDP 键盘操作测试
 * 测试 cdp_keyboard_type, cdp_keyboard_press
 */

const request = require('supertest');
const http = require('http');
const { cleanupPort, startMCPServer, establishSSEConnection, waitForSSEResponse, cleanupProcess } = require('./setup');

describe('CDP 键盘操作测试', () => {
  const PORT = 8106;
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

  test('cdp_keyboard_type 应该输入文本', async () => {
    const response = await sendRequest('tools/call', {
      name: 'cdp_keyboard_type',
      arguments: { text: 'hello' }
    });
    
    expect(response.result).toBeDefined();
    expect(response.result.content[0].text).toContain('hello');
  });

  test('cdp_keyboard_press 应该按下按键', async () => {
    const response = await sendRequest('tools/call', {
      name: 'cdp_keyboard_press',
      arguments: { key: 'Enter' }
    });
    
    expect(response.result).toBeDefined();
    expect(response.result.content[0].text).toContain('Enter');
  });

  test('cdp_keyboard_press 应该支持组合键', async () => {
    const response = await sendRequest('tools/call', {
      name: 'cdp_keyboard_press',
      arguments: { key: 's', modifiers: ['Ctrl'] }
    });
    
    expect(response.result).toBeDefined();
    expect(response.result.content[0].text).toContain('Ctrl');
  });
});
