/**
 * Storage 测试
 * 测试 localStorage, sessionStorage, IndexedDB
 */

const request = require('supertest');
const http = require('http');
const { cleanupPort, startMCPServer, establishSSEConnection, waitForSSEResponse, cleanupProcess } = require('./setup');

describe('Storage 测试', () => {
  const PORT = 8109;
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

  test('cdp_storage_set 应该设置 localStorage', async () => {
    const response = await sendRequest('tools/call', {
      name: 'cdp_storage_set',
      arguments: {
        win_id: 1,
        storageType: 'localStorage',
        data: { testKey: 'testValue' }
      }
    });
    
    expect(response.result).toBeDefined();
    expect(response.result.content[0].text).toContain('set');
  });

  test('cdp_storage_get 应该获取 localStorage', async () => {
    const response = await sendRequest('tools/call', {
      name: 'cdp_storage_get',
      arguments: {
        win_id: 1,
        storageType: 'localStorage'
      }
    });
    
    expect(response.result).toBeDefined();
    const result = JSON.parse(response.result.content[0].text);
    expect(result).toHaveProperty('testKey');
  });

  test('cdp_storage_clear 应该清空 localStorage', async () => {
    const response = await sendRequest('tools/call', {
      name: 'cdp_storage_clear',
      arguments: {
        win_id: 1,
        storageType: 'localStorage'
      }
    });
    
    expect(response.result).toBeDefined();
    expect(response.result.content[0].text).toContain('cleared');
  });

  test('cdp_indexeddb_list_databases 应该列出数据库', async () => {
    const response = await sendRequest('tools/call', {
      name: 'cdp_indexeddb_list_databases',
      arguments: { win_id: 1 }
    });
    
    expect(response.result).toBeDefined();
    const result = JSON.parse(response.result.content[0].text);
    expect(result).toHaveProperty('databaseNames');
  });
});
