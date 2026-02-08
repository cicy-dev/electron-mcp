module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  testPathIgnorePatterns: [
    '/node_modules/',
    // RPC tests require manual server start (see tests/rpc/README.md)
    '/tests/rpc/',
    // Skill tests require manual server start
    '/skill/'
  ],
  forceExit: true,
  testTimeout: 30000
};
