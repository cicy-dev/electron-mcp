const axios = require('axios');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = process.env.RPC_PORT || 8101;
const BASE_URL = `http://localhost:${PORT}`;

const tokenPath = path.join(os.homedir(), 'electron-mcp-token.txt');
const authToken = fs.existsSync(tokenPath) ? fs.readFileSync(tokenPath, 'utf8').trim() : '';

let requestId = 1;

async function callRPC(toolName, args = {}) {
  const payload = {
    jsonrpc: '2.0',
    id: requestId++,
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args,
    },
  };

  const response = await axios.post(`${BASE_URL}/rpc`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
      'Connection': 'close',
    },
    timeout: 10000,
  });

  if (response.data.error) {
    throw new Error(response.data.error.message);
  }

  return response.data.result;
}

describe('RPC Basic Tools', () => {
  jest.setTimeout(30000);
  
  test('should ping', async () => {
    const result = await callRPC('ping');
    expect(result.content[0].text).toBe('Pong');
  });

  test('should get windows', async () => {
    const result = await callRPC('get_windows');
    const windows = JSON.parse(result.content[0].text);
    expect(Array.isArray(windows)).toBe(true);
  });
});
