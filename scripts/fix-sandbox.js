#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Setting up Electron sandbox permissions...');

try {
  // 检查是否已全局安装 electron
  try {
    execSync('npm list -g electron', { stdio: 'pipe' });
    console.log('✅ Electron is already installed globally');
  } catch (err) {
    console.log('Installing Electron globally...');
    execSync('npm install -g electron', { stdio: 'inherit' });
    console.log('✅ Electron installed globally');
  }

  // 获取全局 electron 路径
  const globalElectronPath = execSync('npm root -g', { encoding: 'utf8' }).trim();
  const sandboxPath = path.join(globalElectronPath, 'electron/dist/chrome-sandbox');

  if (fs.existsSync(sandboxPath)) {
    console.log('Fixing global chrome-sandbox permissions...');
    try {
      execSync(`sudo chown root:root "${sandboxPath}"`, { stdio: 'inherit' });
      execSync(`sudo chmod 4755 "${sandboxPath}"`, { stdio: 'inherit' });
      console.log('✅ Global chrome-sandbox permissions fixed');
    } catch (err) {
      console.log('⚠️  Could not fix permissions with sudo');
      console.log('   Run manually: sudo chown root:root "' + sandboxPath + '"');
      console.log('   Run manually: sudo chmod 4755 "' + sandboxPath + '"');
    }
  } else {
    console.log('⚠️  Global chrome-sandbox not found at:', sandboxPath);
  }
} catch (error) {
  console.log('⚠️  Setup failed:', error.message);
  console.log('   Electron will use --no-sandbox flag as fallback');
}
