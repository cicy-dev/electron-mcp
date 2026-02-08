const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");
const log = require("electron-log");

/**
 * 认证模块 - 处理令牌生成、验证和管理
 */
class AuthManager {
  constructor() {
    this.authToken = this.getOrGenerateToken();
    console.log("[MCP] Auth token enabled");
    console.log("[MCP] Token saved to ~/electron-mcp-token.txt");
  }

  /**
   * 获取或生成认证令牌
   * @returns {string} 认证令牌
   */
  getOrGenerateToken() {
    const tokenPath = path.join(os.homedir(), "electron-mcp-token.txt");

    try {
      // 检查是否已存在令牌
      if (fs.existsSync(tokenPath)) {
        const token = fs.readFileSync(tokenPath, "utf8").trim();
        if (token) {
          console.log("[MCP] Using existing token from", tokenPath);
          return token;
        }
      }

      // 生成新令牌
      const newToken = crypto.randomBytes(32).toString("hex");
      fs.writeFileSync(tokenPath, newToken);
      console.log("[MCP] Generated new token and saved to", tokenPath);
      return newToken;
    } catch (error) {
      console.error("[MCP] Token management error:", error);
      return crypto.randomBytes(32).toString("hex"); // fallback
    }
  }

  /**
   * 验证认证令牌
   * @param {Object} req - HTTP 请求对象
   * @returns {boolean} 验证结果
   */
  validateAuth(req) {
    const authHeader = req.headers.authorization;

    // console.log(">> url:", req.url);
    // if (req.body) {
    //   console.log(">> body:", JSON.stringify(req.body, null, 2));
    // } else {
    //   console.log(">> body: [Empty or not parsed]");
    // }
    // console.log(">> headers:", JSON.stringify(req.headers, null, 2), authHeader);

    if (!authHeader) return false;
    const token = authHeader.replace("Bearer ", "");
    return token === this.authToken;
  }

  /**
   * 获取当前认证令牌
   * @returns {string} 当前令牌
   */
  getToken() {
    return this.authToken;
  }
}

module.exports = { AuthManager };
