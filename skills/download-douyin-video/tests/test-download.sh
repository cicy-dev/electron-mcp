#!/bin/bash

# 测试抖音视频下载功能

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DOWNLOAD_SCRIPT="$SCRIPT_DIR/download-douyin-video.sh"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "================================"
echo "Douyin Video Download Test"
echo "================================"
echo ""

# 测试1：检查脚本存在
echo "Test 1: Check script exists"
if [ -f "$DOWNLOAD_SCRIPT" ]; then
    echo -e "${GREEN}✓ Script found${NC}"
else
    echo -e "${RED}✗ Script not found${NC}"
    exit 1
fi

# 测试2：检查帮助信息
echo ""
echo "Test 2: Check help message"
if bash "$DOWNLOAD_SCRIPT" 2>&1 | grep -q "Usage"; then
    echo -e "${GREEN}✓ Help message works${NC}"
else
    echo -e "${RED}✗ Help message failed${NC}"
    exit 1
fi

# 测试3：检查依赖
echo ""
echo "Test 3: Check dependencies"
if command -v jq &> /dev/null; then
    echo -e "${GREEN}✓ jq is installed${NC}"
else
    echo -e "${RED}✗ jq is not installed${NC}"
    exit 1
fi

# 测试4：检查 curl-rpc
echo ""
echo "Test 4: Check curl-rpc"
CURL_RPC="$(cd "$SCRIPT_DIR/../curl-rpc" && pwd)/curl-rpc"
if [ -f "$CURL_RPC" ]; then
    echo -e "${GREEN}✓ curl-rpc found${NC}"
else
    echo -e "${RED}✗ curl-rpc not found at $CURL_RPC${NC}"
    exit 1
fi

# 测试5：检查 electron-mcp 服务（可选）
echo ""
echo "Test 5: Check electron-mcp service (optional)"
ELECTRON_MCP_URL="${ELECTRON_MCP_URL:-http://localhost:8101}"
if curl -s "$ELECTRON_MCP_URL/mcp" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ electron-mcp service is running${NC}"
    
    # 如果服务运行，可以进行实际下载测试
    echo ""
    echo "Test 6: Real download test (optional)"
    echo "To test with a real video, run:"
    echo "  bash $DOWNLOAD_SCRIPT https://www.douyin.com/video/7594434780347813155"
else
    echo -e "${RED}✗ electron-mcp service is not running${NC}"
    echo "  Start with: npm start"
    echo "  Skipping real download test"
fi

echo ""
echo "================================"
echo -e "${GREEN}All basic tests passed!${NC}"
echo "================================"
