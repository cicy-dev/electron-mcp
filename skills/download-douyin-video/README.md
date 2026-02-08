# 抖音视频下载技能

快速下载抖音视频到本地。

## 快速开始

```bash
# 下载单个视频
bash skills/download-douyin-video/download-douyin-video.sh https://www.douyin.com/video/7594434780347813155

# 自定义下载目录
DOWNLOAD_DIR=~/Downloads bash skills/download-douyin-video/download-douyin-video.sh <url>

# 调整页面加载等待时间（秒）
WAIT_TIME=10 bash skills/download-douyin-video/download-douyin-video.sh <url>
```

## 前置条件

1. **electron-mcp 服务运行中**
   ```bash
   npm start
   ```

2. **安装 jq**
   ```bash
   sudo apt-get install jq  # Ubuntu/Debian
   brew install jq          # macOS
   ```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `ELECTRON_MCP_URL` | `http://localhost:8101` | MCP 服务器地址 |
| `DOWNLOAD_DIR` | `~/Desktop/video` | 视频保存目录 |
| `WAIT_TIME` | `8` | 页面加载等待时间（秒） |

## 工作原理

1. 使用 electron-mcp 打开抖音视频页面
2. 等待页面加载完成
3. 捕获包含 `__vid` 的视频真实地址
4. 使用 `session_download_url` 下载视频
5. 保存为 `{video_id}.mp4`

## 测试

```bash
bash skills/download-douyin-video/tests/test-download.sh
```

## 故障排查

**问题：No video URL found**
- 增加 `WAIT_TIME`：`WAIT_TIME=15 bash ...`
- 检查网络连接
- 确认视频 URL 有效

**问题：Service not running**
- 启动服务：`npm start`
- 检查端口：`curl http://localhost:8101/mcp`

**问题：Download failed**
- 检查磁盘空间
- 确认下载目录权限
- 查看 electron-mcp 日志

## 详细文档

查看 [download-douyin-video.md](./download-douyin-video.md) 了解更多技术细节。
