# 抖音视频下载

使用 `curl-rpc` 下载抖音视频的方法。

## 快速开始

```bash
# 0. 启动服务（首次使用）
bash skills/electron-mcp-service/service.sh start

# 1. 打开抖音视频页面
curl-rpc open_window url=https://www.douyin.com/video/7594434780347813155

# 2. 等待页面加载（8秒）
sleep 8

# 3. 提取视频 URL
curl-rpc "
name: exec_js
arguments:
  win_id: 1
  code: 'Array.from(document.querySelectorAll(\"video\")).map(v => v.currentSrc)'
"

# 4. 下载视频（复制上一步输出的 URL）
mkdir -p ~/Desktop/video
curl -L -o ~/Desktop/video/video.mp4 "<视频URL>"
```

## 完整示例

```bash
# 一键下载（需要先启动服务）
VIDEO_URL="https://www.douyin.com/video/7594434780347813155"

# 打开页面
curl-rpc open_window url=$VIDEO_URL

# 等待加载
sleep 8

# 获取视频 URL 并下载
VIDEO_SRC=$(curl-rpc "
name: exec_js
arguments:
  win_id: 1
  code: 'Array.from(document.querySelectorAll(\"video\")).map(v => v.currentSrc)[0]'
")

# 下载
mkdir -p ~/Desktop/video
curl -L -o ~/Desktop/video/$(basename $VIDEO_URL).mp4 "$VIDEO_SRC"
```

## 示例

```bash
# 示例 1: 下载单个视频
curl-rpc open_window url=https://www.douyin.com/video/7594434780347813155
sleep 8
curl-rpc "
name: exec_js
arguments:
  win_id: 1
  code: 'Array.from(document.querySelectorAll(\"video\")).map(v => v.currentSrc)'
"

# 示例 2: 批量下载
for url in url1 url2 url3; do
  curl-rpc open_window url=$url
  sleep 8
  curl-rpc "
name: exec_js
arguments:
  win_id: 1
  code: 'Array.from(document.querySelectorAll(\"video\")).map(v => v.currentSrc)'
"
done
```

## 常见问题

**Q: 如何调整等待时间？**
```bash
sleep 15  # 增加到 15 秒
```

**Q: 如何检查页面是否加载完成？**
```bash
curl-rpc get_window_info win_id=1
# 查看 isDomReady 和 isLoading 字段
```

**Q: 如何获取视频标题？**
```bash
curl-rpc "
name: exec_js
arguments:
  win_id: 1
  code: 'document.title'
"
```

**Q: 视频 URL 为空怎么办？**
- 增加等待时间
- 检查页面是否需要登录
- 查看浏览器控制台是否有错误
