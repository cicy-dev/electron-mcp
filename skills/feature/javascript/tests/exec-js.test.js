const { startTestServer, stopTestServer } = require('./setup-test-server');
const { callRPC, sleep } = require('./rpc-utils');

describe('RPC Exec JS', () => {
  jest.setTimeout(30000);
  let winId;

  beforeAll(async () => {
    await startTestServer();
    const result = await callRPC('open_window', { url: 'https://google.com' });
    winId = parseInt(result.content[0].text.match(/\d+/)[0]);
    await sleep(2000);
  }, 30000);

  afterAll(async () => {
    await stopTestServer();
  });

  test('should inject JS code', async () => {
    const code = 'window.testValue = 123; console.log("injected");';
    const result = await callRPC('inject_auto_run_when_dom_ready_js', { win_id: winId, code });
    expect(result.content[0].text).toContain('注入成功');
  });

  test('should read injected code', async () => {
    const result = await callRPC('inject_auto_run_when_dom_ready_js_read', { win_id: winId });
    expect(result.content[0].text).toContain('window.testValue');
  });

  test('should auto-execute after reload', async () => {
    await callRPC('load_url', { win_id: winId, url: 'https://google.com' });
    await sleep(2000);
    const result = await callRPC('exec_js', { win_id: winId, code: 'window.testValue' });
    expect(result.content[0].text).toContain('123');
  });

  test('should execute JS code', async () => {
    const result = await callRPC('exec_js', { win_id: winId, code: 'document.title' });
    expect(result.content[0].text).toBeTruthy();
  });

  test('should get element bounds', async () => {
    const result = await callRPC('get_element_client_bound', { win_id: winId, selector: 'body' });
    const bounds = JSON.parse(result.content[0].text);
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.height).toBeGreaterThan(0);
  });
});
