#!/bin/bash
# download-douyin-video.sh - 抖音视频下载工具
# 使用 electron-mcp 服务器自动下载抖音视频

set -e

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CURL_RPC="$PROJECT_ROOT/bin/curl-mcp"
DOWNLOAD_DIR="$HOME/Desktop/video"
MCP_PORT="${MCP_PORT:-8101}"
WIN_ID="${WIN_ID:-1}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 使用说明
usage() {
    cat << EOF
使用方法: $0 <douyin_url>

参数:
  douyin_url    抖音视频 URL (如: https://www.douyin.com/video/7594434780347813155)

环境变量:
  MCP_PORT      electron-mcp 服务端口 (默认: 8101)
  WIN_ID        窗口 ID (默认: 1)
  DOWNLOAD_DIR  下载目录 (默认: ~/Desktop/video)

示例:
  $0 https://www.douyin.com/video/7594434780347813155
  MCP_PORT=8102 $0 https://www.douyin.com/video/7594434780347813155

EOF
    exit 1
}

# 检查参数
if [ $# -eq 0 ]; then
    log_error "缺少抖音视频 URL"
    usage
fi

DOUYIN_URL="$1"

# 验证 URL 格式
if [[ ! "$DOUYIN_URL" =~ ^https?://.*douyin\.com/video/[0-9]+ ]]; then
    log_error "无效的抖音视频 URL: $DOUYIN_URL"
    exit 1
fi

# 提取视频 ID
VIDEO_ID=$(echo "$DOUYIN_URL" | grep -oP 'video/\K[0-9]+')
log_info "视频 ID: $VIDEO_ID"

# 检查 curl-rpc 工具
if [ ! -f "$CURL_RPC" ]; then
    log_error "curl-rpc 工具不存在: $CURL_RPC"
    exit 1
fi

# 检查 electron-mcp 服务
log_info "检查 electron-mcp 服务 (端口 $MCP_PORT)..."
if ! curl -s "http://localhost:$MCP_PORT/mcp" > /dev/null 2>&1; then
    log_error "electron-mcp 服务未运行，请先启动服务"
    log_info "启动命令: npm start -- --port=$MCP_PORT"
    exit 1
fi

# 创建下载目录
mkdir -p "$DOWNLOAD_DIR"

# 步骤1: 打开窗口加载 URL
log_info "步骤1: 打开抖音视频页面..."
OPEN_RESULT=$("$CURL_RPC" "tools/call" "
name: open_window
arguments:
  url: $DOUYIN_URL
  reuseWindow: true
" 2>&1)

if echo "$OPEN_RESULT" | grep -q "error"; then
    log_error "打开窗口失败: $OPEN_RESULT"
    exit 1
fi

log_info "页面已打开，等待加载..."
sleep 5

# 步骤2: 获取网络请求
log_info "步骤2: 捕获网络请求..."
REQUESTS_RESULT=$("$CURL_RPC" "tools/call" "
name: get_requests
arguments:
  win_id: $WIN_ID
" 2>&1)

# 步骤3: 过滤包含 __vid 的视频 URL
log_info "步骤3: 查找视频下载地址..."
VIDEO_URL=$(echo "$REQUESTS_RESULT" | grep -oP 'https?://[^"]*__vid[^"]*' | head -1)

if [ -z "$VIDEO_URL" ]; then
    log_warn "未找到包含 __vid 的视频 URL，尝试使用 filter_requests..."
    
    FILTER_RESULT=$("$CURL_RPC" "tools/call" "
name: filter_requests
arguments:
  win_id: $WIN_ID
  pattern: __vid
" 2>&1)
    
    VIDEO_URL=$(echo "$FILTER_RESULT" | grep -oP 'https?://[^"]*__vid[^"]*' | head -1)
fi

if [ -z "$VIDEO_URL" ]; then
    log_error "未找到视频下载地址"
    log_info "可能原因："
    log_info "  1. 页面加载未完成，请增加等待时间"
    log_info "  2. 视频需要登录才能访问"
    log_info "  3. 抖音页面结构已变化"
    exit 1
fi

log_info "找到视频 URL: ${VIDEO_URL:0:80}..."

# 步骤4: 下载视频
OUTPUT_FILE="$DOWNLOAD_DIR/${VIDEO_ID}.mp4"
log_info "步骤4: 下载视频到 $OUTPUT_FILE..."

DOWNLOAD_RESULT=$("$CURL_RPC" "tools/call" "
name: session_download_url
arguments:
  win_id: $WIN_ID
  url: $VIDEO_URL
  savePath: $OUTPUT_FILE
" 2>&1)

if echo "$DOWNLOAD_RESULT" | grep -q "error"; then
    log_error "下载失败: $DOWNLOAD_RESULT"
    exit 1
fi

# 验证文件
if [ -f "$OUTPUT_FILE" ]; then
    FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    log_info "✅ 下载成功！"
    log_info "文件路径: $OUTPUT_FILE"
    log_info "文件大小: $FILE_SIZE"
else
    log_error "下载失败，文件不存在: $OUTPUT_FILE"
    exit 1
fi
