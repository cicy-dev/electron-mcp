const { setPort, setupTest, teardownTest, sendRequest } = require("./test-utils");

describe("MCP HTTP API - Ping 测试套件", () => {
  beforeAll(async () => {
    setPort(8102);
    await setupTest();
  }, 30000);

  afterAll(async () => {
    await teardownTest();
  });

  describe("基础连接测试", () => {
    test("应该建立SSE连接并获得sessionId", async () => {
      const response = await sendRequest("initialize", {});
      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
    });

    test("应该列出所有可用工具并包含ping工具", async () => {
      const response = await sendRequest("tools/list");
      expect(response).toBeDefined();
      expect(response.result).toBeDefined();

      const tools = response.result.tools || response.result;
      expect(tools).toBeInstanceOf(Array);
      expect(tools.length).toBeGreaterThan(0);

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain("ping");
    });

    test("ping工具应该正常执行并返回成功响应", async () => {
      const response = await sendRequest("ping", {});
      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
    });
  });
});
