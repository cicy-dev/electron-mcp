const { setPort, setupTest, teardownTest, sendRequest } = require('./test-utils');

describe('MCP HTTP API - 完整测试套件', () => {
  beforeAll(async () => {
    setPort(8102);
    await setupTest();
  }, 30000);

  afterAll(async () => {
    await teardownTest();
  });


  describe('基础连接测试', () => {
    test('应该建立SSE连接并获得sessionId', async () => {
      const sessionId = await sendRequest('initialize', {});
      expect(sessionId).toBeDefined();
    });

    test('应该列出所有可用工具', async () => {
      const response = await sendRequest('tools/list');
      expect(response.result).toBeDefined();
      const tools = response.result.tools || response.result;
      expect(tools).toBeDefined();
      expect(tools.length).toBeGreaterThan(0);
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('ping');
    });
  });
});
