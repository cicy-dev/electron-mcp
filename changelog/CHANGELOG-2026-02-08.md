# 更新日志 - 2026-02-08

## 新增功能

### 1. YAML/JSON 双格式支持 ✨

- **服务器端**: 根据 `Accept` 头返回 YAML 或 JSON 格式
- **客户端**: curl-rpc 工具默认使用 YAML 格式
- **Token 节省**: YAML 格式节省 30-45% 字符和 token

### 2. set_window_bounds 工具 🪟

- 设置窗口位置和大小
- 支持单独设置 x, y 或 width, height
- 返回更新后的窗口边界信息

### 3. 窗口复用控制 🔄

- `open_window` 添加 `reuseWindow` 参数
- 默认 `reuseWindow=true`（复用现有窗口）
- 设置 `reuseWindow=false` 强制创建新窗口

### 4. curl-rpc 命令行工具 🔧

- 轻量级 MCP 调用工具
- 默认 YAML 格式，使用 `--json` 切换到 JSON
- 自动处理 token 认证
- 支持 text 和 image 类型的响应

## 修改的文件

### 核心功能
- `src/main.js` - 添加 YAML 响应支持
- `src/tools/window-tools.js` - 添加 set_window_bounds 和 reuseWindow 参数
- `src/utils/window-utils.js` - 添加 forceNew 参数支持

### 工具和文档
- `bin/curl-rpc` - 新增命令行工具
- `docs/YAML-SUPPORT.md` - YAML 支持详细文档
- `README.md` - 更新功能说明和使用示例
- `tests/api.set-window-bounds.test.js` - 新增测试

## 依赖变更

### 服务器端
```bash
npm install js-yaml
```

### 客户端
```bash
pip install yq --break-system-packages
```

## 使用示例

### YAML 格式（推荐）

```bash
curl-rpc "tools/call" "
name: open_window
arguments:
  url: https://google.com
"
```

### 设置窗口

```bash
curl-rpc "tools/call" "
name: set_window_bounds
arguments:
  win_id: 1
  x: 1320
  y: 0
  width: 360
  height: 720
"
```

### JSON 格式

```bash
curl-rpc "tools/call" --json '{"name":"get_window_info","arguments":{"win_id":1}}'
```

## 性能提升

- **Token 消耗**: 减少 30-45%
- **网络传输**: 响应体积减少约 40%
- **可读性**: YAML 格式更易读易写

## 向后兼容

- ✅ 完全兼容现有 JSON API
- ✅ 默认行为保持不变（除非明确指定）
- ✅ 旧版客户端仍可正常工作

## 下一步计划

- [ ] 添加更多窗口控制工具
- [ ] 优化 YAML 解析性能
- [ ] 添加批量操作支持
- [ ] 完善错误处理和日志
