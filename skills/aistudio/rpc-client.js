const axios = require('axios');
const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * RPC MCP 客户端
 * 直接调用 /rpc 端点，不需要 SSE
 */
class RPCMCPClient {
  constructor(port = 8101, host = 'localhost') {
    this.baseUrl = `http://${host}:${port}`;
    this.requestId = 1;
    
    // 读取认证 token
    const tokenPath = path.join(os.homedir(), 'electron-mcp-token.txt');
    if (fs.existsSync(tokenPath)) {
      this.authToken = fs.readFileSync(tokenPath, 'utf8').trim();
    }
  }

  /**
   * 调用 MCP 工具
   */
  async callTool(toolName, args = {}) {
    const requestId = this.requestId++;
    const payload = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    };

    const response = await axios.post(`${this.baseUrl}/rpc`, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.authToken}`,
      },
    });
    
    if (response.data.error) {
      throw new Error(response.data.error.message || 'MCP error');
    }
    
    return response.data.result;
  }

  /**
   * 打开窗口
   */
  async openWindow(url, accountIdx = 0) {
    const result = await this.callTool('open_window', { url, accountIdx });
    const text = result.content[0].text;
    const match = text.match(/ID:\s*(\d+)/);
    if (!match) throw new Error('Failed to extract window ID');
    return parseInt(match[1], 10);
  }

  /**
   * 获取所有窗口
   */
  async getWindows() {
    return await this.callTool('get_windows');
  }

  /**
   * 关闭窗口
   */
  async closeWindow(winId) {
    return await this.callTool('close_window', { win_id: winId });
  }

  /**
   * 关闭连接（HTTP 无需关闭）
   */
  close() {
    // HTTP 无需关闭连接
  }
}

module.exports = RPCMCPClient;
