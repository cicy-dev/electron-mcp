const request = require('supertest');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('Simple CDP Test', () => {
  test('server should start without errors', async () => {
    const serverProcess = spawn('node', ['start-mcp.js', '--port=8199'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, NODE_ENV: 'test', TEST: 'true' },
      stdio: 'pipe'
    });

    let serverStarted = false;
    
    const startupPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 10000);

      serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('Server output:', output);
        if (output.includes('MCP HTTP Server running')) {
          clearTimeout(timeout);
          serverStarted = true;
          resolve();
        }
      });

      serverProcess.stderr.on('data', (data) => {
        console.error('Server error:', data.toString());
      });
    });

    try {
      await startupPromise;
      expect(serverStarted).toBe(true);
    } finally {
      serverProcess.kill();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });
});
