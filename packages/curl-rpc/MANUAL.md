# curl-rpc 使用手册 - Quick Manual

## 🎯 核心概念

`curl-rpc` 是一个轻量级命令行工具，用于调用 Electron MCP 服务器的工具。

**三种调用格式：**
1. **简化语法**（最简洁）：`curl-rpc tool_name key=value`
2. **YAML 格式**（推荐）：`curl-rpc "name: tool_name\narguments: ..."`
3. **JSON 格式**（标准）：`curl-rpc --json '{"name":"tool_name",...}'`

## 📖 快速开始

### 1. 安装
```bash
npm install -g curl-rpc
```

### 2. 查看帮助
```bash
curl-rpc --help
curl-rpc -h
```

### 2. 测试连接
```bash
curl-rpc ping
```

### 3. 基本使用
```bash
# 简化语法（推荐日常使用）
curl-rpc open_window url=https://google.com
curl-rpc get_windows
curl-rpc close_window win_id=1

# YAML 格式（推荐复杂参数）
curl-rpc "
name: open_window
arguments:
  url: https://google.com
  reuseWindow: false
"

# JSON 格式（标准格式）
curl-rpc --json '{"name":"open_window","arguments":{"url":"https://google.com"}}'
```

## 🔧 常用工具速查

### 窗口管理
```bash
curl-rpc ping                                    # 测试连接
curl-rpc get_windows                             # 获取所有窗口
curl-rpc open_window url=https://google.com     # 打开窗口
curl-rpc get_window_info win_id=1               # 获取窗口信息
curl-rpc close_window win_id=1                  # 关闭窗口
curl-rpc set_window_bounds win_id=1 x=100 y=100 width=1280 height=720
```

### CDP 鼠标操作
```bash
curl-rpc cdp_click win_id=1 x=500 y=300         # 点击
curl-rpc cdp_dblclick win_id=1 x=500 y=300      # 双击
```

### CDP 键盘操作
```bash
curl-rpc cdp_type_text win_id=1 text="Hello World"  # 输入文本
curl-rpc cdp_press_enter win_id=1                   # 按回车
curl-rpc cdp_press_backspace win_id=1               # 按退格
curl-rpc cdp_press_copy win_id=1                    # 复制 (Ctrl+C)
curl-rpc cdp_press_paste win_id=1                   # 粘贴 (Ctrl+V)
curl-rpc cdp_press_selectall win_id=1               # 全选 (Ctrl+A)
```

### CDP 页面操作
```bash
curl-rpc cdp_scroll win_id=1 y=500              # 滚动页面
curl-rpc load_url win_id=1 url=https://google.com  # 加载 URL
curl-rpc get_title win_id=1                     # 获取标题
```

### JavaScript 执行
```bash
curl-rpc exec_js win_id=1 code="document.title"
curl-rpc exec_js win_id=1 code="document.querySelector('#btn').click()"
curl-rpc get_element_client_bound win_id=1 selector="#btn1"
```

### 剪贴板操作
```bash
curl-rpc clipboard_write_text text="Hello from clipboard"
curl-rpc clipboard_read_text
curl-rpc clipboard_write_image path=/path/to/image.png
```

### 执行命令
```bash
curl-rpc exec_shell command="ls -la"
curl-rpc exec_python code="print(2+2)"
curl-rpc exec_npm command="--version"
```

### 截图
```bash
curl-rpc webpage_screenshot_and_to_clipboard win_id=1
curl-rpc webpage_snapshot win_id=1
curl-rpc system_screenshot
```

## 💡 使用技巧

### 1. 选择合适的格式

**简单参数 → 简化语法**
```bash
curl-rpc open_window url=https://google.com
```

**复杂参数/多行代码 → YAML 格式**
```bash
curl-rpc "
name: exec_js
arguments:
  win_id: 1
  code: |
    const btn = document.querySelector('#submit');
    btn.click();
"
```

**标准 API 调用 → JSON 格式**
```bash
curl-rpc --json '{"name":"open_window","arguments":{"url":"https://google.com"}}'
```

### 2. 参数引号规则

```bash
# 不含空格，不需要引号
curl-rpc open_window url=https://google.com

# 含空格，需要引号
curl-rpc cdp_type_text win_id=1 text="Hello World"

# 含特殊字符，需要引号
curl-rpc exec_js win_id=1 code="document.querySelector('#btn').click()"
```

### 3. 多行 YAML 技巧

```bash
# 使用 | 保留换行
curl-rpc "
name: exec_js
arguments:
  win_id: 1
  code: |
    const title = document.title;
    const url = window.location.href;
    return { title, url };
"

# 使用 > 折叠换行
curl-rpc "
name: exec_js
arguments:
  win_id: 1
  code: >
    document.querySelector('#btn').click();
    console.log('clicked');
"
```

## ⚙️ 配置

### Token 配置
```bash
# 设置 token
echo "your-token-here" > ~/electron-mcp-token.txt

# 查看 token
cat ~/electron-mcp-token.txt
```

### 服务器地址
```bash
# 默认：http://localhost:8101
export ELECTRON_MCP_URL=http://localhost:8101

# 自定义端口
export ELECTRON_MCP_URL=http://localhost:8102
```

## 🚨 故障排除

### 错误：yq not found
```bash
pip install yq --break-system-packages
```

### 错误：Cannot connect to MCP server
```bash
# 检查服务状态
bash /home/w3c_offical/projects/electron-mcp/main/skills/electron-mcp-service/service.sh status

# 启动服务
bash /home/w3c_offical/projects/electron-mcp/main/skills/electron-mcp-service/service.sh start
```

### 错误：Token not found
```bash
echo "your-token" > ~/electron-mcp-token.txt
```

### 错误：Invalid YAML format
```bash
# 检查 YAML 语法
echo "name: ping" | yq .

# 使用简化语法代替
curl-rpc ping
```

## 📚 相关文档

- **完整 README**: https://github.com/cicy-dev/electron-mcp/blob/main/skills/curl-rpc/README.md
- **工具列表**: https://github.com/cicy-dev/electron-mcp/blob/main/skills/SKILLS-LIST.md
- **项目主页**: https://github.com/cicy-dev/electron-mcp

## 🎓 LLM 使用建议

当 LLM 需要使用 `curl-rpc` 时：

1. **首选简化语法**：适合 90% 的场景
   ```bash
   curl-rpc tool_name key1=value1 key2=value2
   ```

2. **复杂参数用 YAML**：多行代码、嵌套结构
   ```bash
   curl-rpc "
   name: tool_name
   arguments:
     key: value
   "
   ```

3. **先查看帮助**：不确定时运行 `curl-rpc --help`

4. **测试连接**：开始前先 `curl-rpc ping`

5. **错误处理**：仔细阅读错误信息，按提示修复
