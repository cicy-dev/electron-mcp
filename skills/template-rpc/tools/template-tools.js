const RPCClient = require('../rpc-client');
const config = require('../config');

class TemplateTools {
  constructor(port = config.mcpPort, host = config.mcpHost) {
    this.client = new RPCClient(port, host);
  }

  async ping() {
    return await this.client.callTool('ping');
  }

  async getWindows() {
    const result = await this.client.callTool('get_windows');
    return JSON.parse(result.content[0].text);
  }

  async openWindow(url, accountIdx = 0) {
    const result = await this.client.callTool('open_window', { url, accountIdx });
    const match = result.content[0].text.match(/ID:\s*(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  async closeWindow(winId) {
    return await this.client.callTool('close_window', { win_id: winId });
  }

  async execJS(winId, code) {
    const result = await this.client.callTool('exec_js', { win_id: winId, code });
    return result.content[0].text;
  }
}

module.exports = TemplateTools;
