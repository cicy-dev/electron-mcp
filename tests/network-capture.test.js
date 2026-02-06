const { setPort, setupTest, teardownTest, sendRequest } = require('./test-utils');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('网络捕获测试', () => {
  const captureDir = path.join(os.homedir(), 'Desktop', 'CaptureDataTest');
  let winId = null;

  beforeAll(async () => {
    setPort(9849);
    await setupTest();
    
    // 删除捕获数据目录
    if (fs.existsSync(captureDir)) {
      fs.rmSync(captureDir, { recursive: true, force: true });
    }
  }, 30000);

  afterAll(async () => {
    await teardownTest();
  });

  describe('网络捕获功能', () => {
    test('应该打开窗口并等待 dom-ready', async () => {
      const response = await sendRequest('tools/call', {
        name: 'open_window',
        arguments: { url: 'https://www.google.com' }
      });
      
      expect(response.result).toBeDefined();
      const text = response.result.content[0].text;
      const match = text.match(/ID[:\s]+(\d+)/i);
      expect(match).toBeTruthy();
      winId = parseInt(match[1]);
      
      // 等待初始加载
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 重新加载页面以触发网络捕获
      await sendRequest('tools/call', {
        name: 'load_url',
        arguments: { win_id: winId, url: 'https://www.google.com' }
      });
      
      // 等待网络捕获完成
      await new Promise(resolve => setTimeout(resolve, 8000));
    }, 25000);

    test('应该检查捕获目录是否创建', async () => {
      expect(fs.existsSync(captureDir)).toBe(true);
    }, 5000);

    test('应该检查捕获文件是否创建', async () => {
      const files = fs.readdirSync(captureDir);
      expect(files.length).toBeGreaterThan(0);
      
      // 应该有 win-1 目录
      expect(files).toContain('win-1');
      
      // 检查 win-1 下的域名目录
      const winDir = path.join(captureDir, 'win-1');
      const domains = fs.readdirSync(winDir);
      expect(domains.some(d => d.includes('google'))).toBe(true);
    }, 5000);

    test('应该读取捕获的网络数据', async () => {
      const winDir = path.join(captureDir, 'win-1');
      const domains = fs.readdirSync(winDir);
      const googleDomain = domains.find(d => d.includes('google'));
      
      expect(googleDomain).toBeDefined();
      
      const domainDir = path.join(winDir, googleDomain);
      const types = fs.readdirSync(domainDir);
      
      console.log('\nGoogle domain:', googleDomain);
      console.log('File types:', types);
      
      // 应该有文件
      expect(types.length).toBeGreaterThan(0);
    }, 5000);

    test('应该通过 get_requests 获取请求列表', async () => {
      const response = await sendRequest('tools/call', {
        name: 'get_requests',
        arguments: { win_id: winId }
      });
      
      expect(response.result).toBeDefined();
      const text = response.result.content[0].text;
      const data = JSON.parse(text);
      
      console.log('\n========== GET_REQUESTS ==========');
      console.log('Total:', data.total, 'requests');
      console.log('\nFirst 10 requests:');
      data.data.slice(0, 10).forEach(req => {
        console.log(`[${req.index}] ${req.type} | ${req.mimeType || 'no-mime'} | ${req.url.substring(0, 50)}`);
      });
      
      // 保存不同类型的请求 index
      global.requestIndexes = {
        html: null,
        css: null,
        js: null,
        json: null,
        image: null
      };
      
      data.data.forEach(req => {
        const url = req.url.toLowerCase();
        if (!global.requestIndexes.html && url.includes('google.com') && !url.includes('api') && !url.includes('static')) {
          global.requestIndexes.html = req.index;
        }
        if (!global.requestIndexes.css && url.endsWith('.css')) {
          global.requestIndexes.css = req.index;
        }
        if (!global.requestIndexes.js && url.endsWith('.js')) {
          global.requestIndexes.js = req.index;
        }
        if (!global.requestIndexes.json && url.includes('json')) {
          global.requestIndexes.json = req.index;
        }
        if (!global.requestIndexes.image && (url.includes('image') || url.match(/\.(png|jpg|svg|webp|ico)$/))) {
          global.requestIndexes.image = req.index;
        }
      });
      
      console.log('Found types:', global.requestIndexes);
      console.log('==================================\n');
      
      expect(data.total).toBeGreaterThan(0);
    }, 5000);

    test('应该通过 filter_requests 过滤请求', async () => {
      // 测试关键词过滤
      const response1 = await sendRequest('tools/call', {
        name: 'filter_requests',
        arguments: { 
          win_id: winId,
          keyword: 'google'
        }
      });
      
      const data1 = JSON.parse(response1.result.content[0].text);
      console.log('\n========== FILTER by keyword ==========');
      console.log('Keyword:', data1.filters.keyword);
      console.log('Matched:', data1.total, 'requests');
      
      expect(data1.total).toBeGreaterThan(0);
      
      // 测试文档类型过滤
      const response2 = await sendRequest('tools/call', {
        name: 'filter_requests',
        arguments: { 
          win_id: winId,
          doc_type: 'javascript'
        }
      });
      
      const data2 = JSON.parse(response2.result.content[0].text);
      console.log('\n========== FILTER by doc_type ==========');
      console.log('Doc type:', data2.filters.doc_type);
      console.log('Matched:', data2.total, 'requests');
      
      // 测试组合过滤
      const response3 = await sendRequest('tools/call', {
        name: 'filter_requests',
        arguments: { 
          win_id: winId,
          keyword: 'google',
          doc_type: 'json'
        }
      });
      
      const data3 = JSON.parse(response3.result.content[0].text);
      console.log('\n========== FILTER by keyword + doc_type ==========');
      console.log('Filters:', data3.filters);
      console.log('Matched:', data3.total, 'requests');
      console.log('==========================================\n');
      
      expect(data1.total).toBeGreaterThan(0);
    }, 10000);

    test('应该获取 HTML 请求详情', async () => {
      if (!global.requestIndexes.html) {
        console.log('Skipping: No HTML request found');
        return;
      }
      
      const response = await sendRequest('tools/call', {
        name: 'get_request_detail',
        arguments: { win_id: winId, index: global.requestIndexes.html }
      });
      
      const detail = JSON.parse(response.result.content[0].text);
      console.log('\n[HTML] Index:', detail.index, '| Status:', detail.status, '| Size:', detail.responseBodySize);
      console.log('MimeType:', detail.mimeType);
      console.log('Has responseBodyFile:', !!detail.responseBodyFile);
      
      expect(detail.status).toBeDefined();
      expect(detail.responseBodySize).toBeGreaterThan(0);
    }, 5000);

    test('应该获取 CSS 请求详情', async () => {
      if (!global.requestIndexes.css) {
        console.log('Skipping: No CSS request found');
        return;
      }
      
      const response = await sendRequest('tools/call', {
        name: 'get_request_detail',
        arguments: { win_id: winId, index: global.requestIndexes.css }
      });
      
      const detail = JSON.parse(response.result.content[0].text);
      console.log('\n[CSS] Index:', detail.index, '| Status:', detail.status, '| Size:', detail.responseBodySize);
      
      expect(detail.mimeType).toContain('css');
      expect(detail.responseBodyFile).toBeDefined();
    }, 5000);

    test('应该获取 JS 请求详情', async () => {
      if (!global.requestIndexes.js) {
        console.log('Skipping: No JS request found');
        return;
      }
      
      const response = await sendRequest('tools/call', {
        name: 'get_request_detail',
        arguments: { win_id: winId, index: global.requestIndexes.js }
      });
      
      const detail = JSON.parse(response.result.content[0].text);
      console.log('\n[JS] Index:', detail.index, '| Status:', detail.status, '| Size:', detail.responseBodySize);
      
      expect(detail.mimeType).toContain('javascript');
      expect(detail.responseBodyFile).toBeDefined();
    }, 5000);

    test('应该获取 JSON API 请求详情', async () => {
      if (!global.requestIndexes.json) {
        console.log('Skipping: No JSON request found');
        return;
      }
      
      const response = await sendRequest('tools/call', {
        name: 'get_request_detail',
        arguments: { win_id: winId, index: global.requestIndexes.json }
      });
      
      const detail = JSON.parse(response.result.content[0].text);
      console.log('\n[JSON] Index:', detail.index, '| Status:', detail.status, '| Size:', detail.responseBodySize);
      console.log('URL:', detail.url.substring(0, 80));
      console.log('Has responseBodyFile:', !!detail.responseBodyFile);
      console.log('Has responseBodyPath:', !!detail.responseBodyPath);
      
      expect(detail.url).toContain('google');
      expect(detail.status).toBeDefined();
    }, 5000);

    test('应该获取 Image 请求详情', async () => {
      if (!global.requestIndexes.image) {
        console.log('Skipping: No Image request found');
        return;
      }
      
      const response = await sendRequest('tools/call', {
        name: 'get_request_detail',
        arguments: { win_id: winId, index: global.requestIndexes.image }
      });
      
      const detail = JSON.parse(response.result.content[0].text);
      console.log('\n[Image] Index:', detail.index, '| Status:', detail.status, '| Size:', detail.responseBodySize);
      console.log('Base64:', detail.base64Encoded);
      console.log('Has responseBodyFile:', !!detail.responseBodyFile);
      
      expect(detail.status).toBeDefined();
      expect(detail.responseBodySize).toBeGreaterThan(0);
    }, 5000);

    test('应该关闭窗口', async () => {
      const response = await sendRequest('tools/call', {
        name: 'close_window',
        arguments: { win_id: winId }
      });
      
      expect(response.result).toBeDefined();
    }, 10000);

    test('应该通过 session_download_url 下载文件', async () => {
      // 重新打开窗口用于下载测试
      const openResponse = await sendRequest('tools/call', {
        name: 'open_window',
        arguments: { url: 'https://www.google.com' }
      });
      const text = openResponse.result.content[0].text;
      const match = text.match(/ID[:\s]+(\d+)/i);
      const testWinId = parseInt(match[1]);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const os = require('os');
      const downloadPath = path.join(os.tmpdir(), 'test-download.png');
      
      // 删除已存在的文件
      if (fs.existsSync(downloadPath)) {
        fs.unlinkSync(downloadPath);
      }
      
      const response = await sendRequest('tools/call', {
        name: 'session_download_url',
        arguments: {
          win_id: testWinId,
          url: 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png',
          save_path: downloadPath,
          timeout: 30000
        }
      });
      
      expect(response.result).toBeDefined();
      const result = JSON.parse(response.result.content[0].text);
      
      console.log('\n========== SESSION_DOWNLOAD_URL ==========');
      console.log('Status:', result.status);
      console.log('Path:', result.path);
      console.log('Size:', result.size, 'bytes');
      console.log('MIME:', result.mime);
      console.log('==========================================\n');
      
      expect(result.status).toBe('completed');
      expect(fs.existsSync(downloadPath)).toBe(true);
      
      // 清理
      fs.unlinkSync(downloadPath);
      
      // 关闭测试窗口
      await sendRequest('tools/call', {
        name: 'close_window',
        arguments: { win_id: testWinId }
      });
    }, 40000);
  });
});
