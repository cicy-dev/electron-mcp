#!/usr/bin/env node

const TemplateTools = require('./index');

async function main() {
  const tools = new TemplateTools();

  console.log('🚀 Testing Template Skill...\n');

  // 1. Ping
  console.log('1. Ping test...');
  const pingResult = await tools.ping();
  console.log('   ✅', pingResult.content[0].text);

  // 2. Get windows
  console.log('\n2. Get windows...');
  const windows = await tools.getWindows();
  console.log(`   ✅ Found ${windows.length} windows`);

  // 3. Open window
  console.log('\n3. Open window...');
  const winId = await tools.openWindow('https://example.com');
  console.log(`   ✅ Opened window ID: ${winId}`);

  // Wait for page load
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 4. Execute JavaScript
  console.log('\n4. Execute JavaScript...');
  const title = await tools.execJS(winId, 'document.title');
  console.log(`   ✅ Page title: ${title}`);

  // 5. Close window
  console.log('\n5. Close window...');
  await tools.closeWindow(winId);
  console.log('   ✅ Window closed');

  console.log('\n🎉 All tests passed!');
}

main().catch(console.error);
