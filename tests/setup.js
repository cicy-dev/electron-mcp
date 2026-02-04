/**
 * 测试共享工具
 */

const { spawn, execSync } = require('child_process');
const http = require('http');

/**
 * 清理指定端口
 */
async function cleanupPort(port) {
  try {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`);
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (e) {
    // 忽略错误
  }
}

/**
 * 启动 MCP 服务器
 */
function startMCPServer(port, timeout = 15000) {
  return new Promise(async (resolve, reject) => {
    const electronProcess = spawn('node', ['start-mcp.js', `--port=${port}`], {
      stdio: 'pipe',
      detached: false
    });
    
    let resolved = false;
    
    const checkReady = setInterval(() => {
      try {
        execSync(`lsof -ti:${port} > /dev/null 2>&1`, { stdio: 'ignore' });
        if (!resolved) {
          resolved = true;
          clearInterval(checkReady);
          resolve(electronProcess);
        }
      } catch (e) {
        // 端口未就绪，继续检查
      }
    }, 500);
    
    electronProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('MCP HTTP Server running')) {
        clearInterval(checkReady);
        if (!resolved) {
          resolved = true;
          resolve(electronProcess);
        }
      }
    });
    
    electronProcess.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });
    
    setTimeout(() => {
      clearInterval(checkReady);
      if (!resolved) {
        resolved = true;
        if (electronProcess.exitCode === null) {
          resolve(electronProcess);
        } else {
          reject(new Error('Server failed to start'));
        }
      }
    }, timeout);
  });
}

/**
 * 建立 SSE 连接
 */
function establishSSEConnection(baseURL, port) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('SSE connection timeout'));
    }, 15000);
    
    let buffer = '';
    let sessionId = null;
    
    const req = http.get(`${baseURL}/message`, {
      headers: { 'Accept': 'text/event-stream' }
    }, (res) => {
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        
        const lines = buffer.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const eventData = line.slice(6).trim();
            if (eventData.includes('sessionId=')) {
              sessionId = eventData.split('sessionId=')[1].split('&')[0];
              clearTimeout(timeout);
              resolve(sessionId);
              req.destroy();
              return;
            }
          }
        }
      });
      
      res.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
    
    req.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

/**
 * 等待 SSE 响应
 */
function waitForSSEResponse(sseResponses, requestId, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      if (sseResponses[requestId]) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for response ${requestId}`));
      } else {
        setTimeout(check, 50);
      }
    };
    
    check();
  });
}

/**
 * 清理进程
 */
async function cleanupProcess(electronProcess, sessionId, sseReq) {
  if (sseReq) sseReq.destroy();
  
  if (electronProcess) {
    try {
      process.kill(-electronProcess.pid, 'SIGKILL');
    } catch (e) {
      try {
        electronProcess.kill('SIGTERM');
      } catch (e) {}
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 清理所有测试端口
  const testPorts = [8102, 8103, 8104, 8105, 8106, 8107, 8108, 8109];
  for (const port of testPorts) {
    try {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`);
    } catch (e) {}
  }
}

module.exports = {
  cleanupPort,
  startMCPServer,
  establishSSEConnection,
  waitForSSEResponse,
  cleanupProcess
};