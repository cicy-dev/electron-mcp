const axios = require('axios');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = process.env.RPC_PORT || 8101;
const BASE_URL = `http://localhost:${PORT}`;

const tokenPath = path.join(os.homedir(), 'electron-mcp-token.txt');
const authToken = fs.existsSync(tokenPath) ? fs.readFileSync(tokenPath, 'utf8').trim() : '';

describe('REST API', () => {
  jest.setTimeout(30000);

  test('should get tools list', async () => {
    const response = await axios.get(`${BASE_URL}/rpc/tools`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(response.status).toBe(200);
    expect(response.data.tools).toBeDefined();
    expect(Array.isArray(response.data.tools)).toBe(true);
  });

  test('should ping via RPC', async () => {
    const response = await axios.post(`${BASE_URL}/rpc/tools/call`, {
      name: 'ping',
      arguments: {}
    }, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      }
    });
    expect(response.status).toBe(200);
    expect(response.data.result.content[0].text).toBe('Pong');
  });
});
