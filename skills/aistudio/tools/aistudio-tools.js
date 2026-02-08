const ElectronMCPClient = require('../index');
const config = require('../config');

/**
 * AI Studio 工具集
 */
class AIStudioTools {
  constructor(mcpPort, mcpHost) {
    this.client = new ElectronMCPClient(mcpPort, mcpHost);
    this.windowId = null;
  }

  /**
   * 打开 AI Studio 窗口
   * @param {number} accountIdx - 账户索引（可选）
   * @returns {Promise<number>} 窗口 ID
   */
  async openAIStudio(accountIdx = config.defaultAccountIdx) {
    console.log(`[AIStudio] Opening AI Studio with account ${accountIdx}...`);
    
    this.windowId = await this.client.openWindow(config.aistudioUrl, accountIdx);
    
    console.log(`[AIStudio] AI Studio opened, window ID: ${this.windowId}`);
    return this.windowId;
  }

  /**
   * 关闭 AI Studio 窗口
   * @returns {Promise<void>}
   */
  async closeAIStudio() {
    if (!this.windowId) {
      throw new Error('No AI Studio window is open');
    }

    console.log(`[AIStudio] Closing window ${this.windowId}...`);
    await this.client.closeWindow(this.windowId);
    
    this.windowId = null;
    console.log('[AIStudio] Window closed');
  }

  /**
   * 获取当前窗口 ID
   * @returns {number|null} 窗口 ID
   */
  getWindowId() {
    return this.windowId;
  }

  /**
   * 获取所有窗口
   * @returns {Promise<Array>} 窗口列表
   */
  async getWindows() {
    const result = await this.client.getWindows();
    const text = result.content[0].text;
    return JSON.parse(text);
  }
}

module.exports = AIStudioTools;
