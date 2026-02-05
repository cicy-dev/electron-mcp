#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.argv.find(arg => arg.startsWith('--port='))?.split('=')[1] || 8101;
const LOG_DIR = path.join(os.homedir(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'electron-mcp.log');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'electron-mcp-error.log');

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

function killPort(port) {
    return new Promise((resolve) => {
        exec(`lsof -ti:${port} | xargs kill -9`, () => resolve());
    });
}

function isPortOpen(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(port, () => {
            server.close(() => resolve(false));
        });
        server.on('error', () => resolve(true));
    });
}

async function startServer() {
    while (await isPortOpen(PORT)) {
        console.log(`Port ${PORT} is busy, killing processes...`);
        await killPort(PORT);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`Starting MCP Server on port ${PORT} in background...`);
    
    // 创建日志文件流
    const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
    const errorLogStream = fs.createWriteStream(ERROR_LOG_FILE, { flags: 'a' });
    const timestamp = new Date().toISOString();
    logStream.write(`\n=== MCP Server Started at ${timestamp} ===\n`);
    errorLogStream.write(`\n=== MCP Server Started at ${timestamp} ===\n`);
    
    const electronProcess = spawn('npx', ['electron', '.', `--port=${PORT}`], {
        cwd: __dirname,
        stdio: process.env.NODE_ENV === 'test' ? 'pipe' : ['ignore', 'pipe', 'pipe'],
        detached: true
    });

    // 记录启动错误
    electronProcess.on('error', (error) => {
        const errorMsg = `[SPAWN ERROR] ${error.message} at ${new Date().toISOString()}\n`;
        errorLogStream.write(errorMsg);
        console.error('Failed to start electron process:', error.message);
    });

    if (process.env.NODE_ENV === 'test') {
        electronProcess.stdout.on('data', (data) => {
            process.stdout.write(data);
        });
        electronProcess.stderr.on('data', (data) => {
            process.stderr.write(data);
        });
    } else {
        // 将输出重定向到日志文件
        electronProcess.stdout.on('data', (data) => {
            logStream.write(`[STDOUT] ${data}`);
        });
        electronProcess.stderr.on('data', (data) => {
            const errorData = `[STDERR] ${data}`;
            logStream.write(errorData);
            errorLogStream.write(errorData);
        });
        
        electronProcess.on('close', (code) => {
            const exitMsg = `[EXIT] Process exited with code ${code} at ${new Date().toISOString()}\n`;
            logStream.write(exitMsg);
            if (code !== 0) {
                errorLogStream.write(exitMsg);
            }
            logStream.end();
            errorLogStream.end();
        });
        
        electronProcess.unref();
        console.log(`MCP Server started with PID: ${electronProcess.pid}`);
        console.log(`Logs are being written to: ${LOG_FILE}`);
        console.log(`Error logs are being written to: ${ERROR_LOG_FILE}`);
        process.exit(0);
    }

    process.on('SIGINT', () => electronProcess.kill('SIGINT'));
}

startServer();
