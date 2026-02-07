#!/bin/bash
# 快速创建新 Skill

if [ -z "$1" ]; then
    echo "用法: $0 <skill-name>"
    echo "示例: $0 my-skill"
    exit 1
fi

SKILL_NAME=$1
TEMPLATE_DIR="/home/w3c_offical/Desktop/branch/electron-mcp-feat-20260207-aistudio-skill/skill/template-rpc"
TARGET_DIR="/home/w3c_offical/Desktop/branch/electron-mcp-feat-20260207-aistudio-skill/skill/$SKILL_NAME"

if [ -d "$TARGET_DIR" ]; then
    echo "❌ Skill '$SKILL_NAME' 已存在"
    exit 1
fi

echo "🚀 创建新 Skill: $SKILL_NAME"

# 复制模板
cp -r "$TEMPLATE_DIR" "$TARGET_DIR"

# 更新 package.json
cd "$TARGET_DIR"
sed -i "s/electron-mcp-skill-template/electron-mcp-skill-$SKILL_NAME/g" package.json

# 安装依赖
echo "📦 安装依赖..."
npm install > /dev/null 2>&1

echo ""
echo "✅ Skill 创建成功！"
echo ""
echo "📋 下一步："
echo "  cd skill/$SKILL_NAME"
echo "  npm test          # 运行测试"
echo "  node example.js   # 运行示例"
echo ""
echo "📝 开始开发："
echo "  1. 编辑 tools/template-tools.js"
echo "  2. 编辑 tests/template.test.js"
echo "  3. 运行 npm test"
