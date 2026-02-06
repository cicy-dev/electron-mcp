# 任务：集成 Token 认证到 main.js

## 需求描述
将现有的 Token 认证模块 (`src/utils/auth.js`) 集成到 main.js，保护 MCP 端点 `/mcp` 和 `/messages`。

## 实现方案
1. 在 main.js 中引入 AuthManager
2. 创建 AuthManager 实例
3. 在 `/mcp` 和 `/messages` 端点添加认证中间件
4. 验证失败返回 401 Unauthorized
5. 移除 auth.js 中的环境变量覆盖功能

## TODO 清单
- [x] 修改 `src/utils/auth.js`，移除 `MCP_AUTH_TOKEN` 环境变量支持
- [x] 在 `src/main.js` 中引入 AuthManager
- [x] 创建认证中间件函数
- [x] 在 `/mcp` 端点添加认证
- [x] 在 `/messages` 端点添加认证
- [x] 测试认证功能（有效 token）
- [x] 测试认证功能（无效 token）
- [x] 测试认证功能（缺少 token）

## 验收标准
- [x] 无 token 访问返回 401
- [x] 错误 token 访问返回 401
- [x] 正确 token 访问正常工作
- [x] Token 保存在 `~/electron-mcp-token.txt`
- [x] 启动时显示 token 信息
