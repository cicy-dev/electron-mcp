const { setPort, setupTest, teardownTest, sendRequest } = require('./test-utils');

describe('MCP HTTP API - 窗口工具测试', () => {
  beforeAll(async () => {
    setPort(9844);
    await setupTest();
  }, 30000);

  afterAll(async () => {
    await teardownTest();
  });

  describe('窗口管理工具', () => {
    let winId;

    test('应该打开新窗口', async () => {
      const response = await sendRequest('tools/call', {
        name: 'open_window',
        arguments: { url: 'https://example.com' }
      });
      expect(response.result).toBeDefined();
      const text = response.result.content[0].text;
      expect(text).toContain('Opened window');
      winId = parseInt(text.match(/\d+/)[0]);
      expect(winId).toBeGreaterThan(0);
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    test('应该获取所有窗口列表', async () => {
      const response = await sendRequest('tools/call', {
        name: 'get_windows',
        arguments: {}
      });
      expect(response.result.content[0].text).toContain(winId.toString());
    });

    test('应该获取窗口标题', async () => {
      const response = await sendRequest('tools/call', {
        name: 'get_title',
        arguments: { win_id: winId }
      });
      expect(response.result.content[0].text).toBeTruthy();
    });

    test('应该加载新URL', async () => {
      const response = await sendRequest('tools/call', {
        name: 'load_url',
        arguments: { win_id: winId, url: 'https://www.google.com' }
      });
      expect(response.result.content[0].text).toContain('Loaded');
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    test('应该捕获页面截图并复制到剪贴板', async () => {
      const response = await sendRequest('tools/call', {
        name: 'webpage_screenshot_and_to_clipboard',
        arguments: { win_id: winId }
      });
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeDefined();
      expect(response.result.content.length).toBeGreaterThan(0);
      
      const hasImage = response.result.content.some(item => item.type === 'image');
      expect(hasImage).toBe(true);
      
      const imageContent = response.result.content.find(item => item.type === 'image');
      expect(imageContent.data).toBeDefined();
      expect(imageContent.mimeType).toBe('image/png');
    });

    test.skip('应该关闭窗口', async () => {
      const response = await sendRequest('tools/call', {
        name: 'close_window',
        arguments: { win_id: winId }
      });
      expect(response.result.content[0].text).toContain('Closed');
    });
  });
});
