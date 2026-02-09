# Electron MCP Service

浏览器自动化服务，提供窗口管理、CDP 操作、JavaScript 执行等功能。

## 使用方法

```bash
# 启动服务
bash skills/electron-mcp-service/service.sh start

# 验证服务
curl-rpc "name: ping"

# 使用工具
curl-rpc "
name: open_window
arguments:
  url: https://google.com
"
```

## 服务管理

```bash
bash skills/electron-mcp-service/service.sh start    # 启动
bash skills/electron-mcp-service/service.sh stop     # 停止
bash skills/electron-mcp-service/service.sh status   # 状态
bash skills/electron-mcp-service/service.sh logs     # 日志
bash skills/electron-mcp-service/service.sh restart  # 重启
```

## 可用工具

### 窗口管理
- `open_window` - 打开窗口
- `close_window` - 关闭窗口
- `get_windows` - 获取窗口列表
- `get_window_info` - 获取窗口信息
- `set_window_bounds` - 设置窗口大小位置

### CDP 操作
- `cdp_click` - 点击
- `cdp_type_text` - 输入文本
- `cdp_scroll` - 滚动
- `cdp_press_key` - 按键

### JavaScript
- `exec_js` - 执行 JS 代码
- `inject_auto_run_when_dom_ready_js` - 注入自动执行 JS

### 网络监控
- `get_requests` - 获取网络请求
- `filter_requests` - 过滤请求
- `get_console_logs` - 获取控制台日志

### 截图
- `webpage_screenshot_and_to_clipboard` - 截图到剪贴板
- `webpage_snapshot` - 网页快照

### 剪贴板
- `clipboard_write_text` - 写入文本
- `clipboard_read_text` - 读取文本
- `clipboard_write_image` - 写入图片

### 执行
- `exec_shell` - 执行 Shell 命令
- `exec_python` - 执行 Python 代码
- `exec_npm` - 执行 npm 命令

## 配置

**环境变量:**
- `PORT` - 服务端口（默认 8101）
- `DISPLAY` - X11 显示（默认 :2）

**启动参数:**
```bash
npm start -- --port=8102 --url=https://example.com
```

## 详细文档

查看项目根目录 [README.md](../../README.md)
