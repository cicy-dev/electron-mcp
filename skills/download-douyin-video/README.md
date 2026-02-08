# 抖音视频下载

自动下载抖音视频到本地。

## 使用方法

```bash
# 1. 启动服务
cd /path/to/electron-mcp
DISPLAY=:1 npm start -- --no-sandbox

# 2. 下载视频
bash skills/download-douyin-video/download-douyin-video.sh <抖音视频URL>

# 3. 查看结果
ls ~/Desktop/video/
```

## 示例

```bash
# 基本用法
bash skills/download-douyin-video/download-douyin-video.sh \
  https://www.douyin.com/video/7594434780347813155

# 自定义目录
DOWNLOAD_DIR=~/Downloads bash skills/download-douyin-video/download-douyin-video.sh <url>

# 批量下载
while read url; do bash skills/download-douyin-video/download-douyin-video.sh "$url"; done < urls.txt
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DOWNLOAD_DIR` | `~/Desktop/video` | 保存目录 |
| `WAIT_TIME` | `8` | 页面加载等待时间（秒） |
| `ELECTRON_MCP_URL` | `http://localhost:8101` | 服务地址 |

## 依赖

- electron-mcp 服务运行中
- jq 已安装：`sudo apt-get install jq`

## 故障排查

**服务未运行：**
```bash
curl http://localhost:8101/mcp  # 验证服务
```

**找不到视频：**
```bash
WAIT_TIME=15 bash download-douyin-video.sh <url>  # 增加等待时间
```

**详细文档：** [download-douyin-video.md](./download-douyin-video.md)
