const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { killPort, isPortOpen } = require("../../src/utils/process-utils");

const PORT = 8202;
const initUrl = "http://www.google.com";

let electronProcess;
let authToken;

async function startTestServer() {
  const isOpen = await isPortOpen(PORT);
  if (isOpen) {
    await killPort(PORT);
  }

  // Fix chrome-sandbox permissions on Linux
  if (process.platform === "linux") {
    const sandboxPath = path.join(__dirname, "../../node_modules/electron/dist/chrome-sandbox");
    if (fs.existsSync(sandboxPath)) {
      try {
        fs.chmodSync(sandboxPath, 0o4755);
      } catch (err) {
        // Ignore permission errors
      }
    }
  }

  process.env.NODE_ENV = "test";

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const electronArgs = [".", `--port=${PORT}`, `--url=${initUrl}`];

  electronProcess = spawn("electron", electronArgs, {
    stdio: "pipe",
    detached: false,
    env: { ...process.env, TEST: "TRUE" },
  });

  electronProcess.stdout.on("data", (data) => {
    const output = data.toString();
    process.stdout.write(`[RPC-${PORT}] ${output}`);
  });

  electronProcess.stderr.on("data", (data) => {
    const output = data.toString();
    process.stderr.write(`[RPC-${PORT}-ERR] ${output}`);
  });

  let serverStarted = false;
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("RPC 服务器启动超时")), 20000);

    const checkOutput = (data) => {
      if (!serverStarted && data.toString().includes("Server listening on")) {
        serverStarted = true;
        clearTimeout(timeout);
        resolve();
      }
    };

    electronProcess.stdout.on("data", checkOutput);
    electronProcess.stderr.on("data", checkOutput);
  });

  await new Promise((resolve) => setTimeout(resolve, 3000));

  const tokenPath = path.join(os.homedir(), "electron-mcp-token.txt");
  if (fs.existsSync(tokenPath)) {
    authToken = fs.readFileSync(tokenPath, "utf8").trim();
  }
}

async function stopTestServer() {
  if (electronProcess) {
    electronProcess.kill("SIGTERM");
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

function getAuthToken() {
  return authToken;
}

function getPort() {
  return PORT;
}

module.exports = {
  startTestServer,
  stopTestServer,
  getAuthToken,
  getPort,
};
