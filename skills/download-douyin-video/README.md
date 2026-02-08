# 抖音视频下载技能

自动下载抖音视频到本地，通过浏览器自动化捕获视频真实地址。

## 快速开始

### 1. 启动 electron-mcp 服务

```bash
cd /path/to/electron-mcp
DISPLAY=:1 npm start -- --no-sandbox
```

### 2. 下载视频

```bash
# 基本用法
bash skills/download-douyin-video/download-douyin-video.sh https://www.douyin.com/video/7594434780347813155

# 自定义下载目录
DOWNLOAD_DIR=~/Downloads bash skills/download-douyin-video/download-douyin-video.sh <url>

# 调整页面加载等待时间（秒）
WAIT_TIME=15 bash skills/download-douyin-video/download-douyin-video.sh <url>
```

### 3. 查看下载结果

```bash
ls -lh ~/Desktop/video/
```

## 前置条件

### 1. 启动 electron-mcp 服务

```bash
# 进入项目目录
cd /path/to/electron-mcp

# 启动服务（需要 DISPLAY 环境变量）
DISPLAY=:1 npm start -- --no-sandbox

# 或使用 service.sh
./service.sh start
```

**验证服务运行：**
```bash
curl http://localhost:8101/mcp
# 应该返回 SSE 连接信息
```

### 2. 安装 jq

```bash
# Ubuntu/Debian
sudo apt-get install jq

# macOS
brew install jq

# CentOS/RHEL
sudo yum install jq
```

**验证安装：**
```bash
jq --version
# 应该显示版本号，如 jq-1.6
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `ELECTRON_MCP_URL` | `http://localhost:8101` | MCP 服务器地址 |
| `DOWNLOAD_DIR` | `~/Desktop/video` | 视频保存目录 |
| `WAIT_TIME` | `8` | 页面加载等待时间（秒） |

## 使用示例

### 示例 1：下载单个视频

```bash
# 1. 确保服务运行
curl http://localhost:8101/mcp

# 2. 下载视频
bash skills/download-douyin-video/download-douyin-video.sh \
  https://www.douyin.com/video/7594434780347813155

# 3. 查看结果
ls -lh ~/Desktop/video/
# 输出：7594434780347813155.mp4
```

### 示例 2：自定义下载目录

```bash
# 下载到 ~/Downloads
DOWNLOAD_DIR=~/Downloads \
bash skills/download-douyin-video/download-douyin-video.sh \
  https://www.douyin.com/video/7594434780347813155

# 查看结果
ls -lh ~/Downloads/
```

### 示例 3：批量下载

```bash
# 创建 URL 列表文件
cat > urls.txt << EOF
https://www.douyin.com/video/7594434780347813155
https://www.douyin.com/video/1234567890123456789
https://www.douyin.com/video/9876543210987654321
EOF

# 批量下载
while IFS= read -r url; do
  echo "Downloading: $url"
  bash skills/download-douyin-video/download-douyin-video.sh "$url"
  sleep 2  # 避免请求过快
done < urls.txt
```

### 示例 4：网络慢时增加等待时间

```bash
# 等待 20 秒让页面完全加载
WAIT_TIME=20 \
bash skills/download-douyin-video/download-douyin-video.sh \
  https://www.douyin.com/video/7594434780347813155
```

### 示例 5：组合配置

```bash
# 自定义所有参数
ELECTRON_MCP_URL=http://localhost:8102 \
DOWNLOAD_DIR=~/Videos/douyin \
WAIT_TIME=15 \
bash skills/download-douyin-video/download-douyin-video.sh \
  https://www.douyin.com/video/7594434780347813155
```

## 工作原理

### 流程图

```
用户输入抖音URL
    ↓
检查依赖 (jq, curl-rpc)
    ↓
检查 electron-mcp 服务状态
    ↓
打开浏览器窗口加载视频页面
    ↓
等待页面加载（默认8秒）
    ↓
方法1: 捕获网络请求（过滤 __vid）
方法2: 从 <video> 元素获取 src
    ↓
提取视频真实地址
    ↓
下载视频到本地
    ↓
保存为 ~/Desktop/video/{video_id}.mp4
```

### 技术细节

1. **视频 URL 捕获**
   - 优先使用 `filter_requests` 捕获包含 `__vid` 的网络请求
   - 备用方案：使用 `exec_js` 从页面 `<video>` 元素获取 `currentSrc`

2. **下载方式**
   - 使用 `session_download_url` 工具（复用浏览器会话）
   - 备用方案：使用 `curl` 直接下载

3. **文件命名**
   - 从 URL 提取视频 ID：`/video/(\d+)` → `7594434780347813155`
   - 保存为：`{video_id}.mp4`

## 故障排查

### 问题 1：Service not running

**错误信息：**
```
[ERROR] electron-mcp service is not running at http://localhost:8101
```

**解决方法：**
```bash
# 1. 启动服务
cd /path/to/electron-mcp
DISPLAY=:1 npm start -- --no-sandbox

# 2. 验证服务
curl http://localhost:8101/mcp

# 3. 如果端口被占用，使用其他端口
PORT=8102 npm start -- --no-sandbox
# 然后设置环境变量
ELECTRON_MCP_URL=http://localhost:8102 bash download-douyin-video.sh <url>
```

### 问题 2：No video URL found

**错误信息：**
```
[ERROR] No video URL found with __vid pattern
```

**原因：**
- 页面加载时间不足
- 网络请求监控未捕获到视频 URL
- 视频需要登录才能观看

**解决方法：**
```bash
# 方法 1：增加等待时间
WAIT_TIME=20 bash download-douyin-video.sh <url>

# 方法 2：手动检查页面是否加载
bash skills/curl-rpc/curl-rpc "tools/call" "
name: get_window_info
arguments:
  win_id: 1
"
# 查看 isDomReady 和 isLoading 状态

# 方法 3：使用 JS 直接获取视频 URL
bash skills/curl-rpc/curl-rpc "tools/call" "
name: exec_js
arguments:
  win_id: 1
  code: Array.from(document.querySelectorAll('video')).map(v => v.currentSrc || v.src).join('\\n')
"
```

### 问题 3：jq not installed

**错误信息：**
```
[ERROR] jq is required but not installed
```

**解决方法：**
```bash
# Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y jq

# macOS
brew install jq

# 验证
jq --version
```

### 问题 4：Download failed

**错误信息：**
```
[ERROR] Download failed: file not found
```

**解决方法：**
```bash
# 1. 检查磁盘空间
df -h ~/Desktop/video

# 2. 检查目录权限
ls -ld ~/Desktop/video
mkdir -p ~/Desktop/video
chmod 755 ~/Desktop/video

# 3. 手动下载（如果获取到了 URL）
VIDEO_URL="<从错误信息中复制的 URL>"
curl -L -o ~/Desktop/video/test.mp4 "$VIDEO_URL"
```

### 问题 5：Permission denied

**错误信息：**
```
bash: ./download-douyin-video.sh: Permission denied
```

**解决方法：**
```bash
# 添加执行权限
chmod +x skills/download-douyin-video/download-douyin-video.sh

# 或使用 bash 执行
bash skills/download-douyin-video/download-douyin-video.sh <url>
```

## 测试

### 运行测试套件

```bash
bash skills/download-douyin-video/tests/test-download.sh
```

**测试内容：**
- ✅ 脚本文件存在性检查
- ✅ 帮助信息显示测试
- ✅ 依赖项检查（jq）
- ✅ curl-rpc 可用性检查
- ✅ electron-mcp 服务状态检查

### 手动测试

```bash
# 1. 测试完整流程
bash skills/download-douyin-video/download-douyin-video.sh \
  https://www.douyin.com/video/7594434780347813155

# 2. 验证下载结果
ls -lh ~/Desktop/video/7594434780347813155.mp4

# 3. 播放视频（Linux）
vlc ~/Desktop/video/7594434780347813155.mp4
# 或
mpv ~/Desktop/video/7594434780347813155.mp4
```

## 高级用法

### 使用 curl-rpc 手动操作

```bash
# 1. 打开视频页面
bash skills/curl-rpc/curl-rpc "tools/call" "
name: open_window
arguments:
  url: https://www.douyin.com/video/7594434780347813155
  reuseWindow: true
"

# 2. 等待加载
sleep 10

# 3. 获取视频 URL
bash skills/curl-rpc/curl-rpc "tools/call" "
name: exec_js
arguments:
  win_id: 1
  code: Array.from(document.querySelectorAll('video')).map(v => v.currentSrc || v.src).join('\\n')
"

# 4. 手动下载
VIDEO_URL="<从上一步获取的 URL>"
curl -L -o ~/Desktop/video/test.mp4 "$VIDEO_URL"
```

### 集成到其他脚本

```bash
#!/bin/bash
# my-download-script.sh

# 导入下载函数
source skills/download-douyin-video/download-douyin-video.sh

# 批量下载
urls=(
  "https://www.douyin.com/video/7594434780347813155"
  "https://www.douyin.com/video/1234567890123456789"
)

for url in "${urls[@]}"; do
  log_info "Processing: $url"
  main "$url"
done
```

## 常见问题 (FAQ)

**Q: 支持哪些视频平台？**  
A: 目前仅支持抖音（douyin.com）。其他平台需要修改脚本。

**Q: 下载速度慢怎么办？**  
A: 视频下载速度取决于网络和 CDN。可以尝试：
- 更换网络环境
- 使用代理
- 多次重试

**Q: 可以下载私密视频吗？**  
A: 不可以。脚本只能下载公开视频。

**Q: 视频质量如何？**  
A: 下载的是页面播放的视频质量，通常是标清或高清。

**Q: 支持下载音频吗？**  
A: 脚本下载的是完整视频（包含音频）。如需提取音频：
```bash
ffmpeg -i video.mp4 -vn -acodec copy audio.m4a
```

**Q: 如何更新脚本？**  
A: 
```bash
cd /path/to/electron-mcp
git pull origin main
```

## 相关资源

- [electron-mcp 项目](https://github.com/cicy-dev/electron-mcp)
- [详细技术文档](./download-douyin-video.md)
- [curl-rpc 工具](../curl-rpc/README.md)
- [MCP 协议规范](https://modelcontextprotocol.io)

## 许可证

MIT License - 与 electron-mcp 项目保持一致

## 贡献

欢迎提交 Issue 和 Pull Request！

---

**最后更新：** 2026-02-09  
**版本：** 1.0.0
