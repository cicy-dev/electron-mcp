const axios = require('axios');
const config = require('./config');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

/**
 * Electron MCP 客户端
 * 封装与 electron-mcp 服务的通信
 */
class ElectronMCPClient {
  constructor(port = config.mcpPort, host = config.mcpHost) {
    this.baseUrl = `http://${host}:${port}`;
    this.requestId = 1;
    this.sessionId = null;
    
    // 读取认证 token
    const tokenPath = path.join(os.homedir(), 'electron-mcp-token.txt');
    if (fs.existsSync(tokenPath)) {
      this.authToken = fs.readFileSync(tokenPath, 'utf8').trim();
    }
  }

  /**
   * 建立 SSE 连接获取 sessionId
   */
  async connect() {
    if (this.sessionId) return;
    if (this.connecting) {
      await this.connecting;
      return;
    }

    this.connecting = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('SSE连接超时')), 10000);

      const options = {
        hostname: 'localhost',
        port: this.baseUrl.split(':')[2],
        path: '/mcp',
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          Authorization: `Bearer ${this.authToken}`,
        },
      };

      this.sseReq = http.request(options, (res) => {
        let buffer = '';
        this.sseResponses = {};
        
        res.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          
          let eventType = null;
          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.substring(6).trim();
            } else if (line.startsWith('data:')) {
              const data = line.substring(5).trim();
              
              // 获取 sessionId
              if (eventType === 'endpoint') {
                const match = data.match(/sessionId=([^\s&]+)/);
                if (match) {
                  this.sessionId = match[1];
                  clearTimeout(timeout);
                  resolve();
                }
              }
              
              // 保存消息响应
              if (eventType === 'message' && data.startsWith('{')) {
                try {
                  const messageData = JSON.parse(data);
                  if (messageData.id) {
                    this.sseResponses[messageData.id] = messageData;
                  }
                } catch (e) {}
              }
              
              eventType = null;
            }
          }
        });
      });

      this.sseReq.on('error', reject);
      this.sseReq.end();
    });

    await this.connecting;
  }

  /**
   * 关闭连接
   */
  close() {
    if (this.sseReq) {
      try {
        this.sseReq.destroy();
      } catch (e) {}
      this.sseReq = null;
    }
    this.sessionId = null;
    this.connecting = null;
    this.sseResponses = {};
  }

  /**
   * 调用 MCP 工具
   * @param {string} toolName - 工具名称
   * @param {object} args - 工具参数
   * @returns {Promise<object>} 工具执行结果
   */
  async callTool(toolName, args = {}) {
    await this.connect();
    
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

    try {
      await axios.post(`${this.baseUrl}/messages?sessionId=${this.sessionId}`, payload, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
      });

      // 等待 SSE 响应
      await new Promise((resolve) => {
        const checkResponse = () => {
          if (this.sseResponses[requestId]) {
            resolve();
          } else {
            setTimeout(checkResponse, 100);
          }
        };
        checkResponse();
      });

      const response = this.sseResponses[requestId];
      delete this.sseResponses[requestId];

      if (response.error) {
        throw new Error(response.error.message || 'MCP tool call failed');
      }

      return response.result;
    } catch (error) {
      if (error.response) {
        console.error('Response data:', JSON.stringify(error.response.data));
      }
      throw new Error(`Failed to call MCP tool ${toolName}: ${error.message}`);
    }
  }

  /**
   * 打开窗口
   * @param {string} url - 要打开的 URL
   * @param {number} accountIdx - 账户索引
   * @returns {Promise<number>} 窗口 ID
   */
  async openWindow(url, accountIdx = config.defaultAccountIdx) {
    const result = await this.callTool('open_window', { url, accountIdx });
    
    // 从返回的文本中提取窗口 ID
    const text = result.content[0].text;
    const match = text.match(/ID:\s*(\d+)/);
    
    if (!match) {
      throw new Error('Failed to extract window ID from response');
    }
    
    return parseInt(match[1], 10);
  }

  /**
   * 获取所有窗口
   * @returns {Promise<object>} 窗口列表
   */
  async getWindows() {
    return await this.callTool('get_windows');
  }

  /**
   * 关闭窗口
   * @param {number} winId - 窗口 ID
   * @returns {Promise<object>} 执行结果
   */
  async closeWindow(winId) {
    return await this.callTool('close_window', { win_id: winId });
  }
}

module.exports = ElectronMCPClient;
