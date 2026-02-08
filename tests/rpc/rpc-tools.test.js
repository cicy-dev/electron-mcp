const axios = require('axios');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = process.env.RPC_PORT || 8101;
const BASE_URL = `http://localhost:${PORT}`;

// 读取 token
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
    timeout: 30000,
  });

  if (response.data.error) {
    throw new Error(response.data.error.message);
  }

  return response.data.result;
}

describe('RPC Tools', () => {
  jest.setTimeout(60000);
  
  describe('ping', () => {
    test('should respond with pong', async () => {
      const result = await callRPC('ping');
      expect(result.content[0].text).toBe('Pong');
    });
  });

  describe('window tools', () => {
    let windowId;

    test('should open window', async () => {
      const result = await callRPC('open_window', {
        url: 'https://example.com',
        accountIdx: 0
      });
      
      const text = result.content[0].text;
      const match = text.match(/ID:\s*(\d+)/);
      expect(match).toBeTruthy();
      windowId = parseInt(match[1]);
      expect(windowId).toBeGreaterThan(0);
      
      // 等待窗口完全加载
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    test('should get windows', async () => {
      const result = await callRPC('get_windows');
      const windows = JSON.parse(result.content[0].text);
      expect(Array.isArray(windows)).toBe(true);
      expect(windows.length).toBeGreaterThan(0);
    });

    test('should get window info', async () => {
      const result = await callRPC('get_window_info', { win_id: windowId });
      const info = JSON.parse(result.content[0].text);
      expect(info.id).toBe(windowId);
    });

    test('should close window', async () => {
      const result = await callRPC('close_window', { win_id: windowId });
      expect(result.content[0].text).toContain('Closed');
      
      // 等待窗口完全关闭
      await new Promise(resolve => setTimeout(resolve, 1000));
    });
  });

  describe('CDP tools', () => {
    let windowId;

    beforeAll(async () => {
      const result = await callRPC('open_window', {
        url: 'https://example.com',
        accountIdx: 0
      });
      const match = result.content[0].text.match(/ID:\s*(\d+)/);
      windowId = parseInt(match[1]);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }, 30000);

    afterAll(async () => {
      if (windowId) {
        await callRPC('close_window', { win_id: windowId });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }, 10000);

    test('should click element', async () => {
      const result = await callRPC('cdp_click', {
        win_id: windowId,
        x: 100,
        y: 100
      });
      expect(result.content[0].text).toContain('Clicked');
    }, 10000);

    test('should take screenshot', async () => {
      const result = await callRPC('webpage_screenshot_and_to_clipboard', {
        win_id: windowId
      });
      expect(result.content[0].text).toBeTruthy();
    }, 10000);

    test('should get page snapshot', async () => {
      const result = await callRPC('webpage_snapshot', {
        win_id: windowId,
        include_screenshot: false
      });
      expect(result.content[0].text).toBeTruthy();
    }, 10000);
  });

  describe('exec_js', () => {
    let windowId;

    beforeAll(async () => {
      const result = await callRPC('open_window', {
        url: 'https://example.com',
        accountIdx: 0
      });
      const match = result.content[0].text.match(/ID:\s*(\d+)/);
      windowId = parseInt(match[1]);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }, 30000);

    afterAll(async () => {
      if (windowId) {
        await callRPC('close_window', { win_id: windowId });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }, 10000);

    test('should execute JavaScript', async () => {
      const result = await callRPC('exec_js', {
        win_id: windowId,
        code: 'document.title'
      });
      expect(result.content[0].text).toBeTruthy();
    }, 10000);

    test('should execute complex JavaScript', async () => {
      const result = await callRPC('exec_js', {
        win_id: windowId,
        code: 'JSON.stringify({url: window.location.href, title: document.title})'
      });
      const data = JSON.parse(result.content[0].text);
      expect(data.url).toBeTruthy();
      expect(data.title).toBeTruthy();
    });
  });
});
