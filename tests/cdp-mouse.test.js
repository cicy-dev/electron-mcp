/**
 * CDP 鼠标操作测试
 * 测试 cdp_click, cdp_mouse_move, cdp_mouse_drag
 */

const request = require('supertest');
const http = require('http');
const { cleanupPort, startMCPServer, establishSSEConnection, waitForSSEResponse, cleanupProcess } = require('./setup');

describe('CDP 鼠标操作测试', () => {
  const PORT = 8105;
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

  test('cdp_click 应该执行基本点击', async () => {
    const response = await sendRequest('tools/call', {
      name: 'cdp_click',
      arguments: { x: 100, y: 100 }
    });
    
    expect(response.result).toBeDefined();
    expect(response.result.content[0].text).toMatch(/CDP Clicked/);
  });

  test('cdp_mouse_move 应该移动鼠标', async () => {
    const response = await sendRequest('tools/call', {
      name: 'cdp_mouse_move',
      arguments: { x: 300, y: 400 }
    });
    
    expect(response.result).toBeDefined();
    expect(response.result.content[0].text).toContain('300, 400');
  });

  test('cdp_mouse_drag 应该执行拖拽', async () => {
    const response = await sendRequest('tools/call', {
      name: 'cdp_mouse_drag',
      arguments: { x1: 100, y1: 100, x2: 300, y2: 300 }
    });
    
    expect(response.result).toBeDefined();
    expect(response.result.content[0].text).toMatch(/CDP Dragged/);
  });
});
