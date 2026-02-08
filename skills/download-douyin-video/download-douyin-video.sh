#!/bin/bash

# 抖音视频下载脚本
# 使用 electron-mcp 服务器捕获并下载抖音视频

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 默认配置
ELECTRON_MCP_URL="${ELECTRON_MCP_URL:-http://localhost:8101}"
DOWNLOAD_DIR="${DOWNLOAD_DIR:-$HOME/Desktop/video}"
CURL_RPC="$(cd "$(dirname "$0")/../curl-rpc" && pwd)/curl-rpc"
WAIT_TIME="${WAIT_TIME:-8}"

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# 检查依赖
check_dependencies() {
    if [ ! -f "$CURL_RPC" ]; then
        log_error "curl-rpc not found at $CURL_RPC"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_error "jq is required but not installed"
        exit 1
    fi
}

# 检查 electron-mcp 服务状态
check_service() {
    log_info "Checking electron-mcp service..."
    if ! curl -s "$ELECTRON_MCP_URL/mcp" > /dev/null 2>&1; then
        log_error "electron-mcp service is not running at $ELECTRON_MCP_URL"
        log_error "Please start the service with: npm start"
        exit 1
    fi
    log_info "Service is running"
}

# 提取视频ID
extract_video_id() {
    local url="$1"
    echo "$url" | grep -oP 'video/\K[0-9]+' || echo "unknown"
}

# 打开抖音视频页面
open_video_page() {
    local url="$1"
    log_info "Opening video page: $url"
    
    local result
    result=$("$CURL_RPC" "tools/call" "
name: open_window
arguments:
  url: $url
  reuseWindow: true
" 2>&1)
    
    if echo "$result" | grep -q "error"; then
        log_error "Failed to open window"
        echo "$result" >&2
        exit 1
    fi
    
    log_info "Window opened, waiting ${WAIT_TIME}s for page to load..."
    sleep "$WAIT_TIME"
}

# 捕获视频URL
capture_video_url() {
    log_info "Capturing video URL from network requests..."
    
    local result
    result=$("$CURL_RPC" "tools/call" "
name: filter_requests
arguments:
  win_id: 1
  pattern: __vid
" 2>&1)
    
    if echo "$result" | grep -q "error"; then
        log_error "Failed to get network requests"
        echo "$result" >&2
        exit 1
    fi
    
    # 提取包含 __vid 的 URL
    local video_url
    video_url=$(echo "$result" | jq -r '.content[0].text' | jq -r '.[] | select(.url | contains("__vid")) | .url' | head -1)
    
    if [ -z "$video_url" ] || [ "$video_url" = "null" ]; then
        log_error "No video URL found with __vid pattern"
        log_warn "Try increasing WAIT_TIME or check if the page loaded correctly"
        exit 1
    fi
    
    log_info "Found video URL: ${video_url:0:80}..."
    echo "$video_url"
}

# 下载视频
download_video() {
    local video_url="$1"
    local video_id="$2"
    local save_path="$DOWNLOAD_DIR/${video_id}.mp4"
    
    mkdir -p "$DOWNLOAD_DIR"
    
    log_info "Downloading video to: $save_path"
    
    local result
    result=$("$CURL_RPC" "tools/call" "
name: session_download_url
arguments:
  win_id: 1
  url: $video_url
  savePath: $save_path
" 2>&1)
    
    if echo "$result" | grep -q "error"; then
        log_error "Failed to download video"
        echo "$result" >&2
        exit 1
    fi
    
    if [ -f "$save_path" ]; then
        local file_size
        file_size=$(du -h "$save_path" | cut -f1)
        log_info "Download complete! File size: $file_size"
        log_info "Saved to: $save_path"
    else
        log_error "Download failed: file not found"
        exit 1
    fi
}

# 主函数
main() {
    if [ $# -eq 0 ]; then
        echo "Usage: $0 <douyin_video_url>"
        echo ""
        echo "Example:"
        echo "  $0 https://www.douyin.com/video/7594434780347813155"
        echo ""
        echo "Environment variables:"
        echo "  ELECTRON_MCP_URL  - MCP server URL (default: http://localhost:8101)"
        echo "  DOWNLOAD_DIR      - Download directory (default: ~/Desktop/video)"
        echo "  WAIT_TIME         - Page load wait time in seconds (default: 8)"
        exit 1
    fi
    
    local douyin_url="$1"
    
    log_info "Starting Douyin video download..."
    log_info "URL: $douyin_url"
    
    # 检查依赖和服务
    check_dependencies
    check_service
    
    # 提取视频ID
    local video_id
    video_id=$(extract_video_id "$douyin_url")
    log_info "Video ID: $video_id"
    
    # 打开页面
    open_video_page "$douyin_url"
    
    # 捕获视频URL
    local video_url
    video_url=$(capture_video_url)
    
    # 下载视频
    download_video "$video_url" "$video_id"
    
    log_info "All done! ✨"
}

main "$@"
