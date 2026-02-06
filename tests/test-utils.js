const request = require('supertest');
const { spawn } = require('child_process');
const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');
const os = require('os');

let PORT = 9843;
let baseURL = `http://localhost:${PORT}`;

function setPort(port) {
  PORT = port;
  baseURL = `http://localhost:${PORT}`;
}

let electronProcess;
let sessionId;
let sseReq;
let sseResponses = {};
let requestId = 1;
let authToken;

function checkPort(port) {
  return new Promise((resolve) => {
    const client = new net.Socket();
    client.setTimeout(1000);
    client.on('connect', () => {
      client.destroy();
      resolve(true);
    });
    client.on('timeout', () => {
      client.destroy();
      resolve(false);
    });
    client.on('error', () => {
      resolve(false);
    });
    client.connect(port, 'localhost');
  });
}

async function setupTest() {
  process.env.NODE_ENV = 'test';
  
  require('child_process').execSync(`lsof -ti:${PORT} | xargs kill -9 2>/dev/null || true`);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  electronProcess = spawn('node', ['start-mcp.js', `--port=${PORT}`], {
    stdio: 'pipe',
    detached: false,
    env: { ...process.env, TEST: 'TRUE' }
  });
  
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('服务器启动超时')), 20000);
    
    electronProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('MCP HTTP Server running')) {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const tokenPath = path.join(os.homedir(), 'electron-mcp-token.txt');
  if (fs.existsSync(tokenPath)) {
    authToken = fs.readFileSync(tokenPath, 'utf8').trim();
  }
  
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('SSE连接超时')), 10000);
    
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
                clearTimeout(timeout);
                resolve();
              }
            } else if (eventType === 'message' && eventData) {
              try {
                if (eventData.startsWith('{') && !eventData.endsWith('}')) return;
                const messageData = JSON.parse(eventData);
                if (messageData.id) {
                  sseResponses[messageData.id] = messageData;
                }
              } catch (e) {}
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
}

async function teardownTest() {
  if (sseReq) sseReq.destroy();
  if (electronProcess) {
    electronProcess.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function sendRequest(method, params = {}) {
  const id = requestId++;
  const response = await request(baseURL)
    .post(`/messages?sessionId=${sessionId}`)
    .set('Accept', 'application/json')
    .set('Content-Type', 'application/json')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ jsonrpc: '2.0', id, method, params });

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
}

function getSessionId() {
  return sessionId;
}

module.exports = {
  setPort,
  setupTest,
  teardownTest,
  sendRequest,
  getSessionId
};
