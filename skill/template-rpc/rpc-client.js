const axios = require('axios');
const fs = require('fs');
const os = require('os');
const path = require('path');

class RPCClient {
  constructor(port = 8101, host = 'localhost') {
    this.baseURL = `http://${host}:${port}`;
    this.requestId = 1;
    
    const tokenPath = path.join(os.homedir(), 'electron-mcp-token.txt');
    this.authToken = fs.existsSync(tokenPath) 
      ? fs.readFileSync(tokenPath, 'utf8').trim() 
      : '';
  }

  async callTool(toolName, args = {}) {
    const payload = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    };

    const response = await axios.post(`${this.baseURL}/rpc`, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.authToken}`,
      },
      timeout: 30000,
    });

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }

    return response.data.result;
  }

  async getTools() {
    const response = await axios.get(`${this.baseURL}/rpc/tools`, {
      headers: {
        Authorization: `Bearer ${this.authToken}`,
      },
    });
    return response.data.tools;
  }
}

module.exports = RPCClient;
