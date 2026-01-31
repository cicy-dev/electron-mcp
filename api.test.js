const request = require('supertest');
const { spawn } = require('child_process');
const http = require('http');

describe('MCP HTTP API - 完整测试套件', () => {
  const PORT = 8102;
  const baseURL = `http://localhost:${PORT}`;
  let electronProcess;
  let sessionId;
  let sseReq;
  let sseResponses = {}; // 存储SSE响应
  let requestId = 1; // 请求ID计数器

  beforeAll(async () => {
    // 清理端口
    require('child_process').execSync(`lsof -ti:${PORT} | xargs kill -9 2>/dev/null || true`);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 启动MCP服务器
    electronProcess = spawn('node', ['start-mcp.js', `--port=${PORT}`], {
      stdio: 'pipe',
      detached: false
    });
    
    // 等待服务器启动
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('服务器启动超时'));
      }, 15000);
      
      electronProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('MCP HTTP Server running')) {
          clearTimeout(timeout);
          resolve();
        }
      });
      
      electronProcess.stderr.on('data', (data) => {
        console.error('服务器错误:', data.toString());
      });
    });
    
    // 等待Electron初始化
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 建立SSE连接
    await new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: PORT,
        path: '/message',
        method: 'GET',
        headers: { 'Accept': 'text/event-stream' }
      };

      sseReq = http.request(options, (res) => {
        expect(res.statusCode).toBe(200);
        
        let buffer = '';
        res.on('data', (chunk) => {
          buffer += chunk.toString();
          
          const lines = buffer.split('\n');
          let eventType = null;
          let eventData = null;
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('event:')) {
              eventType = line.substring(6).trim();
            } else if (line.startsWith('data:')) {
              eventData = line.substring(5).trim();
              
              if (eventType === 'endpoint' && !sessionId) {
                const urlMatch = eventData.match(/sessionId=([^\s&]+)/);
                if (urlMatch) {
                  sessionId = urlMatch[1];
                  resolve();
                }
              } else if (eventType === 'message' && eventData) {
                try {
                  // 处理可能被截断的大型JSON响应
                  if (eventData.startsWith('{') && !eventData.endsWith('}')) {
                    // JSON可能被截断，跳过解析
                    return;
                  }
                  const messageData = JSON.parse(eventData);
                  if (messageData.id) {
                    sseResponses[messageData.id] = messageData;
                  }
                } catch (e) {
                  // 忽略解析错误，可能是大型响应被截断
                }
              }
              
              eventType = null;
              eventData = null;
            }
          }
          
          const lastNewlineIndex = buffer.lastIndexOf('\n');
          if (lastNewlineIndex !== -1) {
            buffer = buffer.substring(lastNewlineIndex + 1);
          }
        });
        
        res.on('error', reject);
      });

      sseReq.on('error', reject);
      sseReq.end();
    });
  }, 20000);

  afterAll(async () => {
    if (sseReq) sseReq.destroy();
    if (electronProcess) {
      electronProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        process.kill(-electronProcess.pid, 'SIGKILL');
      } catch (e) {}
    }
  });

  // 辅助函数：发送请求并等待响应
  const sendRequest = async (method, params = {}) => {
    const id = requestId++;
    const response = await request(baseURL)
      .post(`/message?sessionId=${sessionId}`)
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({ jsonrpc: '2.0', id, method, params });

    expect(response.status).toBe(202);
    
    // 等待SSE响应
    await new Promise(resolve => {
      const checkResponse = () => {
        if (sseResponses[id]) {
          resolve();
        } else {
          setTimeout(checkResponse, 100);
        }
      };
      checkResponse();
    });
    
    return sseResponses[id];
  };

  describe('基础连接测试', () => {
    test('应该建立SSE连接并获得sessionId', () => {
      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^[0-9a-f-]+$/);
    });

    test('应该列出所有可用工具', async () => {
      const response = await sendRequest('tools/list');
      
      expect(response.result).toBeDefined();
      expect(response.result.tools).toBeDefined();
      expect(response.result.tools.length).toBeGreaterThan(0);
      
      const toolNames = response.result.tools.map(t => t.name);
      expect(toolNames).toContain('open_window');
      expect(toolNames).toContain('get_windows');
      expect(toolNames).toContain('close_window');
      expect(toolNames).toContain('load_url');
      expect(toolNames).toContain('get_url');
      expect(toolNames).toContain('get_title');
      expect(toolNames).toContain('execute_javascript');
      expect(toolNames).toContain('ask_question');
      expect(toolNames).toContain('page_snapshot');
      expect(toolNames).toContain('ping');
    });
  });

  describe('系统工具测试', () => {
    test('ping - 应该返回pong', async () => {
      const response = await sendRequest('tools/call', {
        name: 'ping',
        arguments: {}
      });
      
      expect(response.result.content[0].text).toBe('pong');
    });

    test('ask_question - 应该处理问题', async () => {
      const response = await sendRequest('tools/call', {
        name: 'ask_question',
        arguments: { question: '测试问题' }
      });
      
      expect(response.result.content[0].text).toContain('测试问题');
    });
  });

  describe('窗口管理工具测试', () => {
    let windowId;

    test('open_window - 应该打开新窗口', async () => {
      const response = await sendRequest('tools/call', {
        name: 'open_window',
        arguments: { url: 'https://example.com' }
      });
      
      expect(response.result.content[0].text).toContain('Opened window with ID:');
      windowId = parseInt(response.result.content[0].text.match(/ID: (\d+)/)[1]);
    });

    test('get_windows - 应该列出所有窗口', async () => {
      const response = await sendRequest('tools/call', {
        name: 'get_windows',
        arguments: {}
      });
      
      const windows = JSON.parse(response.result.content[0].text);
      expect(Array.isArray(windows)).toBe(true);
      expect(windows.some(w => w.id === windowId)).toBe(true);
    });

    test('get_url - 应该获取窗口URL', async () => {
      const response = await sendRequest('tools/call', {
        name: 'get_url',
        arguments: { win_id: windowId }
      });
      
      expect(response.result.content[0].text).toContain('example.com');
    });

    test('get_title - 应该获取窗口标题', async () => {
      const response = await sendRequest('tools/call', {
        name: 'get_title',
        arguments: { win_id: windowId }
      });
      
      expect(response.result.content[0].text).toBeDefined();
    });

    test('load_url - 应该加载新URL', async () => {
      const response = await sendRequest('tools/call', {
        name: 'load_url',
        arguments: { url: 'https://httpbin.org/html', win_id: windowId }
      });
      
      expect(response.result.content[0].text).toContain('Loaded URL');
    });

    test('execute_javascript - 应该执行JavaScript', async () => {
      const response = await sendRequest('tools/call', {
        name: 'execute_javascript',
        arguments: { code: 'document.title', win_id: windowId }
      });
      
      expect(response.result.content[0].text).toBeDefined();
    });

    test('page_snapshot - 应该捕获页面快照', async () => {
      const response = await sendRequest('tools/call', {
        name: 'page_snapshot',
        arguments: { win_id: windowId, fullPage: false }
      });
      c
      expect(response.result.content).toBeDefined();
      expect(response.result.content[0].text).toContain('Snapshot captured');
    }, 10000); // 增加超时时间到10秒

    test('close_window - 应该关闭窗口', async () => {
      const response = await sendRequest('tools/call', {
        name: 'close_window',
        arguments: { win_id: windowId }
      });
      
      expect(response.result.content[0].text).toContain('Closed window');
    });
  });

  describe('错误处理测试', () => {
    test('应该拒绝无效工具', async () => {
      const response = await sendRequest('tools/call', {
        name: 'invalid_tool',
        arguments: {}
      });
      
      expect(response.result.isError).toBe(true);
      expect(response.result.content[0].text).toContain('Tool invalid_tool not found');
    });

    test('应该处理无效窗口ID', async () => {
      const response = await sendRequest('tools/call', {
        name: 'get_url',
        arguments: { win_id: 99999 }
      });
      
      expect(response.result.isError).toBe(true);
      expect(response.result.content[0].text).toContain('Window 99999 not found');
    });

    test('应该处理无效JavaScript', async () => {
      // 先打开一个窗口用于测试
      const openResponse = await sendRequest('tools/call', {
        name: 'open_window',
        arguments: { url: 'https://example.com' }
      });
      
      const winId = parseInt(openResponse.result.content[0].text.match(/ID: (\d+)/)[1]);
      
      const response = await sendRequest('tools/call', {
        name: 'execute_javascript',
        arguments: { code: 'invalid.javascript.code()', win_id: winId }
      });
      
      expect(response.result.isError).toBe(true);
      
      // 清理窗口
      await sendRequest('tools/call', {
        name: 'close_window',
        arguments: { win_id: winId }
      });
    });
  });

  describe('参数验证测试', () => {
    test('open_window - 缺少必需参数应该失败', async () => {
      const response = await sendRequest('tools/call', {
        name: 'open_window',
        arguments: {}
      });
      
      expect(response.result.isError).toBe(true);
    });

    test('ask_question - 缺少问题参数应该失败', async () => {
      const response = await sendRequest('tools/call', {
        name: 'ask_question',
        arguments: {}
      });
      
      expect(response.result.isError).toBe(true);
    });
  });
});
