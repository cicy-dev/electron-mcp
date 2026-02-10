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
**位置:** `./curl-rpc`  
**功能:** MCP RPC 命令行工具

```bash
curl-rpc "name: ping"
```

[文档](./curl-rpc/README.md)

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
