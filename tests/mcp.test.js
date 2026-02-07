const { setPort, setupTest, teardownTest, sendRequest } = require("./test-utils");

describe("MCP HTTP API - 模版 测试套件", () => {
  beforeAll(async () => {
    setPort(7102);
    await setupTest();
  }, 30000);

  afterAll(async () => {
    await teardownTest();
  });

  describe("模版 基础连接测试", () => {
    test("模版 应该建立SSE连接并获得sessionId", async () => {
      const response = await sendRequest("initialize", {});
      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
    });

    test("模版 应该列出所有可用工具并包含ping工具", async () => {
      const response = await sendRequest("tools/list", {});
      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
      expect(response.result.tools).toBeInstanceOf(Array);
      expect(response.result.tools.length).toBeGreaterThan(0);

      const toolNames = response.result.tools.map((t) => t.name);
      expect(toolNames).toContain("ping");
    });

    test("模版 ping工具应该正常执行并返回成功响应", async () => {
      const response = await sendRequest("ping", {});
      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
    });
  });
});
