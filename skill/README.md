# Electron MCP Skills

基于 RPC 的 Electron MCP 技能集合。

## 🚀 快速创建新 Skill

```bash
bash skill/create-skill.sh my-skill
cd skill/my-skill
npm test
```

## 📦 现有 Skills

### aistudio
AI Studio 自动化工具
- 打开/关闭 AI Studio
- 多账户支持
- 窗口管理

### template-rpc
RPC Skill 模板
- 完整的项目结构
- 测试示例
- 使用文档

## 🔧 开发新 Skill

### 1. 使用模板创建
```bash
bash skill/create-skill.sh your-skill-name
```

### 2. 实现功能
编辑 `tools/template-tools.js`：
```javascript
async yourMethod() {
  return await this.client.callTool('tool_name', { args });
}
```

### 3. 编写测试
编辑 `tests/template.test.js`：
```javascript
test('should work', async () => {
  const result = await tools.yourMethod();
  expect(result).toBeTruthy();
});
```

### 4. 运行测试
```bash
npm test
```

## 📋 可用的 RPC 工具

查看所有 36 个可用工具：
```bash
curl -s http://localhost:8101/rpc/tools \
  -H "Authorization: Bearer $(cat ~/electron-mcp-token.txt)" \
  | jq '.tools[] | .name'
```

主要工具分类：
- **窗口管理**: open_window, close_window, get_windows
- **CDP 操作**: cdp_click, cdp_type_text, cdp_scroll
- **JavaScript**: exec_js, inject_auto_run_when_dom_ready_js
- **网络**: get_requests, filter_requests, session_download_url
- **截图**: webpage_screenshot_and_to_clipboard, webpage_snapshot

## 🎯 最佳实践

1. **使用 RPC 客户端** - 统一的工具调用接口
2. **完整测试覆盖** - 确保功能稳定
3. **错误处理** - 优雅处理异常
4. **配置管理** - 使用 config.js
5. **文档完善** - README + 代码注释

## 📚 示例

### 基础使用
```javascript
const MySkill = require('./skill/my-skill');
const skill = new MySkill();

// 打开窗口
const winId = await skill.openWindow('https://example.com');

// 执行 JS
const title = await skill.execJS(winId, 'document.title');

// 关闭窗口
await skill.closeWindow(winId);
```

### 高级用法
```javascript
// CDP 自动化
await skill.client.callTool('cdp_click', { win_id: winId, x: 100, y: 100 });
await skill.client.callTool('cdp_type_text', { win_id: winId, text: 'Hello' });

// 网络监控
const requests = await skill.client.callTool('get_requests', { win_id: winId });

// 截图
await skill.client.callTool('webpage_screenshot_and_to_clipboard', { win_id: winId });
```

## 🛠️ 服务管理

### 启动服务
```bash
bash /home/w3c_offical/mcp-service.sh start
```

### 查看状态
```bash
bash /home/w3c_offical/mcp-service.sh status
```

### 查看日志
```bash
bash /home/w3c_offical/mcp-service.sh logs
```

## 📖 参考文档

- [RPC API 文档](../../tests/rpc/README.md)
- [AI Studio Skill](./aistudio/README.md)
- [模板文档](./template-rpc/README.md)

---

**快速开始，立即创建你的第一个 Skill！** 🚀
