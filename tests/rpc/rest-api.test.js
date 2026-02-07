const axios = require('axios');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = process.env.RPC_PORT || 8101;
const BASE_URL = `http://localhost:${PORT}`;

const tokenPath = path.join(os.homedir(), 'electron-mcp-token.txt');
const authToken = fs.existsSync(tokenPath) ? fs.readFileSync(tokenPath, 'utf8').trim() : '';

async function callREST(toolName, args = {}) {
  const response = await axios.post(`${BASE_URL}/rpc/${toolName}`, args, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
      'Connection': 'close',
    },
    timeout: 30000,
  });
  return response.data;
}

describe('REST API', () => {
  jest.setTimeout(60000);

  test('should ping', async () => {
    const result = await callREST('ping');
    expect(result.content[0].text).toBe('Pong');
  });

  test('should get windows', async () => {
    const result = await callREST('get_windows');
    const windows = JSON.parse(result.content[0].text);
    expect(Array.isArray(windows)).toBe(true);
  });

  test('should open and close window', async () => {
    const openResult = await callREST('open_window', {
      url: 'https://example.com',
      accountIdx: 0
    });
    
    const text = openResult.content[0].text;
    const match = text.match(/ID:\s*(\d+)/);
    expect(match).toBeTruthy();
    const windowId = parseInt(match[1]);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const closeResult = await callREST('close_window', { win_id: windowId });
    expect(closeResult.content[0].text).toContain('Closed');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  test('should return 404 for unknown tool', async () => {
    try {
      await callREST('unknown_tool');
      fail('Should have thrown error');
    } catch (error) {
      expect(error.response.status).toBe(404);
      expect(error.response.data.error).toContain('Tool not found');
    }
  });
});
