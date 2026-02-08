#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

const TOKEN = fs.readFileSync(path.join(require('os').homedir(), 'electron-mcp-token.txt'), 'utf8').trim();
const BASE_URL = 'http://localhost:8101';

async function callRPC(toolName, args) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(args);
    const options = {
      hostname: 'localhost',
      port: 8101,
      path: `/rpc/${toolName}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.content[0].text);
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendMessageToAIStudio(message) {
  console.log('🚀 Opening AI Studio...');
  const openResult = await callRPC('open_window', {
    url: 'https://aistudio.google.com',
    accountIdx: 0
  });
  
  const winId = parseInt(openResult.match(/ID:\s*(\d+)/)[1]);
  console.log(`✅ Window opened: ${winId}`);
  
  await sleep(10000);
  console.log('⏳ Waiting for page load...');
  
  console.log(`📝 Typing message: "${message}"`);
  await callRPC('cdp_type_text', {
    win_id: winId,
    selector: 'textarea',
    text: message
  });
  
  await sleep(1000);
  
  console.log('📤 Sending message...');
  await callRPC('cdp_press_enter', { win_id: winId });
  
  await sleep(15000);
  console.log('⏳ Waiting for response...');
  
  const pageText = await callRPC('exec_js', {
    win_id: winId,
    code: 'document.body.innerText'
  });
  
  console.log('\n📨 AI Studio Response:');
  console.log('='.repeat(50));
  
  const lines = pageText.split('\n').filter(l => l.trim().length > 0);
  const responseStart = lines.findIndex(l => l.includes(message));
  if (responseStart >= 0) {
    const response = lines.slice(responseStart + 1, responseStart + 20).join('\n');
    console.log(response.substring(0, 500));
  } else {
    console.log(lines.slice(-20).join('\n'));
  }
  
  console.log('='.repeat(50));
  
  return winId;
}

sendMessageToAIStudio('hello world').catch(console.error);
