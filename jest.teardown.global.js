const { stopTestServer } = require('./tests/mcp/setup-test-server');

module.exports = async () => {
  console.log('\n🛑 Stopping test server...\n');
  await stopTestServer();
  console.log('\n✅ Test server stopped\n');
};
