# Skills List

## 服务管理

### electron-mcp server

```bash
bash skills/electron-mcp-service/service.sh start    # 启动服务
bash skills/electron-mcp-service/service.sh stop     # 停止服务
bash skills/electron-mcp-service/service.sh status   # 查看状态
bash skills/electron-mcp-service/service.sh logs     # 查看日志
bash skills/electron-mcp-service/service.sh restart  # 重启服务
```

**验证服务:**
```bash
curl-rpc ping  # 应返回 "Pong"
```

**安装 curl-rpc:**
```bash
npm install -g curl-rpc
```

---

## 可用技能

### electron-mcp-service
**位置:** `./electron-mcp-service`  
**功能:** 浏览器自动化服务

```bash
bash skills/electron-mcp-service/service.sh start
curl-rpc ping
```

[文档](./electron-mcp-service/README.md)

---

### curl-rpc
**位置:** `../packages/curl-rpc`  
**类型:** npm 包  
**功能:** 轻量级 MCP RPC 命令行工具

```bash
# 安装
npm install -g curl-rpc

# 查看帮助
curl-rpc --help

# 测试连接
curl-rpc ping

# 打开窗口
curl-rpc open_window url=https://google.com

# 执行JavaScript
curl-rpc exec_js win_id=1 code='document.title'

# 下载文件
curl-rpc session_download_url url=http://example.com/file.zip save_path=/tmp/file.zip

# 获取下载列表
curl-rpc get_downloads
```

**特性:**
- 🚀 简化语法：`curl-rpc tool_name key=value`
- 📋 完整工具列表：`curl-rpc --help`
- 🔒 自动Token认证：`~/data/electron/token.txt`
- 📖 详细文档：包含所有工具的请求/响应示例

[完整文档](../packages/curl-rpc/README.md)

---
curl-rpc ping
curl-rpc open_window url=https://google.com
curl-rpc --help
```

[文档](https://github.com/cicy-dev/electron-mcp/blob/main/packages/curl-rpc/README.md) | [npm](https://www.npmjs.com/package/curl-rpc)

---

### telegram-web
**位置:** `./telegram-web`  
**功能:** Telegram Web 自动化

```bash
# 打开 Telegram Web
bash skills/telegram-web/telegram-web.sh open

# 获取登录二维码
bash skills/telegram-web/telegram-web.sh qrcode

# 获取聊天列表
bash skills/telegram-web/telegram-web.sh chats

# 发送消息
bash skills/telegram-web/telegram-web.sh send "Saved Messages" "Hello"
```

[文档](./telegram-web/README.md)

---

### download-douyin-video
**位置:** `./download-douyin-video`  
**功能:** 下载抖音视频

```bash
bash skills/download-douyin-video/download-douyin-video.sh <url>
```

**依赖:** electron-mcp 服务 + jq

[文档](./download-douyin-video/README.md)

---

### aistudio
**位置:** `./aistudio`  
**功能:** AI Studio 自动化

[文档](./aistudio/README.md)

---

## 添加新技能

```bash
bash skills/create-skill.sh my-skill
```

参考模板：`./template-rpc/`
