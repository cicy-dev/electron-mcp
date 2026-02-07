#!/bin/bash
# Electron MCP 启动脚本 - 支持自定义端口

set -e

PORT=${1:-8101}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 启动 Electron MCP 服务"
echo "   端口: $PORT"
echo "   目录: $SCRIPT_DIR"
echo ""

# 检查端口是否被占用
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  端口 $PORT 已被占用"
    read -p "是否停止现有服务? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🛑 停止现有服务..."
        lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
        sleep 2
    else
        echo "❌ 取消启动"
        exit 1
    fi
fi

# 检查 DISPLAY
if [ -z "$DISPLAY" ]; then
    export DISPLAY=:1
    echo "📺 设置 DISPLAY=$DISPLAY"
fi

# 启动服务
cd "$SCRIPT_DIR"
echo "▶️  启动服务..."
DISPLAY=$DISPLAY PORT=$PORT npm start
