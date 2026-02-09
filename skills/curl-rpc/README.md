# curl-rpc

轻量级 MCP RPC 调用工具，用于调用 Electron MCP 服务器。

## 特性

- 🚀 **简化语法** - 最简洁的调用方式：`curl-rpc tool_name key=value`
- 📝 **YAML 优先** - 默认 YAML 格式，节省 30% token
- 🔄 **JSON 支持** - 使用 `--json` 或 `-j` 标志切换到 JSON
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

### 简化语法（推荐）

```bash
# 无参数工具
curl-rpc ping

# 带参数（key=value 格式）
curl-rpc open_window url=https://google.com

# 多参数
curl-rpc set_window_bounds win_id=1 x=100 y=100 width=800 height=600

# 文本参数
curl-rpc cdp_type_text win_id=1 text="Hello World"
```

### YAML 格式（完整语法）

```bash
# 简单调用（多行格式）
curl-rpc "
name: ping
"

# 带参数
curl-rpc "
name: open_window
arguments:
  url: https://google.com
"

# 多参数
curl-rpc "
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
curl-rpc --json '{"name":"ping"}'

curl-rpc -j '{"name":"open_window","arguments":{"url":"https://google.com"}}'
```

## 示例

### 窗口管理

```bash
# 简化语法
curl-rpc open_window url=https://google.com
curl-rpc get_windows
curl-rpc get_window_info win_id=1
curl-rpc set_window_bounds win_id=1 width=1280 height=720
curl-rpc close_window win_id=1

# 完整 YAML 语法
curl-rpc "
name: open_window
arguments:
  url: https://google.com
"
```

### CDP 操作

```bash
# 简化语法
curl-rpc cdp_click win_id=1 x=100 y=100
curl-rpc cdp_type_text win_id=1 text="Hello World"
curl-rpc cdp_scroll win_id=1 y=500
curl-rpc cdp_press_enter win_id=1

# 完整 YAML 语法
curl-rpc "
name: cdp_press_paste
arguments:
  win_id: 1
  method: sendInputEvent
"
```

### 剪贴板操作

```bash
# 简化语法
curl-rpc clipboard_write_text text="Hello from clipboard"
curl-rpc clipboard_read_text

# 完整 YAML 语法
curl-rpc "
name: clipboard_write_text
arguments:
  text: Hello from clipboard
"
```

### 执行命令

```bash
# 简化语法
curl-rpc exec_shell command="ls -la"
curl-rpc exec_python code="print(2+2)"
curl-rpc exec_npm command="--version"

# 完整 YAML 语法
curl-rpc "
name: exec_shell
arguments:
  command: ls -la
"
```

### JavaScript 执行

```bash
# 简化语法
curl-rpc exec_js win_id=1 code="document.title"
curl-rpc get_element_client_bound win_id=1 selector="#btn1"

# 完整 YAML 语法
curl-rpc "
name: exec_js
arguments:
  win_id: 1
  code: document.title
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
$ curl-rpc "invalid: yaml: syntax:"
❌ Error: Invalid YAML format

# 服务器错误
$ curl-rpc "name: invalid_tool"
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

**简化语法（最简洁）：**
```bash
curl-rpc open_window url=https://google.com
```

**YAML（推荐，复杂参数）：**
```bash
curl-rpc "
name: open_window
arguments:
  url: https://google.com
"
```

**JSON（标准）：**
```bash
curl-rpc --json '{"name":"open_window","arguments":{"url":"https://google.com"}}'
```

**优势对比：**
- 简化语法：最简洁，适合简单参数
- YAML：可读性好，支持多行，省约 30% token
- JSON：标准格式，工具支持广泛

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
