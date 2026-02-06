const { setPort, setupTest, teardownTest, sendRequest } = require('./test-utils');

describe('MCP HTTP API - get_window_info 测试', () => {
  beforeAll(async () => {
    setPort(9846);
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
    expect(response.result).toBeDefined();
    const text = response.result.content[0].text;
    expect(text).toContain('Opened window with ID:');
    winId = parseInt(text.match(/ID: (\d+)/)[1]);
    expect(winId).toBeGreaterThan(0);
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  test('应该获取窗口详细信息', async () => {
    const response = await sendRequest('tools/call', {
      name: 'get_window_info',
      arguments: { win_id: winId }
    });
    expect(response.result).toBeDefined();
    const info = JSON.parse(response.result.content[0].text);
    expect(info.id).toBe(winId);
    expect(info.url).toContain('example.com');
    expect(info).toHaveProperty('title');
    expect(info).toHaveProperty('debuggerIsAttached');
    expect(info).toHaveProperty('bounds');
    expect(info).toHaveProperty('isLoading');
    expect(info).toHaveProperty('isDomReady');
  });

  test('应该等待 DOM 就绪', async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const response = await sendRequest('tools/call', {
      name: 'get_window_info',
      arguments: { win_id: winId }
    });
    const info = JSON.parse(response.result.content[0].text);
    expect(info.isDomReady).toBe(true);
    expect(info.isLoading).toBe(false);
  });

  test('不存在的窗口应该返回错误', async () => {
    const response = await sendRequest('tools/call', {
      name: 'get_window_info',
      arguments: { win_id: 99999 }
    });
    expect(response.result).toBeDefined();
    const text = response.result.content[0].text;
    expect(text).toContain('Error');
    expect(text).toContain('not found');
  });
});
