/**
 * CDP 截图测试
 * 测试 cdp_screenshot, cdp_page_print_to_pdf
 */

const request = require('supertest');
const http = require('http');
const { cleanupPort, startMCPServer, establishSSEConnection, waitForSSEResponse, cleanupProcess } = require('./setup');

describe('CDP 截图测试', () => {
  const PORT = 8107;
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
    // Wait for server and main window to be ready
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

  // ========== cdp_screenshot 测试 ==========
  describe('cdp_screenshot', () => {
    test('应该返回 PNG 图片', async () => {
      const response = await sendRequest('tools/call', {
        name: 'cdp_screenshot',
        arguments: { win_id: 1 }
      });
      
      expect(response.result).toBeDefined();
      if (!response.result.isError) {
        const imageContent = response.result.content.find(c => c.type === 'image');
        expect(imageContent).toBeDefined();
        expect(imageContent.mimeType).toBe('image/png');
      }
    });

    test('应该支持 JPEG 格式', async () => {
      const response = await sendRequest('tools/call', {
        name: 'cdp_screenshot',
        arguments: { win_id: 1, format: 'jpeg', quality: 80 }
      });
      
      expect(response.result).toBeDefined();
      expect(response.result.isError).toBeFalsy();
    });
  });

  // ========== cdp_page_print_to_pdf 测试 ==========
  describe('cdp_page_print_to_pdf', () => {
    test('应该返回 PDF 数据', async () => {
      const response = await sendRequest('tools/call', {
        name: 'cdp_page_print_to_pdf',
        arguments: { win_id: 1 }
      });
      
      expect(response.result).toBeDefined();
      expect(response.result.content[0].text).toContain('PDF');
    });
  });
});
