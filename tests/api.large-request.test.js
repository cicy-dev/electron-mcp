const { setPort, setupTest, teardownTest, sendRequest } = require('./test-utils');
const fs = require('fs');

describe('MCP HTTP API - 大请求体测试', () => {
  beforeAll(async () => {
    setPort(9848);
    await setupTest();
  }, 30000);

  afterAll(async () => {
    await teardownTest();
  });

  let winId;

  test('应该打开新窗口', async () => {
    const response = await sendRequest('tools/call', {
      name: 'open_window',
      arguments: { url: 'https://example.com' }
    });
    const text = response.result.content[0].text;
    winId = parseInt(text.match(/ID: (\d+)/)[1]);
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  test('应该获取请求列表', async () => {
    const reqResponse = await sendRequest('tools/call', {
      name: 'get_requests',
      arguments: { win_id: winId, page: 1, page_size: 10 }
    });
    const requests = JSON.parse(reqResponse.result.content[0].text);
    expect(requests.total).toBeGreaterThan(0);
    expect(requests.data[0]).toHaveProperty('index');
    expect(requests.data[0]).toHaveProperty('postDataSize');
  });

  test('应该获取请求详情', async () => {
    const reqResponse = await sendRequest('tools/call', {
      name: 'get_requests',
      arguments: { win_id: winId, page: 1, page_size: 1 }
    });
    const requests = JSON.parse(reqResponse.result.content[0].text);
    const firstIndex = requests.data[0].index;
    
    const detailResponse = await sendRequest('tools/call', {
      name: 'get_request_detail',
      arguments: { win_id: winId, index: firstIndex }
    });
    const detail = JSON.parse(detailResponse.result.content[0].text);
    
    expect(detail).toHaveProperty('requestId');
    expect(detail).toHaveProperty('method');
    
    // 如果有 postData，验证大小逻辑
    if (detail.postDataSize > 1024) {
      expect(detail).toHaveProperty('postDataFile');
      expect(detail.postDataFile).toContain('/tmp/electron-mcp');
      if (fs.existsSync(detail.postDataFile)) {
        const stat = fs.statSync(detail.postDataFile);
        expect(stat.size).toBeGreaterThan(1024);
      }
    } else if (detail.postData) {
      expect(detail.postDataFile).toBeUndefined();
    }
  });
});
