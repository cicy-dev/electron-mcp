# Electron MCP Skills

基于 RPC 的技能集合。

## 快速开始

```bash
# 1. 启动服务
bash skills/electron-mcp-service/service.sh start

# 2. 使用技能
bash skills/download-douyin-video/download-douyin-video.sh <url>
```

## 可用技能

| 技能 | 说明 | 文档 |
|------|------|------|
| **download-douyin-video** | 下载抖音视频 | [README](./download-douyin-video/README.md) |
| **aistudio** | AI Studio 自动化 | [README](./aistudio/README.md) |
| **curl-rpc** | RPC 命令行工具 | [README](./curl-rpc/README.md) |

## 创建新技能

```bash
# 使用模板
bash skills/create-skill.sh my-skill

# 编辑实现
vim skills/my-skill/my-skill.sh

# 测试
bash skills/my-skill/tests/test.sh
```

## 服务管理

```bash
bash skills/electron-mcp-service/service.sh start   # 启动
bash skills/electron-mcp-service/service.sh status  # 状态
bash skills/electron-mcp-service/service.sh logs    # 日志
```

## 参考

- [技能列表](SKILLS-LIST.md) - 完整技能清单
- [开发模板](template-rpc/) - 技能开发模板
- [RPC API](../tests/rpc/README.md) - API 文档
