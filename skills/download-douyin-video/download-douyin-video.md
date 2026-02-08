# 抖音视频下载工具 - 详细文档

## 概述

这是一个基于 electron-mcp 服务器的抖音视频自动下载工具。通过浏览器自动化技术，捕获视频真实下载地址并保存到本地。

## 工作原理

### 核心流程

```
1. 打开抖音视频页面
   ↓
2. 等待页面加载完成
   ↓
3. 捕获网络请求（包含 __vid 的视频 URL）
   ↓
4. 使用 session_download_url 下载视频
   ↓
5. 保存到 ~/Desktop/video/{video_id}.mp4
```

### 技术栈

- **electron-mcp**: 浏览器自动化服务器
- **curl-rpc**: MCP 工具调用客户端
- **Bash**: 脚本语言
- **CDP (Chrome DevTools Protocol)**: 网络请求捕获

## 安装和配置

### 1. 启动 electron-mcp 服务

```bash
# 在项目根目录
npm start -- --port=8101

# 或使用 service.sh
./service.sh start
```

### 2. 配置认证

确保认证文件存在：
```bash
echo "your-token-here" > ~/electron-mcp-token.txt
```

### 3. 创建下载目录

```bash
mkdir -p ~/Desktop/video
```

## 使用指南

### 命令行使用

#### 基本语法

```bash
bash skills/download-douyin-video/download-douyin-video.sh <douyin_url>
```

#### 完整示例

```bash
# 下载单个视频
bash skills/download-douyin-video/download-douyin-video.sh \
  https://www.douyin.com/video/7594434780347813155

# 使用自定义端口
MCP_PORT=8102 bash skills/download-douyin-video/download-douyin-video.sh \
  https://www.douyin.com/video/7594434780347813155

# 使用自定义窗口 ID
WIN_ID=2 bash skills/download-douyin-video/download-douyin-video.sh \
  https://www.douyin.com/video/7594434780347813155

# 自定义下载目录
DOWNLOAD_DIR=~/Downloads/douyin bash skills/download-douyin-video/download-douyin-video.sh \
  https://www.douyin.com/video/7594434780347813155
```

### 在 Claude 中使用

Claude 可以直接调用此技能：

```
用户: 帮我下载这个抖音视频 https://www.douyin.com/video/7594434780347813155

Claude: 我会使用 download-douyin-video 技能为你下载视频。

[Claude 执行命令]
bash skills/download-douyin-video/download-douyin-video.sh \
  https://www.douyin.com/video/7594434780347813155

[输出结果]
✅ 下载成功！
文件路径: /home/user/Desktop/video/7594434780347813155.mp4
文件大小: 15M
```

### 在 OpenCode 中使用

OpenCode 可以通过命令面板调用：

1. 打开命令面板（Ctrl+Shift+P）
2. 输入 "Run Task"
3. 选择 "Download Douyin Video"
4. 输入视频 URL

或直接在终端运行：
```bash
bash skills/download-douyin-video/download-douyin-video.sh <url>
```

### 在 Kiro CLI 中使用

```bash
# 在 Kiro CLI 对话中
用户: 下载抖音视频 https://www.douyin.com/video/7594434780347813155

Kiro: [执行下载命令并显示结果]
```

## API 调用详解

### 1. open_window - 打开窗口

```yaml
name: open_window
arguments:
  url: https://www.douyin.com/video/7594434780347813155
  reuseWindow: true
```

**作用**: 在 electron-mcp 中打开抖音视频页面

### 2. get_requests - 获取网络请求

```yaml
name: get_requests
arguments:
  win_id: 1
```

**作用**: 获取窗口的所有网络请求记录

### 3. filter_requests - 过滤请求

```yaml
name: filter_requests
arguments:
  win_id: 1
  pattern: __vid
```

**作用**: 过滤包含 `__vid` 的视频 URL

### 4. session_download_url - 下载文件

```yaml
name: session_download_url
arguments:
  win_id: 1
  url: <video_url>
  savePath: ~/Desktop/video/7594434780347813155.mp4
```

**作用**: 下载视频到指定路径

## 配置选项

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MCP_PORT` | 8101 | electron-mcp 服务端口 |
| `WIN_ID` | 1 | 窗口 ID |
| `DOWNLOAD_DIR` | ~/Desktop/video | 下载目录 |

### 脚本内配置

编辑 `download-douyin-video.sh` 修改：

```bash
# 等待页面加载时间（秒）
sleep 5  # 可根据网络情况调整

# 视频 URL 匹配模式
grep -oP 'https?://[^"]*__vid[^"]*'
```

## 故障排查

### 常见问题

#### 1. electron-mcp 服务未运行

**症状**: 
```
[ERROR] electron-mcp 服务未运行，请先启动服务
```

**解决方法**:
```bash
# 检查服务状态
curl http://localhost:8101/mcp

# 启动服务
npm start -- --port=8101

# 或使用 service.sh
./service.sh start
```

#### 2. 未找到视频下载地址

**症状**:
```
[ERROR] 未找到视频下载地址
```

**可能原因**:
1. 页面加载未完成
2. 视频需要登录
3. 网络请求被拦截
4. 页面结构变化

**解决方法**:

**方法1: 增加等待时间**
```bash
# 编辑脚本，修改 sleep 时间
sleep 10  # 从 5 秒增加到 10 秒
```

**方法2: 使用已登录账户**
```bash
# 先在浏览器中登录抖音
# 然后使用相同的窗口 ID
WIN_ID=1 bash skills/download-douyin-video/download-douyin-video.sh <url>
```

**方法3: 手动检查网络请求**
```bash
# 使用 curl-rpc 手动查看请求
bin/curl-mcp "tools/call" "
name: get_requests
arguments:
  win_id: 1
"
```

#### 3. 下载失败

**症状**:
```
[ERROR] 下载失败
```

**检查步骤**:

1. **验证视频 URL**
   ```bash
   # 检查 URL 是否有效
   curl -I "<video_url>"
   ```

2. **检查磁盘空间**
   ```bash
   df -h ~/Desktop/video
   ```

3. **查看详细日志**
   ```bash
   # 启用调试模式
   bash -x skills/download-douyin-video/download-douyin-video.sh <url>
   ```

#### 4. 权限问题

**症状**:
```
Permission denied
```

**解决方法**:
```bash
# 添加执行权限
chmod +x skills/download-douyin-video/download-douyin-video.sh

# 检查下载目录权限
ls -ld ~/Desktop/video
```

### 调试技巧

#### 1. 启用详细输出

```bash
# 使用 bash -x 查看执行过程
bash -x skills/download-douyin-video/download-douyin-video.sh <url>
```

#### 2. 手动测试 API 调用

```bash
# 测试 open_window
bin/curl-mcp "tools/call" "
name: open_window
arguments:
  url: https://www.douyin.com/video/7594434780347813155
"

# 测试 get_requests
bin/curl-mcp "tools/call" "
name: get_requests
arguments:
  win_id: 1
"
```

#### 3. 检查 electron-mcp 日志

```bash
# 查看服务日志
tail -f ~/logs/electron-mcp-8101.log
```

## 高级用法

### 批量下载

创建批量下载脚本：

```bash
#!/bin/bash
# batch-download.sh

URLS=(
  "https://www.douyin.com/video/7594434780347813155"
  "https://www.douyin.com/video/7594434780347813156"
  "https://www.douyin.com/video/7594434780347813157"
)

for url in "${URLS[@]}"; do
  echo "下载: $url"
  bash skills/download-douyin-video/download-douyin-video.sh "$url"
  sleep 3  # 避免请求过快
done
```

### 自定义文件名

修改脚本中的文件名生成逻辑：

```bash
# 使用时间戳
OUTPUT_FILE="$DOWNLOAD_DIR/$(date +%Y%m%d_%H%M%S)_${VIDEO_ID}.mp4"

# 使用自定义前缀
OUTPUT_FILE="$DOWNLOAD_DIR/douyin_${VIDEO_ID}.mp4"
```

### 集成到其他工具

#### 作为 npm script

在 `package.json` 中添加：

```json
{
  "scripts": {
    "download-douyin": "bash skills/download-douyin-video/download-douyin-video.sh"
  }
}
```

使用：
```bash
npm run download-douyin -- https://www.douyin.com/video/7594434780347813155
```

#### 作为 Git Hook

在 `.git/hooks/post-commit` 中添加：

```bash
#!/bin/bash
# 自动下载提交信息中的抖音视频

DOUYIN_URLS=$(git log -1 --pretty=%B | grep -oP 'https://www\.douyin\.com/video/[0-9]+')

for url in $DOUYIN_URLS; do
  bash skills/download-douyin-video/download-douyin-video.sh "$url"
done
```

## 测试

### 运行测试套件

```bash
bash skills/download-douyin-video/tests/test-download.sh
```

### 测试覆盖

- ✅ 脚本文件存在性
- ✅ 脚本可执行权限
- ✅ 无参数调用显示帮助
- ✅ 无效 URL 检测
- ✅ electron-mcp 服务状态检查
- ✅ 完整下载流程

## 性能优化

### 1. 减少等待时间

使用 `get_window_info` 检查 `dom-ready` 状态：

```bash
# 替代固定 sleep
while true; do
  INFO=$(bin/curl-mcp "tools/call" "name: get_window_info, arguments: {win_id: 1}")
  if echo "$INFO" | grep -q '"dom-ready": true'; then
    break
  fi
  sleep 1
done
```

### 2. 并行下载

使用 GNU Parallel：

```bash
parallel -j 3 bash skills/download-douyin-video/download-douyin-video.sh ::: \
  https://www.douyin.com/video/1 \
  https://www.douyin.com/video/2 \
  https://www.douyin.com/video/3
```

## 安全注意事项

1. **不要分享认证 token**
   ```bash
   # token 文件应该保密
   chmod 600 ~/electron-mcp-token.txt
   ```

2. **验证下载内容**
   ```bash
   # 检查文件类型
   file ~/Desktop/video/*.mp4
   ```

3. **遵守版权法律**
   - 仅下载个人使用的视频
   - 不要分发他人版权内容

## 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发环境

```bash
# 克隆项目
git clone <repo>

# 安装依赖
npm install

# 运行测试
bash skills/download-douyin-video/tests/test-download.sh
```

## 许可证

MIT License

## 相关资源

- [electron-mcp 文档](../../README.md)
- [curl-mcp 工具](../../bin/curl-mcp)
- [MCP 协议规范](https://modelcontextprotocol.io/)
