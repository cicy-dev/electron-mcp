#!/usr/bin/env node
/**
 * Client script to call page_snapshot tool and save results locally
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8101;
const HOST = 'localhost';

// Create output directory
const outputDir = path.join(__dirname, 'snapshots');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function callPageSnapshot() {
  console.log('Connecting to MCP server...');
  
  // Step 1: Get session ID from SSE endpoint
  const sseRes = await new Promise((resolve, reject) => {
    const req = http.get(`http://${HOST}:${PORT}/message`, {
      headers: { 'Accept': 'text/event-stream' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
        const lines = data.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const endpoint = line.slice(6).trim();
            if (endpoint.includes('sessionId=')) {
              const sessionId = endpoint.split('sessionId=')[1];
              resolve({ endpoint, sessionId });
              req.destroy();
              return;
            }
          }
        }
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    setTimeout(() => reject(new Error('SSE timeout')), 5000);
  });

  console.log('Session ID:', sseRes.sessionId);

  // Step 2: Call page_snapshot tool
  const requestBody = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'page_snapshot',
      arguments: {
        win_id: 1,
        fullPage: true,
        detailLevel: 'shorten',
        includeScreenshot: true
      }
    }
  };

  console.log('Calling page_snapshot tool...');
  
  const result = await makeRequest({
    host: HOST,
    port: PORT,
    path: `/message?sessionId=${sseRes.sessionId}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }, requestBody);

  if (result.status !== 200) {
    console.error('Error:', result.body);
    process.exit(1);
  }

  const response = result.body;
  
  if (response.error) {
    console.error('Tool error:', response.error);
    process.exit(1);
  }

  const content = response.result?.content || [];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  let snapshotInfo = null;
  let screenshotSaved = false;

  // Save each content item
  for (const item of content) {
    if (item.type === 'text') {
      const infoPath = path.join(outputDir, `snapshot-info-${timestamp}.txt`);
      fs.writeFileSync(infoPath, item.text);
      console.log('Saved info to:', infoPath);
      snapshotInfo = item.text;
    } else if (item.type === 'image' && item.data) {
      const pngPath = path.join(outputDir, `snapshot-${timestamp}.png`);
      fs.writeFileSync(pngPath, Buffer.from(item.data, 'base64'));
      console.log('Saved screenshot to:', pngPath);
      screenshotSaved = true;
    }
  }

  // Save JSON metadata
  const meta = response.result?._meta || {};
  const metadata = {
    timestamp: new Date().toISOString(),
    ...meta,
    contentTypes: content.map(c => c.type)
  };
  const metaPath = path.join(outputDir, `snapshot-meta-${timestamp}.json`);
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
  console.log('Saved metadata to:', metaPath);

  console.log('\n✓ Snapshot captured successfully!');
  console.log('Screenshot saved:', screenshotSaved ? 'Yes' : 'No');
  if (snapshotInfo) {
    console.log('\nSnapshot preview:');
    console.log(snapshotInfo.slice(0, 500) + '...');
  }
}

callPageSnapshot().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
