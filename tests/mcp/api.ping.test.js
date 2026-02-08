const { startTestServer, stopTestServer, getSessionId, getAuthToken, getPort, getSSEResponses } = require("./setup-test-server");
const request = require("supertest");

let requestId = 1;

async function sendRequest(method, params = {}) {
  const id = requestId++;
  const reqBody = { jsonrpc: "2.0", id, method, params };
  const sessionId = getSessionId();
  const authToken = getAuthToken();
  const port = getPort();
  const sseResponses = getSSEResponses();

  await request(`http://localhost:${port}`)
    .post(`/messages?sessionId=${sessionId}`)
    .set("Accept", "application/json")
    .set("Content-Type", "application/json")
    .set("Authorization", `Bearer ${authToken}`)
    .send(reqBody);

  await new Promise((resolve) => {
    const checkResponse = () => {
      if (sseResponses[id]) {
        resolve();
      } else {
        setTimeout(checkResponse, 100);
      }
    };
    checkResponse();
  });

  return sseResponses[id];
}

describe("MCP HTTP API - Auth 测试套件", () => {
  let authToken;
  let serverUrl;

  beforeAll(async () => {
    await startTestServer();
    authToken = getAuthToken();
    serverUrl = `http://localhost:${getPort()}`;
  }, 30000);

  afterAll(async () => {
    await stopTestServer();
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
