const request = require('supertest');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('CDP Tools API Tests', () => {
  let serverProcess;
  let authToken;
  const baseURL = 'http://localhost:8102';
  let requestId = 1;

  beforeAll(async () => {
    // 启动测试服务器
    serverProcess = spawn('node', ['start-mcp.js', '--port=8102'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, NODE_ENV: 'test', TEST: 'true' },
      stdio: 'pipe'
    });

    // 等待服务器启动
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 读取认证令牌
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

  describe('CDP Mouse Tools', () => {
    test('cdp_click should work', async () => {
      const response = await callTool('cdp_click', {
        win_id: 1,
        x: 100,
        y: 100,
        button: 'left'
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.content[0].text).toContain('Clicked at (100, 100)');
    });

    test('cdp_double_click should work', async () => {
      const response = await callTool('cdp_double_click', {
        win_id: 1,
        x: 150,
        y: 150
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.content[0].text).toContain('Double clicked at (150, 150)');
    });
  });

  describe('CDP Keyboard Tools', () => {
    test('cdp_press_key should work', async () => {
      const response = await callTool('cdp_press_key', {
        win_id: 1,
        key: 'Tab'
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.content[0].text).toContain('Pressed key: Tab');
    });

    test('cdp_press_key_enter should work', async () => {
      const response = await callTool('cdp_press_key_enter', {
        win_id: 1
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.content[0].text).toContain('Pressed Enter key');
    });

    test('cdp_press_key_esc should work', async () => {
      const response = await callTool('cdp_press_key_esc', {
        win_id: 1
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.content[0].text).toContain('Pressed Escape key');
    });

    test('cdp_press_key_copy should work', async () => {
      const response = await callTool('cdp_press_key_copy', {
        win_id: 1
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.content[0].text).toContain('Executed copy (Ctrl+C)');
    });

    test('cdp_press_key_paste should work', async () => {
      const response = await callTool('cdp_press_key_paste', {
        win_id: 1
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.content[0].text).toContain('Executed paste (Ctrl+V)');
    });

    test('cdp_type_text should work', async () => {
      const response = await callTool('cdp_type_text', {
        win_id: 1,
        text: 'Hello CDP!'
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.content[0].text).toContain('Typed text: Hello CDP!');
    });
  });

  describe('CDP Page Tools', () => {
    test('cdp_scroll should work', async () => {
      const response = await callTool('cdp_scroll', {
        win_id: 1,
        x: 0,
        y: 100
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.content[0].text).toContain('Scrolled by (0, 100)');
    });

    test('cdp_find_element should work', async () => {
      const response = await callTool('cdp_find_element', {
        win_id: 1,
        selector: 'body'
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.content[0].text).toContain('Search result:');
    });

    test('cdp_get_page_title should work', async () => {
      const response = await callTool('cdp_get_page_title', {
        win_id: 1
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.content[0].text).toContain('Page title:');
    });

    test('cdp_get_page_url should work', async () => {
      const response = await callTool('cdp_get_page_url', {
        win_id: 1
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.content[0].text).toContain('Current URL:');
    });

    test('cdp_execute_script should work', async () => {
      const response = await callTool('cdp_execute_script', {
        win_id: 1,
        script: '1 + 1'
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.content[0].text).toContain('Script result: 2');
    });
  });

  describe('CDP Error Handling', () => {
    test('should handle invalid window ID', async () => {
      const response = await callTool('cdp_click', {
        win_id: 999,
        x: 100,
        y: 100
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.isError).toBe(true);
      expect(response.body.result.content[0].text).toContain('Window 999 not found');
    });

    test('should handle invalid selector', async () => {
      const response = await callTool('cdp_find_element', {
        win_id: 1,
        selector: 'invalid>>selector'
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result.isError).toBe(true);
    });
  });
});
