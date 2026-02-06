#!/bin/bash

# 手动测试认证功能

TOKEN=$(cat ~/electron-mcp-token.txt)
PORT=8101

echo "=== 测试 1: 无 token 访问 /mcp ==="
curl -i http://localhost:$PORT/mcp 2>&1 | head -20
echo ""

echo "=== 测试 2: 错误 token 访问 /mcp ==="
curl -i -H "Authorization: Bearer wrong-token" http://localhost:$PORT/mcp 2>&1 | head -20
echo ""

echo "=== 测试 3: 正确 token 访问 /mcp ==="
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:$PORT/mcp 2>&1 | head -20
echo ""

echo "=== 测试 4: 无 token 访问 /messages ==="
curl -i -X POST http://localhost:$PORT/messages?sessionId=test 2>&1 | head -20
echo ""

echo "=== 测试 5: 正确 token 访问 /messages ==="
curl -i -X POST -H "Authorization: Bearer $TOKEN" http://localhost:$PORT/messages?sessionId=test 2>&1 | head -20
