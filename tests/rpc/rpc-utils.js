const axios = require('axios');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = process.env.RPC_PORT || 8101;
const BASE_URL = `http://localhost:${PORT}`;

const tokenPath = path.join(os.homedir(), 'electron-mcp-token.txt');
const authToken = fs.existsSync(tokenPath) ? fs.readFileSync(tokenPath, 'utf8').trim() : '';

let requestId = 1;

async function callRPC(toolName, args = {}) {
  const payload = {
    name: toolName,
    arguments: args,
  };

  const response = await axios.post(`${BASE_URL}/rpc/tools/call`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
      'Connection': 'close',
    },
    timeout: 30000,
  });

  if (response.data.error) {
    throw new Error(response.data.error);
  }

  return response.data.result;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { callRPC, sleep, BASE_URL, authToken };
