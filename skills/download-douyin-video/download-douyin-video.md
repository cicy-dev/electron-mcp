# 抖音视频下载技能 - 详细文档

## 概述

这是一个基于 electron-mcp 的抖音视频下载技能，通过浏览器自动化捕获视频真实地址并下载到本地。

## 技术架构

### 核心组件

1. **electron-mcp 服务器**
   - 提供浏览器自动化能力
   - 网络请求监控
   - 文件下载功能

2. **curl-rpc 客户端**
   - 调用 MCP 工具的命令行接口
   - 支持 YAML 格式（节省 token）

3. **下载脚本**
   - Bash 脚本实现
   - 完整的错误处理
   - 彩色日志输出

### 工作流程

```
用户输入抖音URL
    ↓
检查依赖和服务状态
    ↓
打开浏览器窗口加载视频页面
    ↓
等待页面加载（默认8秒）
    ↓
捕获网络请求（过滤 __vid）
    ↓
提取视频真实地址
    ↓
调用 session_download_url 下载
    ↓
保存到 ~/Desktop/video/{video_id}.mp4
```

## 使用方法

### 基本用法

```bash
bash skills/download-douyin-video/download-douyin-video.sh <douyin_url>
```

### 示例

```bash
# 下载单个视频
bash skills/download-douyin-video/download-douyin-video.sh \
  https://www.douyin.com/video/7594434780347813155

# 自定义配置
ELECTRON_MCP_URL=http://localhost:8102 \
DOWNLOAD_DIR=~/Downloads \
WAIT_TIME=10 \
bash skills/download-douyin-video/download-douyin-video.sh \
  https://www.douyin.com/video/7594434780347813155
```

## 配置选项

### 环境变量

| 变量 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `ELECTRON_MCP_URL` | string | `http://localhost:8101` | MCP 服务器地址 |
| `DOWNLOAD_DIR` | path | `~/Desktop/video` | 视频保存目录 |
| `WAIT_TIME` | integer | `8` | 页面加载等待时间（秒） |

### 调优建议

**网络较慢时：**
```bash
WAIT_TIME=15 bash download-douyin-video.sh <url>
```

**批量下载时：**
```bash
# 使用独立窗口避免干扰
for url in $(cat urls.txt); do
  bash download-douyin-video.sh "$url"
  sleep 2
done
```

## 依赖项

### 必需依赖

1. **electron-mcp 服务**
   ```bash
   cd /path/to/electron-mcp
   npm start
   ```

2. **jq** - JSON 处理工具
   ```bash
   # Ubuntu/Debian
   sudo apt-get install jq
   
   # macOS
   brew install jq
   
   # CentOS/RHEL
   sudo yum install jq
   ```

3. **curl** - HTTP 客户端（通常已预装）

### 可选依赖

- **yq** - YAML 处理（curl-rpc 使用）
  ```bash
  pip install yq --break-system-packages
  ```

## 测试

### 运行测试套件

```bash
bash skills/download-douyin-video/tests/test-download.sh
```

### 测试内容

1. ✅ 脚本文件存在性检查
2. ✅ 帮助信息显示测试
3. ✅ 依赖项检查（jq）
4. ✅ curl-rpc 可用性检查
5. ✅ electron-mcp 服务状态检查
6. 📝 实际下载测试（需手动执行）

### 手动测试

```bash
# 测试完整流程
bash skills/download-douyin-video/download-douyin-video.sh \
  https://www.douyin.com/video/7594434780347813155

# 检查下载结果
ls -lh ~/Desktop/video/
```

## 故障排查

### 常见问题

#### 1. "electron-mcp service is not running"

**原因：** MCP 服务未启动

**解决：**
```bash
cd /path/to/electron-mcp
npm start
```

**验证：**
```bash
curl http://localhost:8101/mcp
```

#### 2. "No video URL found with __vid pattern"

**原因：**
- 页面加载时间不足
- 网络请求被拦截
- 视频 URL 格式变化

**解决：**
```bash
# 增加等待时间
WAIT_TIME=15 bash download-douyin-video.sh <url>

# 检查网络请求
bash bin/curl-rpc "tools/call" "
name: get_requests
arguments:
  win_id: 1
"
```

#### 3. "jq is required but not installed"

**原因：** 缺少 jq 工具

**解决：**
```bash
sudo apt-get install jq  # Ubuntu/Debian
brew install jq          # macOS
```

#### 4. "Download failed: file not found"

**原因：**
- 磁盘空间不足
- 目录权限问题
- 下载被中断

**解决：**
```bash
# 检查磁盘空间
df -h ~/Desktop/video

# 检查目录权限
ls -ld ~/Desktop/video

# 手动创建目录
mkdir -p ~/Desktop/video
chmod 755 ~/Desktop/video
```

### 调试模式

```bash
# 启用详细日志
set -x
bash skills/download-douyin-video/download-douyin-video.sh <url>
set +x

# 检查 electron-mcp 日志
tail -f ~/logs/electron-mcp-8101.log
```

## 技术细节

### 视频 URL 捕获

抖音视频的真实地址包含 `__vid` 参数，格式如：
```
https://v3-web.douyinvod.com/xxx/__vid:xxx
```

脚本通过以下步骤捕获：

1. 调用 `filter_requests` 过滤包含 `__vid` 的请求
2. 使用 jq 解析 JSON 响应
3. 提取第一个匹配的 URL

### 下载机制

使用 electron-mcp 的 `session_download_url` 工具：

```yaml
name: session_download_url
arguments:
  win_id: 1
  url: <video_url>
  savePath: ~/Desktop/video/{video_id}.mp4
```

**优势：**
- 复用浏览器会话（保持 Cookie）
- 支持大文件下载
- 自动处理重定向

### 错误处理

脚本实现了完整的错误处理：

```bash
set -e  # 遇到错误立即退出

# 检查命令执行结果
if echo "$result" | grep -q "error"; then
    log_error "Operation failed"
    exit 1
fi

# 验证文件存在
if [ -f "$save_path" ]; then
    log_info "Success"
else
    log_error "File not found"
    exit 1
fi
```

## 性能优化

### 并发下载

```bash
# 使用 GNU parallel
cat urls.txt | parallel -j 3 bash download-douyin-video.sh {}

# 或使用后台任务
for url in $(cat urls.txt); do
  bash download-douyin-video.sh "$url" &
  sleep 2  # 避免同时启动过多
done
wait
```

### 资源使用

- **内存：** ~200MB（Electron 窗口）
- **CPU：** 低（主要等待网络）
- **磁盘：** 视频大小（通常 5-50MB）

## 扩展开发

### 添加新功能

1. **批量下载支持**
   ```bash
   # 读取 URL 列表
   while IFS= read -r url; do
     bash download-douyin-video.sh "$url"
   done < urls.txt
   ```

2. **自定义文件名**
   ```bash
   # 修改 download_video 函数
   local save_path="$DOWNLOAD_DIR/${custom_name}.mp4"
   ```

3. **进度显示**
   ```bash
   # 监控下载进度
   watch -n 1 'ls -lh ~/Desktop/video/'
   ```

### 集成到其他项目

```bash
# 作为库使用
source skills/download-douyin-video/download-douyin-video.sh

# 调用函数
download_video "$video_url" "$video_id"
```

## 安全考虑

1. **URL 验证**
   - 仅支持 douyin.com 域名
   - 防止任意 URL 注入

2. **路径安全**
   - 使用绝对路径
   - 验证目录权限

3. **资源限制**
   - 限制并发下载数
   - 设置超时时间

## 许可证

MIT License - 与 electron-mcp 项目保持一致

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.0.0 (2026-02-09)
- ✨ 初始版本
- ✅ 基本下载功能
- ✅ 错误处理
- ✅ 测试套件
- 📝 完整文档
