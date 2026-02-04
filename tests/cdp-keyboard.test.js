const request = require('supertest');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('CDP Keyboard Tools Tests', () => {
  let serverProcess;
  let authToken;
  const baseURL = 'http://localhost:8104';
  let requestId = 1;

  beforeAll(async () => {
    serverProcess = spawn('node', ['start-mcp.js', '--port=8104'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, NODE_ENV: 'test', TEST: 'true' },
      stdio: 'pipe'
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const tokenPath = path.join(os.homedir(), 'electron-mcp-token.txt');
    if (fs.existsSync(tokenPath)) {
      authToken = fs.readFileSync(tokenPath, 'utf8').trim();
    }
  });

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  });

  const callTool = async (toolName, args = {}) => {
    const response = await request(baseURL)
      .post('/mcp?sessionId=test')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        jsonrpc: '2.0',
        id: requestId++,
        method: `tools/${toolName}`,
        params: { arguments: args }
      });
    return response;
  };

  describe('Basic Key Presses', () => {
    test('press generic key', async () => {
      const response = await callTool('cdp_press_key', {
        win_id: 1,
        key: 'ArrowDown'
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.content[0].text).toContain('Pressed key: ArrowDown');
    });

    test('press Enter key', async () => {
      const response = await callTool('cdp_press_key_enter', {
        win_id: 1
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.content[0].text).toContain('Pressed Enter key');
    });

    test('press Escape key', async () => {
      const response = await callTool('cdp_press_key_esc', {
        win_id: 1
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.content[0].text).toContain('Pressed Escape key');
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('copy operation (Ctrl+C)', async () => {
      const response = await callTool('cdp_press_key_copy', {
        win_id: 1
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.content[0].text).toContain('Executed copy (Ctrl+C)');
    });

    test('paste operation (Ctrl+V)', async () => {
      const response = await callTool('cdp_press_key_paste', {
        win_id: 1
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.content[0].text).toContain('Executed paste (Ctrl+V)');
    });
  });

  describe('Text Input', () => {
    test('type simple text', async () => {
      const response = await callTool('cdp_type_text', {
        win_id: 1,
        text: 'Hello World'
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.content[0].text).toContain('Typed text: Hello World');
    });

    test('type special characters', async () => {
      const response = await callTool('cdp_type_text', {
        win_id: 1,
        text: '!@#$%^&*()'
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.content[0].text).toContain('Typed text: !@#$%^&*()');
    });

    test('type unicode text', async () => {
      const response = await callTool('cdp_type_text', {
        win_id: 1,
        text: '你好世界 🌍'
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.content[0].text).toContain('Typed text: 你好世界 🌍');
    });
  });

  describe('Keyboard Error Handling', () => {
    test('invalid window ID for key press', async () => {
      const response = await callTool('cdp_press_key', {
        win_id: 777,
        key: 'Enter'
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.isError).toBe(true);
      expect(response.body.result.content[0].text).toContain('Window 777 not found');
    });

    test('empty text input', async () => {
      const response = await callTool('cdp_type_text', {
        win_id: 1,
        text: ''
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.content[0].text).toContain('Typed text: ');
    });
  });
});
