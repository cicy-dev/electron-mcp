const { setPort, setupTest, teardownTest, sendRequest } = require("./test-utils");
const request = require("supertest");
const fs = require("fs");
const path = require("path");
const os = require("os");

describe("MCP HTTP API - Auth 测试套件", () => {
  let authToken;
  let serverUrl;

  beforeAll(async () => {
    setPort(8102);
    await setupTest();
    serverUrl = `http://localhost:8102`;
    
    // 读取 token
    const tokenPath = path.join(os.homedir(), "electron-mcp-token.txt");
    if (fs.existsSync(tokenPath)) {
      authToken = fs.readFileSync(tokenPath, "utf8").trim();
      console.log("Auth token loaded for testing");
    }
  }, 30000);

  afterAll(async () => {
    await teardownTest();
  });

  describe("认证测试", () => {
    test("无 token 访问 /mcp 应返回 401", async () => {
      const response = await request(serverUrl).get("/mcp");
      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Unauthorized");
    });

    test("错误 token 访问 /mcp 应返回 401", async () => {
      const response = await request(serverUrl)
        .get("/mcp")
        .set("Authorization", "Bearer wrong-token-12345");
      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Unauthorized");
    });

    test("正确 token 访问 /mcp 应成功建立连接", async () => {
      const response = await request(serverUrl)
        .get("/mcp")
        .set("Authorization", `Bearer ${authToken}`);
      expect(response.status).not.toBe(401);
      expect(response.status).toBe(200);
    });

    test("无 token 访问 /messages 应返回 401", async () => {
      const response = await request(serverUrl)
        .post("/messages?sessionId=test")
        .send({});
      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Unauthorized");
    });
  });

  describe("基础功能测试（带认证）", () => {
    test("应该建立SSE连接并获得sessionId", async () => {
      const response = await sendRequest("initialize", {});
      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
    });

    test("ping工具应该正常执行", async () => {
      const response = await sendRequest("ping", {});
      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
    });
  });
});
