# 抖音视频下载工具 - Douyin Video Downloader

快速下载抖音视频到本地的命令行工具。

## 快速开始

```bash
# 下载单个视频
bash skills/download-douyin-video/download-douyin-video.sh https://www.douyin.com/video/7594434780347813155

# 指定端口
MCP_PORT=8102 bash skills/download-douyin-video/download-douyin-video.sh https://www.douyin.com/video/7594434780347813155
```

## 前置条件

1. **electron-mcp 服务运行中**
   ```bash
   npm start -- --port=8101
   ```

2. **认证文件存在**
   ```bash
   ~/electron-mcp-token.txt
   ```

## 使用方法

### 基本用法

```bash
bash skills/download-douyin-video/download-douyin-video.sh <douyin_url>
```

### 参数说明

- `douyin_url`: 抖音视频 URL（必需）

### 环境变量

- `MCP_PORT`: electron-mcp 服务端口（默认: 8101）
- `WIN_ID`: 窗口 ID（默认: 1）
- `DOWNLOAD_DIR`: 下载目录（默认: ~/Desktop/video）

### 示例

```bash
# 基本下载
bash skills/download-douyin-video/download-douyin-video.sh \
  https://www.douyin.com/video/7594434780347813155

# 自定义端口
MCP_PORT=8102 bash skills/download-douyin-video/download-douyin-video.sh \
  https://www.douyin.com/video/7594434780347813155

# 自定义下载目录
DOWNLOAD_DIR=~/Downloads bash skills/download-douyin-video/download-douyin-video.sh \
  https://www.douyin.com/video/7594434780347813155
```

## 输出

视频将保存为：`~/Desktop/video/{video_id}.mp4`

例如：`~/Desktop/video/7594434780347813155.mp4`

## 测试

```bash
# 运行测试套件
bash skills/download-douyin-video/tests/test-download.sh
```

## 故障排查

### 问题1: electron-mcp 服务未运行

**错误信息**: `electron-mcp 服务未运行，请先启动服务`

**解决方法**:
```bash
npm start -- --port=8101
```

### 问题2: 未找到视频下载地址

**可能原因**:
1. 页面加载未完成 - 增加等待时间
2. 视频需要登录 - 先在浏览器中登录
3. 页面结构变化 - 检查网络请求

**解决方法**:
- 修改脚本中的 `sleep 5` 增加等待时间
- 使用已登录的账户窗口

### 问题3: 下载失败

**检查步骤**:
1. 验证视频 URL 是否有效
2. 检查网络连接
3. 查看 electron-mcp 日志

## 在 AI 助手中使用

### Claude

```
请使用 download-douyin-video 技能下载这个视频：
https://www.douyin.com/video/7594434780347813155
```

### OpenCode

```
运行抖音视频下载工具：
bash skills/download-douyin-video/download-douyin-video.sh https://www.douyin.com/video/7594434780347813155
```

## 技术细节

查看 [download-douyin-video.md](./download-douyin-video.md) 了解详细技术文档。
