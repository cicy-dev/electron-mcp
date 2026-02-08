# curl-rpc

轻量级 MCP RPC 调用工具，用于调用 Electron MCP 服务器。

## 特性

- 🚀 **YAML 优先** - 默认 YAML 格式，节省 30-45% token
- 📝 **JSON 支持** - 使用 `--json` 或 `-j` 标志切换到 JSON
- ✅ **完善的错误处理** - 清晰的错误提示和建议
- 🔒 **Token 认证** - 自动从 `~/electron-mcp-token.txt` 读取

## 安装

```bash
# 复制到系统路径
cp curl-rpc ~/.local/bin/
chmod +x ~/.local/bin/curl-rpc

# 或者使用 curl 下载
curl -o ~/.local/bin/curl-rpc https://raw.githubusercontent.com/cicy-dev/electron-mcp/main/skills/curl-rpc/curl-rpc
chmod +x ~/.local/bin/curl-rpc
```

## 依赖

```bash
# YAML 支持（推荐）
pip install yq --break-system-packages

# JSON 支持（通常已安装）
# jq
```

## 使用方法

### YAML 格式（默认，推荐）

```bash
# 简单调用
curl-rpc "tools/call" "name: ping"

# 带参数
curl-rpc "tools/call" "
name: open_window
arguments:
  url: https://google.com
"

# 多参数
curl-rpc "tools/call" "
name: set_window_bounds
arguments:
  win_id: 1
  x: 100
  y: 100
  width: 800
  height: 600
"
```

### JSON 格式

```bash
# 使用 --json 或 -j 标志
curl-rpc "tools/call" --json '{"name":"ping"}'

curl-rpc "tools/call" -j '{"name":"open_window","arguments":{"url":"https://google.com"}}'
```

## 示例

### 窗口管理

```bash
# 打开窗口
curl-rpc "tools/call" "
name: open_window
arguments:
  url: https://google.com
"

# 获取所有窗口
curl-rpc "tools/call" "name: get_windows"

# 设置窗口大小
curl-rpc "tools/call" "
name: set_window_bounds
arguments:
  win_id: 1
  width: 1280
  height: 720
"
```

### CDP 操作

```bash
# 点击
curl-rpc "tools/call" "
name: cdp_click
arguments:
  win_id: 1
  x: 100
  y: 100
"

# 输入文本
curl-rpc "tools/call" "
name: cdp_type_text
arguments:
  win_id: 1
  text: Hello World
"

# 粘贴（支持三种方法）
curl-rpc "tools/call" "
name: cdp_press_paste
arguments:
  win_id: 1
  method: sendInputEvent
"
```

### 剪贴板操作

```bash
# 写入文本
curl-rpc "tools/call" "
name: clipboard_write_text
arguments:
  text: Hello from clipboard
"

# 读取文本
curl-rpc "tools/call" "name: clipboard_read_text"
```

### 执行命令

```bash
# Shell 命令
curl-rpc "tools/call" "
name: exec_shell
arguments:
  command: ls -la
"

# Python 代码
curl-rpc "tools/call" "
name: exec_python
arguments:
  code: print(2+2)
"

# npm 命令
curl-rpc "tools/call" "
name: exec_npm
arguments:
  command: --version
"
```

### JavaScript 执行

```bash
# 执行 JS
curl-rpc "tools/call" "
name: exec_js
arguments:
  win_id: 1
  code: document.title
"

# 获取元素位置
curl-rpc "tools/call" "
name: get_element_client_bound
arguments:
  win_id: 1
  selector: '#btn1'
"
```

## 错误处理

curl-rpc 提供完善的错误处理：

```bash
# 缺少参数
$ curl-rpc
❌ Error: Missing method argument
Usage: curl-rpc <method> [--json|-j] <params>

# 无效 YAML
$ curl-rpc "tools/call" "invalid: yaml: syntax:"
❌ Error: Invalid YAML format

# 服务器错误
$ curl-rpc "tools/call" "name: invalid_tool"
❌ Error: HTTP 500
{"error":"Tool 'invalid_tool' not found"}
```

## Token 配置

curl-rpc 从 `~/electron-mcp-token.txt` 读取认证 token：

```bash
# 设置 token
echo "your-token-here" > ~/electron-mcp-token.txt

# 查看 token
cat ~/electron-mcp-token.txt
```

## 格式对比

**YAML（推荐）：**
- 更简洁，节省约 30% token
- 支持多行，易读
- 无需转义引号

**JSON：**
- 标准格式
- 工具支持广泛
- 适合程序生成

## 故障排除

### yq 未安装

```bash
pip install yq --break-system-packages
```

### 服务器未运行

```bash
cd /home/w3c_offical/projects/electron-mcp/skills
./service.sh start
```

### Token 未设置

```bash
echo "your-token" > ~/electron-mcp-token.txt
```

## 相关文档

- [Electron MCP README](../README.md)
- [YAML 格式指南](../docs/yaml.md)
- [工具列表](../SKILLS-LIST.md)
