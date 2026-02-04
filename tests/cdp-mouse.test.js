const request = require('supertest');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('CDP Mouse Tools Tests', () => {
  let serverProcess;
  let authToken;
  const baseURL = 'http://localhost:8103';
  let requestId = 1;

  beforeAll(async () => {
    serverProcess = spawn('node', ['start-mcp.js', '--port=8103'], {
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
      .post('/mcp')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        jsonrpc: '2.0',
        id: requestId++,
        method: `tools/${toolName}`,
        params: { arguments: args }
      });
    return response;
  };

  describe('Mouse Click Operations', () => {
    test('left click at coordinates', async () => {
      const response = await callTool('cdp_click', {
        win_id: 1,
        x: 200,
        y: 300,
        button: 'left'
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.content[0].text).toContain('Clicked at (200, 300) with left button');
    });

    test('right click at coordinates', async () => {
      const response = await callTool('cdp_click', {
        win_id: 1,
        x: 250,
        y: 350,
        button: 'right'
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.content[0].text).toContain('Clicked at (250, 350) with right button');
    });

    test('middle click at coordinates', async () => {
      const response = await callTool('cdp_click', {
        win_id: 1,
        x: 300,
        y: 400,
        button: 'middle'
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.content[0].text).toContain('Clicked at (300, 400) with middle button');
    });

    test('double click operation', async () => {
      const response = await callTool('cdp_double_click', {
        win_id: 1,
        x: 400,
        y: 500
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.content[0].text).toContain('Double clicked at (400, 500)');
    });
  });

  describe('Mouse Error Handling', () => {
    test('invalid window ID for click', async () => {
      const response = await callTool('cdp_click', {
        win_id: 888,
        x: 100,
        y: 100
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.isError).toBe(true);
      expect(response.body.result.content[0].text).toContain('Window 888 not found');
    });

    test('invalid coordinates handling', async () => {
      const response = await callTool('cdp_click', {
        win_id: 1,
        x: -100,
        y: -100
      });
      
      expect(response.status).toBe(200);
      // Should still work but with negative coordinates
      expect(response.body.result.content[0].text).toContain('Clicked at (-100, -100)');
    });
  });
});
