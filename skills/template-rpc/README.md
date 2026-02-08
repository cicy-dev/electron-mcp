# RPC Skill Template

快速创建基于 RPC 的 Electron MCP Skill。

## 🚀 快速开始

### 1. 复制模板
```bash
cp -r skills/template-rpc skills/your-skill-name
cd skills/your-skill-name
```

### 2. 修改配置
编辑 `config.js`：
```javascript
module.exports = {
  mcpPort: 8101,
  mcpHost: 'localhost',
  // 添加你的配置
};
```

### 3. 实现工具
编辑 `tools/your-tools.js`：
```javascript
const RPCClient = require('../rpc-client');

class YourTools {
  constructor(port = 8101, host = 'localhost') {
    this.client = new RPCClient(port, host);
  }

  async yourMethod() {
    return await this.client.callTool('tool_name', { args });
  }
}

module.exports = YourTools;
```

### 4. 编写测试
编辑 `tests/your-skill.test.js`：
```javascript
const YourTools = require('../tools/your-tools');

describe('Your Skill', () => {
  let tools;

  beforeAll(() => {
    tools = new YourTools();
  });

  test('should work', async () => {
    const result = await tools.yourMethod();
    expect(result).toBeTruthy();
  });
});
```

### 5. 运行测试
```bash
npm test
```

## 📋 可用的 RPC 工具

查看所有可用工具：
```bash
curl -s http://localhost:8101/rpc/tools \
  -H "Authorization: Bearer $(cat ~/electron-mcp-token.txt)" \
  | jq '.tools[] | .name'
```

## 🔧 RPC 调用示例

```javascript
// 打开窗口
await client.callTool('open_window', {
  url: 'https://example.com',
  accountIdx: 0
});

// 执行 JavaScript
await client.callTool('exec_js', {
  win_id: windowId,
  code: 'document.title'
});

// CDP 点击
await client.callTool('cdp_click', {
  win_id: windowId,
  x: 100,
  y: 100
});
```

## 📦 依赖

```bash
npm install axios jest
```

## 🎯 最佳实践

1. 使用 RPC 客户端封装工具调用
2. 编写完整的测试覆盖
3. 添加错误处理
4. 使用配置文件管理参数
5. 保持代码简洁

---

**参考示例：** `skills/aistudio/`
