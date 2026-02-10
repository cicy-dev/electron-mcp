# Telegram Web 自动化

自动化操作 Telegram Web 版的技能脚本。

## 功能

- 🌐 打开 Telegram Web
- 💬 发送消息到指定聊天
- 📖 读取聊天消息
- 🤖 支持自动化操作

## 依赖

```bash
# 安装 curl-rpc
npm install -g curl-rpc

# 启动 electron-mcp 服务
bash skills/electron-mcp-service/service.sh start
```

## 使用方法

### 登录指南

```bash
bash skills/telegram-web/telegram-web.sh login
```

**方法 1: 手机扫码登录（推荐）**
1. 打开 Telegram Web
2. 获取二维码：`bash skills/telegram-web/telegram-web.sh qrcode`
3. 在手机 Telegram 中：
   - 打开 Settings（设置）
   - 点击 Devices（设备）
   - 点击 Link Desktop Device（连接桌面设备）
   - 扫描二维码（从截图 `/tmp/telegram-qrcode.png`）
4. 登录成功

**远程使用技巧：**
- 二维码保存到 `~/Desktop/screenshot/telegram-qrcode.png`
- 通过 VNC 查看并扫描
- 或下载到本地扫描

**方法 2: 手机号登录**
1. 打开 Telegram Web
2. 点击 "Log in by phone Number"
3. 输入手机号（带国家码，如 +86）
4. 输入收到的验证码
5. 如果启用了两步验证，输入密码

### 打开 Telegram Web

```bash
bash skills/telegram-web/telegram-web.sh open
```

### 获取登录二维码（远程使用）

```bash
bash skills/telegram-web/telegram-web.sh qrcode
```

二维码会保存到 `~/Desktop/screenshot/telegram-qrcode.png`，可以：
- 通过 VNC 查看并扫描
- 下载到本地扫描
- 使用 `xdg-open ~/Desktop/screenshot/telegram-qrcode.png` 打开

### 发送消息

```bash
bash skills/telegram-web/telegram-web.sh send "Saved Messages" "Hello World"
bash skills/telegram-web/telegram-web.sh send "Chat Name" "Your message"
```

### 读取消息

```bash
bash skills/telegram-web/telegram-web.sh read "Saved Messages"
bash skills/telegram-web/telegram-web.sh read "Chat Name"
```

### 显示帮助

```bash
bash skills/telegram-web/telegram-web.sh --help
```

## 工作流程

### 发送消息流程

1. 打开 Telegram Web（首次使用）
2. 点击搜索框
3. 输入聊天名称
4. 选择聊天
5. 输入消息
6. 发送

### 读取消息流程

1. 打开聊天
2. 提取最新 5 条消息
3. 返回消息内容和时间

## 示例

### 完整工作流

```bash
# 1. 打开 Telegram Web
bash skills/telegram-web/telegram-web.sh open

# 2. 等待登录（手动扫码）

# 3. 发送消息到 Saved Messages
bash skills/telegram-web/telegram-web.sh send "Saved Messages" "Test message"

# 4. 读取消息
bash skills/telegram-web/telegram-web.sh read "Saved Messages"
```

### 自动化脚本

```bash
#!/bin/bash

# 打开 Telegram
bash skills/telegram-web/telegram-web.sh open

# 等待登录
echo "Please login to Telegram Web..."
read -p "Press Enter after login..."

# 发送多条消息
bash skills/telegram-web/telegram-web.sh send "Saved Messages" "Message 1"
bash skills/telegram-web/telegram-web.sh send "Saved Messages" "Message 2"
bash skills/telegram-web/telegram-web.sh send "Saved Messages" "Message 3"

# 读取消息
bash skills/telegram-web/telegram-web.sh read "Saved Messages"
```

## 注意事项

- ⚠️ 首次使用需要手动登录（扫码）
- ⚠️ 聊天名称必须精确匹配
- ⚠️ 需要等待页面加载完成
- ⚠️ 消息发送有延迟（sleep）

## 故障排除

### 错误：curl-rpc not found

```bash
npm install -g curl-rpc
```

### 错误：electron-mcp service not running

```bash
bash skills/electron-mcp-service/service.sh start
```

### 错误：Telegram Web not opened

```bash
bash skills/telegram-web/telegram-web.sh open
```

### 消息发送失败

- 检查聊天名称是否正确
- 确认已登录 Telegram Web
- 增加 sleep 延迟时间

## 高级用法

### 自定义选择器

编辑脚本中的 CSS 选择器以适配不同版本的 Telegram Web：

```bash
# 搜索框
document.querySelector('input[type="search"]')

# 消息列表
document.querySelectorAll('.message')

# 消息内容
.querySelector('.text-content')
```

### 批量操作

```bash
# 批量发送消息
for msg in "Hello" "World" "Test"; do
    bash skills/telegram-web/telegram-web.sh send "Saved Messages" "$msg"
    sleep 2
done
```

## 相关文档

- [electron-mcp README](../README.md)
- [curl-rpc 文档](https://github.com/cicy-dev/electron-mcp/blob/main/packages/curl-rpc/README.md)
- [Telegram Web](https://web.telegram.org/k/)
