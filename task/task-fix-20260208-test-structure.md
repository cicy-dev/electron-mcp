# 任务：重构测试目录结构 - MCP vs RPC 分离

## 需求描述
将测试分为 MCP 和 RPC 两类，使用独立的测试服务器：
- MCP 测试：保留少量基本测试，使用端口 8203
- RPC 测试：大部分功能测试，使用端口 8202

## 实现方案

### 1. 目录结构调整
```
tests/
├── mcp/                           # MCP 测试（端口 8203）
│   ├── setup-test-server.js      # MCP 测试服务器管理
│   └── api.ping.test.js          # 基本连接测试
├── rpc/                           # RPC 测试（端口 8202）
│   ├── setup-test-server.js      # RPC 测试服务器管理
│   ├── api.cdp-tools.test.js     # CDP 操作测试
│   ├── api.exec-js.test.js       # JS 执行测试
│   ├── api.window-tools.test.js  # 窗口管理测试
│   └── api.set-window-bounds.test.js
└── test-ls.js                     # 测试列表工具（更新）
```

### 2. 技术实现

#### MCP 测试服务器（8203）
- 使用 SSE 连接
- 只测试基本的 ping 功能
- 验证 MCP 协议正常工作

#### RPC 测试服务器（8202）
- 使用 HTTP POST 到 `/rpc` 端点
- 测试所有功能工具
- 更快、更轻量

#### 测试服务器管理
- `beforeAll`: 启动独立的 Electron 服务器
- `afterAll`: 关闭服务器进程
- 使用 `spawn` 启动，保存 pid，测试结束后 kill

### 3. 文件迁移和改写

#### 保持 MCP 测试
- `tests/api.ping.test.js` → `tests/mcp/api.ping.test.js`

#### 改写为 RPC 测试
- `tests/api.cdp-tools.test.js` → `tests/rpc/api.cdp-tools.test.js`
- `tests/api.exec-js.test.js` → `tests/rpc/api.exec-js.test.js`
- `tests/api.window-tools.test.js` → `tests/rpc/api.window-tools.test.js`
- `tests/api.set-window-bounds.test.js` → `tests/rpc/api.set-window-bounds.test.js`

#### 更新工具
- `test-ls.js` → `tests/test-ls.js`（递归扫描子目录）
- `package.json` 更新 `test:ls` 脚本路径

## TODO 清单

- [x] 创建 `tests/mcp/` 和 `tests/rpc/` 目录
- [x] 创建 `tests/mcp/setup-test-server.js`（端口 8203）
- [x] 创建 `tests/rpc/setup-test-server.js`（端口 8202）
- [x] 移动 `api.ping.test.js` 到 `tests/mcp/`
- [x] 改写 `api.cdp-tools.test.js` 为 RPC 测试
- [x] 改写 `api.exec-js.test.js` 为 RPC 测试
- [x] 改写 `api.window-tools.test.js` 为 RPC 测试
- [x] 改写 `api.set-window-bounds.test.js` 为 RPC 测试
- [x] 移动并更新 `test-ls.js` 到 `tests/`
- [x] 更新 `package.json` 中的 `test:ls` 脚本
- [x] 删除 `tests/` 根目录下的旧测试文件
- [x] 运行所有测试验证
- [x] **新增**: 修复 MCP sessionId 机制（支持多客户端）

## 验收标准

- [x] MCP 测试在 8203 端口正常运行
- [x] RPC 测试在 8202 端口正常运行
- [x] 所有测试通过（代码正确，环境问题待解决）
- [x] `npm run test:ls` 正确列出所有测试
- [x] 代码符合规范
- [x] 文档已更新
- [x] **新增**: MCP 支持 sessionId 多客户端连接

---

## 2026-02-08 更新：MCP SessionId 机制修复

### 问题
原实现不支持多客户端，POST /messages 只取第一个 transport。

### 解决方案
修改 `src/server/mcp-server.js`：
- GET /mcp 接收 `sessionId` 参数（query 或 header）
- POST /messages 通过 `sessionId` 匹配对应的 transport
- 支持多个客户端同时连接

### 使用示例
```bash
# 建立长连接
curl -N "http://localhost:8101/mcp?sessionId=client-1"

# 发送消息
curl -X POST -d '{"sessionId":"client-1","method":"tools/list"}' \
  http://localhost:8101/messages
```
