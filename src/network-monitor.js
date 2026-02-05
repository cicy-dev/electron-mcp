const fs = require('fs');
const path = require('path');
const os = require('os');

// 网络监听相关变量
const requestMap = new Map();
const saveDir = path.join(os.homedir(), 'data', 'captured_data');

// 代码美化函数
function prettifyCode(content, type) {
  try {
    if (type === 'json') {
      return JSON.stringify(JSON.parse(content), null, 2);
    }
    // 对于其他类型，暂时返回原内容
    return content;
  } catch (e) {
    return content;
  }
}

/**
 * 网络监听器类
 * 负责监听和保存网络请求响应
 */
class NetworkMonitor {
  constructor() {
    this.requestMap = requestMap;
    this.saveDir = saveDir;
  }

  /**
   * 初始化窗口的网络监听
   * @param {BrowserWindow} win - Electron 窗口实例
   */
  setupNetworkMonitoring(win) {
    if (!win.webContents.debugger.isAttached()) {
      try {
        win.webContents.debugger.attach('1.3');
        win.webContents.debugger.sendCommand('Network.enable');
      } catch (err) {
        console.error('Failed to attach debugger:', err);
      }
    }

    // 添加网络监听
    win.webContents.debugger.on('message', async (event, method, params) => {
      try {
        await this.handleNetworkEvent(method, params, win);
      } catch (error) {
        console.error('Network monitoring error:', error);
      }
    });
  }

  /**
   * 处理网络事件
   * @param {string} method - CDP 方法名
   * @param {Object} params - 事件参数
   * @param {BrowserWindow} win - 窗口实例
   */
  async handleNetworkEvent(method, params, win) {
    switch (method) {
      case 'Network.requestWillBeSent':
        this.handleRequestWillBeSent(params);
        break;
      case 'Network.responseReceived':
        this.handleResponseReceived(params);
        break;
      case 'Network.loadingFinished':
        await this.handleLoadingFinished(params, win);
        break;
    }
  }

  /**
   * 处理请求发送事件
   * @param {Object} params - 事件参数
   */
  handleRequestWillBeSent(params) {
    this.requestMap.set(params.requestId, {
      url: params.request.url,
      method: params.request.method
    });
  }

  /**
   * 处理响应接收事件
   * @param {Object} params - 事件参数
   */
  handleResponseReceived(params) {
    const info = this.requestMap.get(params.requestId);
    if (info) {
      info.mimeType = params.response.mimeType;
      this.requestMap.set(params.requestId, info);
    }
  }

  /**
   * 处理加载完成事件
   * @param {Object} params - 事件参数
   * @param {BrowserWindow} win - 窗口实例
   */
  async handleLoadingFinished(params, win) {
    const info = this.requestMap.get(params.requestId);
    if (!info) return;

    try {
      const result = await win.webContents.debugger.sendCommand('Network.getResponseBody', {
        requestId: params.requestId
      });

      await this.saveResponse(result, info);
      win.webContents.session.flushStorageData();
    } catch (error) {
      // 忽略获取响应体失败的情况
    }
  }

  /**
   * 保存响应内容到文件
   * @param {Object} result - CDP 响应结果
   * @param {Object} info - 请求信息
   */
  async saveResponse(result, info) {
    let content = result.body;
    const mimeType = info.mimeType || '';
    const fullUrl = info.url;
    const urlObj = new URL(fullUrl);
    const domain = urlObj.hostname;
    const pathname = urlObj.pathname;
    let fileName = pathname === '/' ? 'index.html' : path.basename(pathname);
    if (!fileName) fileName = 'index.html';

    const domainDir = path.join(this.saveDir, domain);
    const { typeFolder, processedContent } = this.categorizeAndProcessContent(content, mimeType, fileName, result.base64Encoded);

    const targetDir = path.join(domainDir, typeFolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, fileName);
    fs.writeFileSync(
      filePath,
      result.base64Encoded ? result.body : processedContent,
      result.base64Encoded ? 'base64' : 'utf8'
    );
  }

  /**
   * 分类和处理内容
   * @param {string} content - 原始内容
   * @param {string} mimeType - MIME 类型
   * @param {string} fileName - 文件名
   * @param {boolean} isBase64 - 是否为 base64 编码
   * @returns {Object} 包含类型文件夹和处理后内容的对象
   */
  categorizeAndProcessContent(content, mimeType, fileName, isBase64) {
    let typeFolder = 'others';
    let processedContent = content;
    const fileExt = path.extname(fileName).toLowerCase();

    if (mimeType.includes('text/html')) {
      typeFolder = 'html';
      if (!isBase64) processedContent = prettifyCode(content, 'html');
    } else if (mimeType.includes('json') || fileExt === '.json') {
      typeFolder = 'json';
      if (!isBase64) processedContent = prettifyCode(content, 'json');
    } else if (fileExt.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/) || mimeType.includes('image/')) {
      typeFolder = 'images';
    } else if (mimeType.includes('javascript') || fileExt === '.js') {
      typeFolder = 'js';
      if (!isBase64) processedContent = prettifyCode(content, 'js');
    } else if (mimeType.includes('css') || fileExt === '.css') {
      typeFolder = 'css';
      if (!isBase64) processedContent = prettifyCode(content, 'css');
    }

    return { typeFolder, processedContent };
  }
}

module.exports = { NetworkMonitor };