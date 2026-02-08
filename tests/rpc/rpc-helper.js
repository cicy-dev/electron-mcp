const axios = require("axios");
const { getAuthToken, getPort } = require("./setup-test-server");

let requestId = 1;

async function callRPC(toolName, args = {}) {
  const authToken = getAuthToken();
  const port = getPort();

  const payload = {
    jsonrpc: "2.0",
    id: requestId++,
    method: "tools/call",
    params: {
      name: toolName,
      arguments: args,
    },
  };

  const response = await axios.post(`http://localhost:${port}/rpc`, payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
      Connection: "close",
    },
    timeout: 30000,
  });

  if (response.data.error) {
    throw new Error(response.data.error.message);
  }

  return response.data.result;
}

module.exports = {
  callRPC,
};
