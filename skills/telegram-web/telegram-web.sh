#!/bin/bash
# Telegram Web 自动化脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 默认配置
TELEGRAM_URL="https://web.telegram.org/k/"
WIN_ID=""

# 显示帮助
show_help() {
    cat << EOF
Telegram Web 自动化工具

用途：
  自动化操作 Telegram Web 版

使用方法：
  $0 open                    # 打开 Telegram Web
  $0 login                   # 登录指南
  $0 qrcode                  # 获取登录二维码（远程使用）
  $0 account                 # 获取当前账户信息
  $0 chats                   # 获取聊天列表
  $0 chatid <chat>           # 获取聊天 ID
  $0 users [limit]           # 从 IndexedDB 获取用户列表
  $0 db_chats [limit]        # 从 IndexedDB 获取聊天数据
  $0 db_messages [limit]     # 从 IndexedDB 获取消息
  
  添加 --detail 参数显示完整数据：
  $0 users 10 --detail       # 显示完整用户数据
  $0 db_chats 10 --detail    # 显示完整聊天数据
  $0 db_messages 20 --detail # 显示完整消息数据
  $0 create_bot <name> <username>  # 创建新 bot 并获取 token
  $0 get_messages <chat_id> [limit]  # 从 IndexedDB 获取消息
  $0 send <chat> <message>   # 发送消息
  $0 read <chat>             # 读取消息
  $0 --help                  # 显示帮助

示例：
  $0 open
  $0 qrcode                  # 获取二维码截图
  $0 chats                   # 查看所有聊天
  $0 chatid "Saved Messages" # 获取聊天 ID
  $0 get_messages 123456789 50  # 获取 50 条消息
  $0 create_bot "My Bot" "my_test_bot"  # 创建 bot
  $0 send "Saved Messages" "Hello"
  $0 read "Saved Messages"

依赖：
  - curl-rpc (npm install -g curl-rpc)
  - electron-mcp 服务运行中
EOF
}

# 检查依赖
check_deps() {
    if ! command -v curl-rpc &> /dev/null; then
        echo "❌ Error: curl-rpc not found"
        echo "Install: npm install -g curl-rpc"
        exit 1
    fi
    
    if ! curl-rpc ping &> /dev/null; then
        echo "❌ Error: electron-mcp service not running"
        echo "Start: bash skills/electron-mcp-service/service.sh start"
        exit 1
    fi
}

# 登录指南
show_login_guide() {
    cat << EOF
📱 Telegram Web 登录指南

方法 1: 手机扫码登录（推荐）
  1. 打开 Telegram Web: bash $0 open
  2. 获取二维码: bash $0 qrcode
  3. 在手机 Telegram 中：
     - 打开 Settings（设置）
     - 点击 Devices（设备）
     - 点击 Link Desktop Device（连接桌面设备）
     - 扫描二维码（从截图或终端显示）
  4. 登录成功后即可使用

方法 2: 手机号登录
  1. 打开 Telegram Web: bash $0 open
  2. 点击 "Log in by phone Number"
  3. 输入手机号（带国家码，如 +86）
  4. 输入收到的验证码
  5. 如果启用了两步验证，输入密码

远程使用技巧：
  ⚡ 使用 qrcode 命令获取二维码截图
  ⚡ 二维码会保存到 ~/Desktop/screenshot/telegram-qrcode.png
  ⚡ 可以通过 VNC 查看并扫描

注意事项：
  ⚠️ 首次登录需要手动操作
  ⚠️ 登录后会话会保持，无需重复登录
  ⚠️ 建议使用扫码登录，更快更安全

检查登录状态：
  bash $0 open
  # 如果看到聊天列表，说明已登录
  # 如果看到登录页面，需要重新登录
EOF
}

# 获取二维码
get_qrcode() {
    # 获取窗口 ID
    if [ -f /tmp/telegram-web-win-id ]; then
        WIN_ID=$(cat /tmp/telegram-web-win-id)
    else
        echo "❌ Error: Telegram Web not opened"
        echo "Run: $0 open"
        exit 1
    fi
    
    echo "📸 Capturing QR code..."
    
    # 等待二维码加载
    sleep 3
    
    # 获取二维码元素位置
    result=$(curl-rpc exec_js win_id="$WIN_ID" code="
        const canvas = document.querySelector('canvas.qr-canvas');
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            JSON.stringify({
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
            });
        } else {
            'NOT_FOUND';
        }
    " 2>&1)
    
    if echo "$result" | grep -q "NOT_FOUND"; then
        echo "⚠️ QR code not found. You may already be logged in."
        echo "Or try: bash $0 open"
        exit 1
    fi
    
    # 截取整个窗口
    curl-rpc webpage_screenshot_and_to_clipboard win_id="$WIN_ID" > /dev/null 2>&1
    
    # 创建截图目录
    mkdir -p ~/Desktop/screenshot
    
    # 保存截图
    if command -v xclip &> /dev/null; then
        xclip -selection clipboard -t image/png -o > ~/Desktop/screenshot/telegram-qrcode.png 2>/dev/null
        echo "✅ QR code saved to: ~/Desktop/screenshot/telegram-qrcode.png"
        echo ""
        echo "📱 Scan with Telegram app:"
        echo "   Settings → Devices → Link Desktop Device"
        echo ""
        echo "🖼️ View image:"
        echo "   xdg-open ~/Desktop/screenshot/telegram-qrcode.png"
    else
        echo "✅ Screenshot taken (in clipboard)"
        echo "⚠️ Install xclip to save to file: apt install xclip"
    fi
    
    # 尝试在终端显示二维码（如果安装了 qrencode）
    if command -v qrencode &> /dev/null && command -v zbarimg &> /dev/null; then
        echo ""
        echo "🔍 Extracting QR code data..."
        qr_data=$(zbarimg -q --raw ~/Desktop/screenshot/telegram-qrcode.png 2>/dev/null || echo "")
        if [ -n "$qr_data" ]; then
            echo "📱 Scan this QR code:"
            echo "$qr_data" | qrencode -t ANSIUTF8
        fi
    fi
}

# 打开 Telegram Web
open_telegram() {
    echo "📱 Opening Telegram Web..."
    
    result=$(curl-rpc open_window url="$TELEGRAM_URL" 2>&1)
    
    if echo "$result" | grep -q "win_id"; then
        WIN_ID=$(echo "$result" | grep -oP 'win_id[": ]+\K\d+' | head -1)
        echo "✅ Opened in window $WIN_ID"
        echo "⏳ Waiting for page load..."
        sleep 5
        echo "$WIN_ID" > /tmp/telegram-web-win-id
    else
        echo "❌ Failed to open Telegram Web"
        exit 1
    fi
}

# 获取聊天列表
get_chats() {
    # 获取窗口 ID
    if [ -f /tmp/telegram-web-win-id ]; then
        WIN_ID=$(cat /tmp/telegram-web-win-id)
    else
        echo "❌ Error: Telegram Web not opened"
        echo "Run: $0 open"
        exit 1
    fi
    
    echo "📋 Chat list (top 20):"
    echo ""
    
    curl-rpc tools/call --json "{\"name\":\"exec_js\",\"arguments\":{\"win_id\":$WIN_ID,\"code\":\"Promise.all([getIndexedDBRows('tweb-account-1', 'dialogs', 20), getIndexedDBRows('tweb-account-1', 'users', 100), getIndexedDBRows('tweb-account-1', 'chats', 100)]).then(([dialogs, users, chats]) => JSON.stringify(dialogs.map(d => { const user = users.find(u => u.id === d.peerId); const chat = chats.find(c => c.id === Math.abs(d.peerId)); return { chatId: d.peerId, name: user ? (user.username || user.first_name) : (chat?.title || 'Unknown') }; }), null, 2))\"}}" 2>&1 | sed -n '/^---/,/^---/p' | sed '1d;$d'
}

# 获取当前账户信息
get_account() {
    # 获取窗口 ID
    if [ -f /tmp/telegram-web-win-id ]; then
        WIN_ID=$(cat /tmp/telegram-web-win-id)
    else
        echo "❌ Error: Telegram Web not opened"
        echo "Run: $0 open"
        exit 1
    fi
    
    echo "👤 Current Account Info:"
    echo ""
    
    curl-rpc tools/call --json "{\"name\":\"exec_js\",\"arguments\":{\"win_id\":$WIN_ID,\"code\":\"JSON.stringify({ userId: JSON.parse(localStorage.getItem('user_auth') || '{}').id, accountId: 'tweb-account-1', dcId: JSON.parse(localStorage.getItem('user_auth') || '{}').dcID, date: new Date(JSON.parse(localStorage.getItem('user_auth') || '{}').date * 1000).toISOString() }, null, 2)\"}}" 2>&1 | sed -n '/^---/,/^---/p' | sed '1d;$d'
}

# 从 IndexedDB 获取用户列表
get_users() {
    local limit="${1:-10}"
    local detail="${2:-false}"
    
    # 获取窗口 ID
    if [ -f /tmp/telegram-web-win-id ]; then
        WIN_ID=$(cat /tmp/telegram-web-win-id)
    else
        echo "❌ Error: Telegram Web not opened"
        echo "Run: $0 open"
        exit 1
    fi
    
    echo "👥 Users from IndexedDB (limit: $limit):"
    echo ""
    
    if [ "$detail" = "--detail" ]; then
        curl-rpc tools/call --json "{\"name\":\"exec_js\",\"arguments\":{\"win_id\":$WIN_ID,\"code\":\"getIndexedDBRows('tweb-account-1', 'users', $limit).then(users => JSON.stringify(users, null, 2))\"}}" 2>&1 | sed -n '/^---/,/^---/p' | sed '1d;$d'
    else
        curl-rpc tools/call --json "{\"name\":\"exec_js\",\"arguments\":{\"win_id\":$WIN_ID,\"code\":\"getIndexedDBRows('tweb-account-1', 'users', $limit).then(users => JSON.stringify(users.map(u => ({ id: u.id, username: u.username, firstName: u.first_name, lastName: u.last_name })), null, 2))\"}}" 2>&1 | sed -n '/^---/,/^---/p' | sed '1d;$d'
    fi
}

# 从 IndexedDB 获取聊天数据
get_db_chats() {
    local limit="${1:-10}"
    local detail="${2:-false}"
    
    # 获取窗口 ID
    if [ -f /tmp/telegram-web-win-id ]; then
        WIN_ID=$(cat /tmp/telegram-web-win-id)
    else
        echo "❌ Error: Telegram Web not opened"
        echo "Run: $0 open"
        exit 1
    fi
    
    echo "💬 Chats from IndexedDB (limit: $limit):"
    echo ""
    
    if [ "$detail" = "--detail" ]; then
        curl-rpc tools/call --json "{\"name\":\"exec_js\",\"arguments\":{\"win_id\":$WIN_ID,\"code\":\"getIndexedDBRows('tweb-account-1', 'chats', $limit).then(chats => JSON.stringify(chats, null, 2))\"}}" 2>&1 | sed -n '/^---/,/^---/p' | sed '1d;$d'
    else
        curl-rpc tools/call --json "{\"name\":\"exec_js\",\"arguments\":{\"win_id\":$WIN_ID,\"code\":\"getIndexedDBRows('tweb-account-1', 'chats', $limit).then(chats => JSON.stringify(chats.map(c => ({ id: c.id, title: c.title, type: c._ })), null, 2))\"}}" 2>&1 | sed -n '/^---/,/^---/p' | sed '1d;$d'
    fi
}

# 从 IndexedDB 获取消息
get_db_messages() {
    local limit="${1:-20}"
    local detail="${2:-false}"
    
    # 获取窗口 ID
    if [ -f /tmp/telegram-web-win-id ]; then
        WIN_ID=$(cat /tmp/telegram-web-win-id)
    else
        echo "❌ Error: Telegram Web not opened"
        echo "Run: $0 open"
        exit 1
    fi
    
    echo "📨 Messages from IndexedDB (limit: $limit):"
    echo ""
    
    if [ "$detail" = "--detail" ]; then
        curl-rpc tools/call --json "{\"name\":\"exec_js\",\"arguments\":{\"win_id\":$WIN_ID,\"code\":\"getIndexedDBRows('tweb-account-1', 'messages', $limit).then(msgs => JSON.stringify(msgs, null, 2))\"}}" 2>&1 | sed -n '/^---/,/^---/p' | sed '1d;$d'
    else
        curl-rpc tools/call --json "{\"name\":\"exec_js\",\"arguments\":{\"win_id\":$WIN_ID,\"code\":\"getIndexedDBRows('tweb-account-1', 'messages', $limit).then(msgs => JSON.stringify(msgs.map(m => ({ id: m.id, message: m.message?.substring(0, 100), date: new Date(m.date * 1000).toISOString(), peerId: m.peerId })), null, 2))\"}}" 2>&1 | sed -n '/^---/,/^---/p' | sed '1d;$d'
    fi
}

# 获取聊天 ID
get_chat_id() {
    local chat="$1"
    
    if [ -z "$chat" ]; then
        echo "❌ Error: Missing chat name"
        echo "Usage: $0 chatid <chat>"
        exit 1
    fi
    
    # 获取窗口 ID
    if [ -f /tmp/telegram-web-win-id ]; then
        WIN_ID=$(cat /tmp/telegram-web-win-id)
    else
        echo "❌ Error: Telegram Web not opened"
        echo "Run: $0 open"
        exit 1
    fi
    
    echo "🔍 Getting chat ID for '$chat'..."
    
    # 点击搜索框
    curl-rpc tools/call --json "{\"name\":\"exec_js\",\"arguments\":{\"win_id\":$WIN_ID,\"code\":\"document.querySelector('input[type=\\\"search\\\"]')?.click()\"}}" > /dev/null 2>&1
    sleep 1
    
    # 清空搜索框
    curl-rpc cdp_press_selectall win_id="$WIN_ID" > /dev/null 2>&1
    
    # 输入聊天名称
    curl-rpc cdp_type_text win_id="$WIN_ID" text="$chat" > /dev/null
    sleep 2
    
    # 按回车选择
    curl-rpc cdp_press_enter win_id="$WIN_ID" > /dev/null
    sleep 3
    
    # 从 URL 获取 chat ID
    result=$(curl-rpc tools/call --json "{\"name\":\"exec_js\",\"arguments\":{\"win_id\":$WIN_ID,\"code\":\"window.location.hash.replace('#','')\"}}" 2>&1 | sed -n '/^---/,/^---/p' | sed '1d;$d' | tr -d '\n')
    
    if [ -n "$result" ] && [ "$result" != "null" ]; then
        echo "✅ Chat ID: $result"
    else
        echo "❌ Failed to get chat ID"
    fi
}

# 创建 bot 并获取 token
create_bot() {
    local bot_name="$1"
    local bot_username="$2"
    
    if [ -z "$bot_name" ] || [ -z "$bot_username" ]; then
        echo "❌ Error: Missing bot name or username"
        echo "Usage: $0 create_bot <name> <username>"
        exit 1
    fi
    
    # 获取窗口 ID
    if [ -f /tmp/telegram-web-win-id ]; then
        WIN_ID=$(cat /tmp/telegram-web-win-id)
    else
        echo "❌ Error: Telegram Web not opened"
        echo "Run: $0 open"
        exit 1
    fi
    
    echo "🤖 Creating bot: $bot_name (@$bot_username)..."
    
    # 打开 BotFather
    curl-rpc tools/call --json "{\"name\":\"exec_js\",\"arguments\":{\"win_id\":$WIN_ID,\"code\":\"document.querySelector('input[type=\\\"search\\\"]')?.click()\"}}" > /dev/null 2>&1
    sleep 1
    
    curl-rpc cdp_press_selectall win_id="$WIN_ID" > /dev/null 2>&1
    curl-rpc cdp_type_text win_id="$WIN_ID" text="BotFather" > /dev/null
    sleep 2
    curl-rpc cdp_press_enter win_id="$WIN_ID" > /dev/null
    sleep 2
    
    # 发送 /newbot
    curl-rpc cdp_type_text win_id="$WIN_ID" text="/newbot" > /dev/null
    sleep 1
    curl-rpc cdp_press_enter win_id="$WIN_ID" > /dev/null
    sleep 3
    
    # 输入 bot 名称
    curl-rpc cdp_type_text win_id="$WIN_ID" text="$bot_name" > /dev/null
    sleep 1
    curl-rpc cdp_press_enter win_id="$WIN_ID" > /dev/null
    sleep 3
    
    # 输入 bot username
    curl-rpc cdp_type_text win_id="$WIN_ID" text="$bot_username" > /dev/null
    sleep 1
    curl-rpc cdp_press_enter win_id="$WIN_ID" > /dev/null
    sleep 5
    
    # 提取 token
    curl-rpc cdp_scroll win_id="$WIN_ID" y=500 > /dev/null 2>&1
    sleep 2
    
    token=$(curl-rpc tools/call --json "{\"name\":\"exec_js\",\"arguments\":{\"win_id\":$WIN_ID,\"code\":\"Array.from(document.querySelectorAll('.bubble-content')).map(e=>e.innerText).join('\\\\n').match(/\\\\d{10}:[A-Za-z0-9_-]{35}/)?.[0] || 'not found'\"}}" 2>&1 | sed -n '/^---/,/^---/p' | sed '1d;$d' | tr -d '\n')
    
    if [ "$token" = "not found" ] || [ -z "$token" ]; then
        echo "❌ Failed to create bot. Username may be taken."
        echo "Try another username."
        exit 1
    fi
    
    echo "✅ Bot created successfully!"
    echo ""
    echo "Bot Name: $bot_name"
    echo "Username: @$bot_username"
    echo "Token: $token"
    echo ""
    echo "Token saved to: ~/telegram-bots/$bot_username.token"
    
    # 保存 token
    mkdir -p ~/telegram-bots
    echo "$token" > ~/telegram-bots/$bot_username.token
}

# 从 IndexedDB 获取消息
get_messages() {
    local chat_id="$1"
    local limit="${2:-50}"
    
    if [ -z "$chat_id" ]; then
        echo "❌ Error: Missing chat_id"
        echo "Usage: $0 get_messages <chat_id> [limit]"
        exit 1
    fi
    
    # 获取窗口 ID
    if [ -f /tmp/telegram-web-win-id ]; then
        WIN_ID=$(cat /tmp/telegram-web-win-id)
    else
        echo "❌ Error: Telegram Web not opened"
        echo "Run: $0 open"
        exit 1
    fi
    
    echo "📥 Getting messages from chat $chat_id (limit: $limit)..."
    echo ""
    
    curl-rpc tools/call --json "{\"name\":\"exec_js\",\"arguments\":{\"win_id\":$WIN_ID,\"code\":\"getIndexedDBRows('tweb-account-1', 'messages', 500).then(msgs => { const chatMsgs = msgs.filter(m => m.peerId === $chat_id).slice(-$limit); return JSON.stringify(chatMsgs.map(m => ({ id: m.id, message: m.message, date: new Date(m.date * 1000).toISOString(), fromId: m.fromId })), null, 2); })\"}}" 2>&1 | sed -n '/^---/,/^---/p' | sed '1d;$d'
}

# 发送消息
send_message() {
    local chat="$1"
    local message="$2"
    
    if [ -z "$chat" ] || [ -z "$message" ]; then
        echo "❌ Error: Missing chat or message"
        echo "Usage: $0 send <chat> <message>"
        exit 1
    fi
    
    # 获取窗口 ID
    if [ -f /tmp/telegram-web-win-id ]; then
        WIN_ID=$(cat /tmp/telegram-web-win-id)
    else
        echo "❌ Error: Telegram Web not opened"
        echo "Run: $0 open"
        exit 1
    fi
    
    echo "💬 Sending message to '$chat'..."
    
    # 点击搜索框
    curl-rpc exec_js win_id="$WIN_ID" code="document.querySelector('input[type=\"search\"]')?.click()" > /dev/null
    sleep 1
    
    # 输入聊天名称
    curl-rpc cdp_type_text win_id="$WIN_ID" text="$chat" > /dev/null
    sleep 2
    
    # 按回车选择
    curl-rpc cdp_press_enter win_id="$WIN_ID" > /dev/null
    sleep 1
    
    # 输入消息
    curl-rpc cdp_type_text win_id="$WIN_ID" text="$message" > /dev/null
    sleep 1
    
    # 发送
    curl-rpc cdp_press_enter win_id="$WIN_ID" > /dev/null
    
    echo "✅ Message sent"
}

# 读取消息
read_messages() {
    local chat="$1"
    
    if [ -z "$chat" ]; then
        echo "❌ Error: Missing chat name"
        echo "Usage: $0 read <chat>"
        exit 1
    fi
    
    # 获取窗口 ID
    if [ -f /tmp/telegram-web-win-id ]; then
        WIN_ID=$(cat /tmp/telegram-web-win-id)
    else
        echo "❌ Error: Telegram Web not opened"
        echo "Run: $0 open"
        exit 1
    fi
    
    echo "📖 Reading messages from '$chat'..."
    
    # 点击搜索框
    curl-rpc exec_js win_id="$WIN_ID" code="document.querySelector('input[type=\"search\"]')?.click()" > /dev/null
    sleep 1
    
    # 输入聊天名称
    curl-rpc cdp_type_text win_id="$WIN_ID" text="$chat" > /dev/null
    sleep 2
    
    # 按回车选择
    curl-rpc cdp_press_enter win_id="$WIN_ID" > /dev/null
    sleep 2
    
    # 读取最新消息
    curl-rpc exec_js win_id="$WIN_ID" code="
        Array.from(document.querySelectorAll('.message')).slice(-5).map(m => ({
            text: m.querySelector('.text-content')?.textContent,
            time: m.querySelector('.time')?.textContent
        }))
    "
}

# 主函数
main() {
    case "${1:-}" in
        open)
            check_deps
            open_telegram
            ;;
        login)
            show_login_guide
            ;;
        qrcode)
            check_deps
            get_qrcode
            ;;
        chats)
            check_deps
            get_chats
            ;;
        account)
            check_deps
            get_account
            ;;
        users)
            check_deps
            get_users "$2" "$3"
            ;;
        db_chats)
            check_deps
            get_db_chats "$2" "$3"
            ;;
        db_messages)
            check_deps
            get_db_messages "$2" "$3"
            ;;
        chatid)
            check_deps
            get_chat_id "$2"
            ;;
        create_bot)
            check_deps
            create_bot "$2" "$3"
            ;;
        get_messages)
            check_deps
            get_messages "$2" "$3"
            ;;
        send)
            check_deps
            send_message "$2" "$3"
            ;;
        read)
            check_deps
            read_messages "$2"
            ;;
        --help|-h)
            show_help
            ;;
        *)
            echo "❌ Error: Invalid command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"
