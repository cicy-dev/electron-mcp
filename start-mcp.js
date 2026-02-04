#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const net = require('net');

const PORT = process.argv.find(arg => arg.startsWith('--port='))?.split('=')[1] || 8101;

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
    const electronProcess = spawn('npx', ['electron', '.', `--port=${PORT}`], {
        cwd: __dirname,
        stdio: process.env.NODE_ENV === 'test' ? 'pipe' : 'ignore',
        detached: true
    });

    if (process.env.NODE_ENV === 'test') {
        electronProcess.stdout.on('data', (data) => {
            process.stdout.write(data);
        });
        electronProcess.stderr.on('data', (data) => {
            process.stderr.write(data);
        });
    } else {
        electronProcess.unref();
        console.log(`MCP Server started with PID: ${electronProcess.pid}`);
        process.exit(0);
    }

    process.on('SIGINT', () => electronProcess.kill('SIGINT'));
}

startServer();
