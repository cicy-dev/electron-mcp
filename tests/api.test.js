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
      .post(`/messages?sessionId=${sessionId}`)
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
});
