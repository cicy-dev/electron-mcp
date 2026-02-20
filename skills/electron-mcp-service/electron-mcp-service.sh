#!/bin/bash
# Electron MCP 后台启动脚本

COMMAND=${1:-start}
PORT=${2:-8101}
DISPLAY_NUM=${3:-:1}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/tmp/electron-mcp-${PORT}.log"
PID_FILE="/tmp/electron-mcp-${PORT}.pid"

start() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p $pid > /dev/null 2>&1; then
            echo "✅ 服务已在运行 (PID: $pid, 端口: $PORT, DISPLAY: $DISPLAY_NUM)"
            return 0
        fi
    fi

    echo "🚀 启动服务 (端口: $PORT, DISPLAY: $DISPLAY_NUM)..."
    
    cd "$SCRIPT_DIR"
    DISPLAY=$DISPLAY_NUM PORT=$PORT npm start -- --one-window > "$LOG_FILE" 2>&1 &
    local pid=$!
    echo $pid > "$PID_FILE"
    
    sleep 5
    
    if curl -s --max-time 3 http://localhost:${PORT}/ping > /dev/null 2>&1; then
        echo "✅ 服务启动成功 (PID: $pid)"
        echo "📋 日志: tail -f $LOG_FILE"
    else
        echo "⚠️  服务启动中，请稍候..."
        echo "📋 日志: tail -f $LOG_FILE"
    fi
}

stop() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        echo "🛑 停止服务 (PID: $pid)..."
        kill $pid 2>/dev/null || true
        rm -f "$PID_FILE"
    fi
    
    lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
    echo "✅ 服务已停止"
}

status() {
    echo "========================================="
    echo "📊 服务状态 (端口 $PORT)"
    echo "========================================="
    
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p $pid > /dev/null 2>&1; then
            echo "✅ 进程: 运行中 (PID: $pid)"
        else
            echo "❌ 进程: 已停止"
        fi
    else
        echo "❌ 进程: 未启动"
    fi
    
    if curl -s --max-time 3 http://localhost:${PORT}/ping > /dev/null 2>&1; then
        echo "✅ 服务: 正常响应"
    else
        echo "❌ 服务: 无响应"
    fi
    
    echo ""
    echo "📋 日志文件: $LOG_FILE"
    if [ -f "$LOG_FILE" ]; then
        echo "📋 最近日志:"
        tail -5 "$LOG_FILE" | sed 's/^/  /'
    fi
}

logs() {
    tail -f "$LOG_FILE"
}

case "$COMMAND" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        stop
        sleep 2
        start
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    *)
        echo "用法: $0 {start|stop|restart|status|logs} [port] [display]"
        echo ""
        echo "示例:"
        echo "  $0 start              # 启动服务 (默认端口 8101, DISPLAY :2)"
        echo "  $0 start 8102         # 启动服务 (端口 8102, DISPLAY :2)"
        echo "  $0 start 8102 :1      # 启动服务 (端口 8102, DISPLAY :1)"
        echo "  $0 status             # 查看状态"
        echo "  $0 logs               # 查看日志"
        echo "  $0 restart            # 重启服务"
        echo "  $0 stop               # 停止服务"
        exit 1
        ;;
esac
