# Skills List

## 可用技能

### curl-rpc
**位置:** `./curl-rpc`  
**功能:** MCP RPC 命令行工具

```bash
curl-rpc "tools/call" "name: ping"
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
