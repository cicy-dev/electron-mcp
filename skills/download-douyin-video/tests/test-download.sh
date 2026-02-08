#!/bin/bash
# test-download.sh - 测试抖音视频下载功能

set +e  # 允许测试失败继续执行

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_SCRIPT="$SCRIPT_DIR/../download-douyin-video.sh"
TEST_URL="https://www.douyin.com/video/7594434780347813155"
TEST_VIDEO_ID="7594434780347813155"
DOWNLOAD_DIR="$HOME/Desktop/video"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[TEST]${NC} $1"; }
log_error() { echo -e "${RED}[TEST]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[TEST]${NC} $1"; }

# 测试计数
TESTS_PASSED=0
TESTS_FAILED=0

# 测试函数
test_case() {
    local test_name="$1"
    log_info "运行测试: $test_name"
}

pass() {
    log_info "✅ PASS: $1"
    ((TESTS_PASSED++))
}

fail() {
    log_error "❌ FAIL: $1"
    ((TESTS_FAILED++))
}

# 测试1: 脚本存在性
test_case "脚本文件存在"
if [ -f "$SKILL_SCRIPT" ]; then
    pass "脚本文件存在"
else
    fail "脚本文件不存在: $SKILL_SCRIPT"
    exit 1
fi

# 测试2: 脚本可执行
test_case "脚本可执行权限"
if [ -x "$SKILL_SCRIPT" ]; then
    pass "脚本具有执行权限"
else
    fail "脚本没有执行权限"
    exit 1
fi

# 测试3: 无参数调用（应显示帮助）
test_case "无参数调用显示帮助"
if "$SKILL_SCRIPT" 2>&1 | grep -q "使用方法"; then
    pass "无参数调用正确显示帮助信息"
else
    fail "无参数调用未显示帮助信息"
fi

# 测试4: 无效 URL 检测
test_case "无效 URL 检测"
if "$SKILL_SCRIPT" "https://invalid-url.com" 2>&1 | grep -q "无效的抖音视频 URL"; then
    pass "正确检测无效 URL"
else
    fail "未能检测无效 URL"
fi

# 测试5: electron-mcp 服务检查
test_case "electron-mcp 服务状态检查"
if curl -s "http://localhost:8101/mcp" > /dev/null 2>&1; then
    pass "electron-mcp 服务正在运行"
    
    # 测试6: 完整下载流程（仅在服务运行时）
    test_case "完整下载流程"
    log_warn "开始完整下载测试，这可能需要一些时间..."
    
    # 清理旧文件
    rm -f "$DOWNLOAD_DIR/${TEST_VIDEO_ID}.mp4"
    
    if "$SKILL_SCRIPT" "$TEST_URL"; then
        if [ -f "$DOWNLOAD_DIR/${TEST_VIDEO_ID}.mp4" ]; then
            FILE_SIZE=$(stat -f%z "$DOWNLOAD_DIR/${TEST_VIDEO_ID}.mp4" 2>/dev/null || stat -c%s "$DOWNLOAD_DIR/${TEST_VIDEO_ID}.mp4" 2>/dev/null)
            if [ "$FILE_SIZE" -gt 0 ]; then
                pass "视频下载成功，文件大小: $FILE_SIZE 字节"
            else
                fail "视频文件为空"
            fi
        else
            fail "视频文件未创建"
        fi
    else
        fail "下载脚本执行失败"
    fi
else
    log_warn "electron-mcp 服务未运行，跳过完整下载测试"
    log_warn "启动服务: npm start -- --port=8101"
fi

# 测试总结
echo ""
log_info "=========================================="
log_info "测试总结"
log_info "=========================================="
log_info "通过: $TESTS_PASSED"
log_info "失败: $TESTS_FAILED"
log_info "=========================================="

if [ $TESTS_FAILED -eq 0 ]; then
    log_info "✅ 所有测试通过！"
    exit 0
else
    log_error "❌ 有 $TESTS_FAILED 个测试失败"
    exit 1
fi
