const { callRPC } = require('./rpc-utils');

describe('RPC Basic Tools', () => {
  jest.setTimeout(30000);
  
  test('should ping', async () => {
    const result = await callRPC('ping');
    expect(result.content[0].text).toBe('Pong');
  });

  test('should get windows', async () => {
    const result = await callRPC('get_windows');
    const windows = JSON.parse(result.content[0].text);
    expect(Array.isArray(windows)).toBe(true);
  });
});
