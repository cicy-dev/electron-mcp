// 基础单元测试 - 不需要服务运行
const path = require('path');
const fs = require('fs');

describe('Basic Unit Tests', () => {
  test('package.json should exist', () => {
    const packagePath = path.join(__dirname, '../package.json');
    expect(fs.existsSync(packagePath)).toBe(true);
  });

  test('package.json should have correct name', () => {
    const packagePath = path.join(__dirname, '../package.json');
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    expect(pkg.name).toBe('electron-mcp');
  });

  test('main entry point should exist', () => {
    const mainPath = path.join(__dirname, '../src/main.js');
    expect(fs.existsSync(mainPath)).toBe(true);
  });

  test('postinstall script should exist', () => {
    const scriptPath = path.join(__dirname, '../scripts/fix-sandbox.js');
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  test('axios dependency should be installed', () => {
    const packagePath = path.join(__dirname, '../package.json');
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    expect(pkg.dependencies.axios).toBeDefined();
  });
});
