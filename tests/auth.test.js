const request = require("supertest");
const fs = require("fs");
const path = require("path");
const os = require("os");

describe("Auth Middleware Tests", () => {
  let serverUrl;
  let authToken;

  beforeAll(() => {
    serverUrl = "http://localhost:8101";
    
    // 读取 token
    const tokenPath = path.join(os.homedir(), "electron-mcp-token.txt");
    if (fs.existsSync(tokenPath)) {
      authToken = fs.readFileSync(tokenPath, "utf8").trim();
      console.log("Auth token loaded:", authToken.substring(0, 10) + "...");
    } else {
      throw new Error("Token file not found. Start the server first.");
    }
  });

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

  test("正确 token 访问 /mcp 应成功", async () => {
    const response = await request(serverUrl)
      .get("/mcp")
      .set("Authorization", `Bearer ${authToken}`);
    expect(response.status).not.toBe(401);
  });

  test("无 token 访问 /messages 应返回 401", async () => {
    const response = await request(serverUrl)
      .post("/messages?sessionId=test")
      .send({});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  test("正确 token 访问 /messages 应通过认证", async () => {
    const response = await request(serverUrl)
      .post("/messages?sessionId=test")
      .set("Authorization", `Bearer ${authToken}`)
      .send({});
    // 401 以外的状态码都说明通过了认证（可能是 400 因为 sessionId 不存在）
    expect(response.status).not.toBe(401);
  });
});
