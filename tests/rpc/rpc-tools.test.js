const { callRPC } = require('./rpc-utils');

describe('RPC Tools', () => {
  jest.setTimeout(30000);

  describe('ping', () => {
    test('should respond with pong', async () => {
      const result = await callRPC('ping');
      expect(result.content[0].text).toBe('Pong');
    });
  });

  describe('window management', () => {
    let winId;

    test('should open window', async () => {
      const result = await callRPC('open_window', { url: 'https://google.com' });
      expect(result.content[0].text).toContain('Opened window');
      winId = parseInt(result.content[0].text.match(/\d+/)[0]);
    });

    test('should get windows', async () => {
      const result = await callRPC('get_windows');
      expect(result.content[0].text).toContain(winId.toString());
    });

    test('should get window info', async () => {
      const result = await callRPC('get_window_info', { win_id: winId });
      expect(result.content[0].text).toBeTruthy();
    });
  });
});
