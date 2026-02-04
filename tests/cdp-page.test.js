const request = require('supertest');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('CDP Page Tools Tests', () => {
  let serverProcess;
  let authToken;
  const baseURL = 'http://localhost:8105';
  let requestId = 1;

  beforeAll(async () => {
    serverProcess = spawn('node', ['start-mcp.js', '--port=8105'], {
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

  describe('Page Scrolling', () => {
    test('scroll vertically', async () => {
      const response = await callTool('cdp_scroll', {
        win_id: 1,
        x: 0,
        y: 200
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.content[0].text).toContain('Scrolled by (0, 200)');
    });

    test('scroll horizontally', async () => {
      const response = await callTool('cdp_scroll', {
        win_id: 1,
        x: 100,
        y: 0
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.content[0].text).toContain('Scrolled by (100, 0)');
    });

    test('scroll diagonally', async () => {
      const response = await callTool('cdp_scroll', {
        win_id: 1,
        x: 50,
        y: 150
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.content[0].text).toContain('Scrolled by (50, 150)');
    });
  });

  describe('Element Finding', () => {
    test('find existing element', async () => {
      const response = await callTool('cdp_find_element', {
        win_id: 1,
        selector: 'body'
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.content[0].text).toContain('Search result: Element found');
    });

    test('find non-existing element', async () => {
      const response = await callTool('cdp_find_element', {
        win_id: 1,
        selector: '#non-existing-element'
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.content[0].text).toContain('Search result: Element not found');
    });

    test('find with complex selector', async () => {
      const response = await callTool('cdp_find_element', {
        win_id: 1,
        selector: 'html > body'
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.content[0].text).toContain('Search result:');
    });
  });

  describe('Page Information', () => {
    test('get page title', async () => {
      const response = await callTool('cdp_get_page_title', {
        win_id: 1
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.content[0].text).toContain('Page title:');
    });

    test('get page URL', async () => {
      const response = await callTool('cdp_get_page_url', {
        win_id: 1
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.content[0].text).toContain('Current URL:');
      expect(response.body.result.content[0].text).toContain('http');
    });
  });

  describe('Script Execution', () => {
    test('execute simple math', async () => {
      const response = await callTool('cdp_execute_script', {
        win_id: 1,
        script: '2 + 3'
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.content[0].text).toContain('Script result: 5');
    });

    test('execute DOM query', async () => {
      const response = await callTool('cdp_execute_script', {
        win_id: 1,
        script: 'document.body.tagName'
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.content[0].text).toContain('Script result: "BODY"');
    });

    test('execute string operation', async () => {
      const response = await callTool('cdp_execute_script', {
        win_id: 1,
        script: '"Hello " + "World"'
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.content[0].text).toContain('Script result: "Hello World"');
    });

    test('execute array operation', async () => {
      const response = await callTool('cdp_execute_script', {
        win_id: 1,
        script: '[1, 2, 3].length'
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.content[0].text).toContain('Script result: 3');
    });
  });

  describe('Page Tools Error Handling', () => {
    test('invalid window ID for scroll', async () => {
      const response = await callTool('cdp_scroll', {
        win_id: 666,
        x: 0,
        y: 100
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.isError).toBe(true);
      expect(response.body.result.content[0].text).toContain('Window 666 not found');
    });

    test('invalid script execution', async () => {
      const response = await callTool('cdp_execute_script', {
        win_id: 1,
        script: 'invalid.syntax.error('
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.isError).toBe(true);
    });

    test('invalid CSS selector', async () => {
      const response = await callTool('cdp_find_element', {
        win_id: 1,
        selector: 'invalid>>selector<<<'
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.isError).toBe(true);
    });
  });
});
