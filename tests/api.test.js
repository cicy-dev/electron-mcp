const request = require('supertest');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('MCP HTTP API - 完整测试套件', () => {
  const PORT = 8102;
  const baseURL = `http://localhost:${PORT}`;
  let electronProcess;
  let sessionId;
  let sseReq;
  let sseResponses = {}; // 存储SSE响应
  let requestId = 1; // 请求ID计数器
  let authToken; // 认证令牌
  beforeAll(async () => {
    // 设置测试环境变量
    process.env.NODE_ENV = 'test';
    
    // 清理端口
    require('child_process').execSync(`lsof -ti:${PORT} | xargs kill -9 2>/dev/null || true`);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 启动MCP服务器
    electronProcess = spawn('node', ['start-mcp.js', `--port=${PORT}`], {
      stdio: 'pipe',
      detached: false,
    env: {
    ...process.env, // 继承当前进程的环境变量
    TEST: 'TRUE'      // 添加自定义环境变量
  }
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
        //console.error('服务器错误:', data.toString());
      });
    });
    
    // 等待Electron初始化
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 读取认证令牌
    const tokenPath = path.join(os.homedir(), 'electron-mcp-token.txt');
    if (fs.existsSync(tokenPath)) {
      authToken = fs.readFileSync(tokenPath, 'utf8').trim();
    }
    
    // 建立SSE连接
    await new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: PORT,
        path: '/mcp',
        method: 'GET',
        headers: { 
          'Accept': 'text/event-stream',
          'Authorization': `Bearer ${authToken}`
        }
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
      .post(`/mcp?sessionId=${sessionId}`)
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${authToken}`)
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
      
      // Handle both {tools: [...]} and direct array format
      const tools = response.result.tools || response.result;
      expect(tools).toBeDefined();
      expect(tools.length).toBeGreaterThan(0);
      
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('open_window');
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

  });

  describe('窗口管理工具测试', () => {
    let windowId;


    describe('get_windows API 测试', () => {
      test('应该返回包含详细状态信息的窗口列表', async () => {
        const response = await sendRequest('tools/call', {
          name: 'get_windows',
          arguments: {}
        });

        const windows = JSON.parse(response.result.content[0].text);

        expect(Array.isArray(windows)).toBe(true);
        if (windows.length > 0) {
          const win = windows[0];
          // 验证新增字段
          expect(win).toHaveProperty('isActive');
          expect(win).toHaveProperty('bounds');
          expect(win.bounds).toHaveProperty('width');
          expect(win).toHaveProperty('isLoading');
          expect(win).toHaveProperty('isDomReady');
          expect(typeof win.isActive).toBe('boolean');
        }
      });
    });

    test('get_title - 应该获取窗口标题', async () => {
      const response = await sendRequest('tools/call', {
        name: 'get_title',
        arguments: { win_id: windowId }
      });
      
      expect(response.result.content[0].text).toBeDefined();
    });

    test('webpage_screenshot_and_to_clipboard - 应该捕获页面截屏', async () => {
      const response = await sendRequest('tools/call', {
        name: 'webpage_screenshot_and_to_clipboard',
        arguments: { win_id: windowId }
      });
      // 1. 校验响应结构是否符合 MCP 标准 (必须有 content 数组)
      expect(response.result).toHaveProperty('content');
      expect(Array.isArray(response.result.content)).toBe(true);

      // 2. 校验返回内容是否包含图像数据
      const imageContent = response.result.content.find(c => c.type === 'image');
      expect(imageContent).toBeDefined();
      expect(imageContent.mimeType).toBe('image/png');
      expect(typeof imageContent.data).toBe('string');

    }, 10000); // 增加超时时间到10秒

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
  });

  describe('参数验证测试', () => {
    test('open_window - 缺少必需参数应该失败', async () => {
      const response = await sendRequest('tools/call', {
        name: 'open_window',
        arguments: {}
      });
      
      expect(response.result.isError).toBe(true);
    });

  });
  describe('invoke_window_webContents API 测试', () => {

    // 1. 成功调用：获取属性
    test('应该成功执行同步代码并返回属性值', async () => {
      const response = await sendRequest('tools/call', {
        name: 'invoke_window_webContents',
        arguments: {
          win_id: 1,
          code: 'return webContents.getURL()'
        }
      });
      
      expect(response.result.isError).toBeUndefined();
      expect(response.result.content[0].type).toBe('text');
      expect(typeof response.result.content[0].text).toBe('string');
    });

    // 2. 成功调用：异步截图 (重点)
    test('应该支持 await 并正确返回 MCP 图像格式', async () => {
      const response = await sendRequest('tools/call', {
        name: 'invoke_window_webContents',
        arguments: {
          win_id: 1,
          code: 'return await webContents.capturePage()'
        }
      });

      const content = response.result.content;
      const imageNode = content.find(c => c.type === 'image');

      expect(imageNode).toBeDefined();
      expect(imageNode.mimeType).toBe('image/png');
      // 验证返回的是合法的 base64 (不带前缀)
      expect(imageNode.data).not.toContain('data:image/png;base64,');
    });

    // 3. 错误处理：无效的 JS 语法
    test('代码语法错误时应该返回 isError', async () => {
      const response = await sendRequest('tools/call', {
        name: 'invoke_window_webContents',
        arguments: {
          code: 'if (true) { // 缺失括号'
        }
      });

      expect(response.result.isError).toBe(true);
      expect(response.result.content[0].text).toMatch(/执行失败|Unexpected token/);
    });

    // 4. 错误处理：无效的 Window ID
    test('访问不存在的 win_id 应该返回错误', async () => {
      const response = await sendRequest('tools/call', {
        name: 'invoke_window_webContents',
        arguments: {
          win_id: 99999,
          code: 'return "hello"'
        }
      });

      expect(response.result.isError).toBe(true);
      expect(response.result.content[0].text).toContain('未找到 ID 为 99999 的窗口');
    });

    // 5. 错误处理：运行时引用错误
    test('引用不存在的对象时应该返回错误', async () => {
      const response = await sendRequest('tools/call', {
        name: 'invoke_window_webContents',
        arguments: {
          code: 'return nonExistentVariable.someMethod()'
        }
      });

      expect(response.result.isError).toBe(true);
      expect(response.result.content[0].text).toContain('is not defined');
    });

  });

  describe('invoke_window_webContents_debugger_cdp API 测试', () => {

    // 1. 成功调用：检查调试器状态
    test('应该成功访问 debugger 对象', async () => {
      const response = await sendRequest('tools/call', {
        name: 'invoke_window_webContents_debugger_cdp',
        arguments: {
          win_id: 1,
          code: 'return debuggerObj.isAttached()'
        }
      });

      expect(response.result.isError).toBeUndefined();
      expect(response.result.content[0].type).toBe('text');
      expect(typeof response.result.content[0].text).toBe('string');
    });

    // 2. 成功调用：附加和分离调试器
    test('应该能够附加和分离调试器', async () => {
      // 先确保调试器未附加
      await sendRequest('tools/call', {
        name: 'invoke_window_webContents_debugger_cdp',
        arguments: {
          win_id: 1,
          code: 'try { debuggerObj.detach(); } catch(e) {} return "cleaned"'
        }
      });

      // 附加调试器
      const attachResponse = await sendRequest('tools/call', {
        name: 'invoke_window_webContents_debugger_cdp',
        arguments: {
          win_id: 1,
          code: 'debuggerObj.attach("1.3"); return "attached"'
        }
      });

      expect(attachResponse.result.isError).toBeUndefined();
      expect(attachResponse.result.content[0].text).toBe('attached');

      // 检查是否已附加
      const checkResponse = await sendRequest('tools/call', {
        name: 'invoke_window_webContents_debugger_cdp',
        arguments: {
          win_id: 1,
          code: 'return debuggerObj.isAttached()'
        }
      });

      expect(checkResponse.result.content[0].text).toBe('true');

      // 分离调试器
      const detachResponse = await sendRequest('tools/call', {
        name: 'invoke_window_webContents_debugger_cdp',
        arguments: {
          win_id: 1,
          code: 'debuggerObj.detach(); return "detached"'
        }
      });

      expect(detachResponse.result.isError).toBeUndefined();
    });

    // 3. 成功调用：发送 CDP 命令
    test('应该能够发送 CDP 命令', async () => {
      // 先确保调试器未附加
      await sendRequest('tools/call', {
        name: 'invoke_window_webContents_debugger_cdp',
        arguments: {
          win_id: 1,
          code: 'try { debuggerObj.detach(); } catch(e) {} return "cleaned"'
        }
      });

      // 附加调试器
      await sendRequest('tools/call', {
        name: 'invoke_window_webContents_debugger_cdp',
        arguments: {
          win_id: 1,
          code: 'debuggerObj.attach("1.3")'
        }
      });

      // 发送 Runtime.evaluate 命令
      const response = await sendRequest('tools/call', {
        name: 'invoke_window_webContents_debugger_cdp',
        arguments: {
          win_id: 1,
          code: 'return await debuggerObj.sendCommand("Runtime.evaluate", { expression: "1 + 1" })'
        }
      });

      expect(response.result.isError).toBeUndefined();
      const result = JSON.parse(response.result.content[0].text);
      expect(result.result.value).toBe(2);

      // 清理：分离调试器
      await sendRequest('tools/call', {
        name: 'invoke_window_webContents_debugger_cdp',
        arguments: {
          win_id: 1,
          code: 'debuggerObj.detach()'
        }
      });
    });

    // 4. 错误处理：无效的 Window ID
    test('访问不存在的 win_id 应该返回错误', async () => {
      const response = await sendRequest('tools/call', {
        name: 'invoke_window_webContents_debugger_cdp',
        arguments: {
          win_id: 99999,
          code: 'return debuggerObj.isAttached()'
        }
      });

      expect(response.result.isError).toBe(true);
      expect(response.result.content[0].text).toContain('未找到 ID 为 99999 的窗口');
    });

    // 5. 错误处理：代码语法错误
    test('代码语法错误时应该返回 isError', async () => {
      const response = await sendRequest('tools/call', {
        name: 'invoke_window_webContents_debugger_cdp',
        arguments: {
          win_id: 1,
          code: 'if (true) { // 缺失括号'
        }
      });

      expect(response.result.isError).toBe(true);
      expect(response.result.content[0].text).toMatch(/执行失败|Unexpected token/);
    });

  });

  describe('invoke_window API 测试', () => {

    // 1. 获取窗口边界 (Bounds)
    test('应该能获取窗口的位置和大小', async () => {
      const response = await sendRequest('tools/call', {
        name: 'invoke_window',
        arguments: {
          win_id: 1,
          code: 'return win.getBounds()'
        }
      });

      const result = JSON.parse(response.result.content[0].text);
      expect(result).toHaveProperty('x');
      expect(result).toHaveProperty('width');
    });


    // 3. 级联调用
    test('应该能通过 win 访问 webContents', async () => {
      const response = await sendRequest('tools/call', {
        name: 'invoke_window',
        arguments: {
          win_id: 1,
          code: 'return win.webContents.isLoading()'
        }
      });

      expect(typeof response.result.content[0].text).toBe('string');
    });
  });
});
