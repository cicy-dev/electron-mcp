---
inclusion: always
---

# Git 开发工作流程 - Git Development Workflow

## 新功能/Bug修复标准流程

当收到开发新功能或修复bug的请求时，严格遵循以下流程：

### 阶段1：需求分析
1. **用户提出需求**
2. **AI 制定可行方案**
   - 分析技术实现路径
   - 评估工作量和风险
   - 提出具体实现方案
3. **询问用户是否有补充**
4. **等待用户确认"开始"**

### 阶段2：环境准备（用户说"开始"后执行）
```bash
# 分支命名规范：
# - 新功能：feat/YYYYMMDD-功能简述
# - Bug修复：fix/YYYYMMDD-问题简述

# 1. 直接在工作目录克隆并创建分支
git clone ~/Desktop/projects/electron-mcp ~/Desktop/branch/electron-mcp-<branch-name>
cd ~/Desktop/branch/electron-mcp-<branch-name>
git fetch origin
git checkout -b <branch-name> origin/main

# 2. 安装依赖
npm install
```

### 阶段3：需求文档化
在工作目录创建 `task/task-<branch-name>.md` 文档，包含：

```markdown
# 任务：[功能/Bug简述]

## 需求描述
[用户原始需求]

## 实现方案
[技术方案详细说明]

## TODO 清单
- [ ] 任务1
- [ ] 任务2
- [ ] 任务3

## 验收标准
- [ ] 功能正常工作
- [ ] 所有测试通过
- [ ] 代码符合规范
- [ ] 文档已更新
```

### 阶段4：开发实现
```bash
# 在工作目录进行开发
cd ~/Desktop/branch/electron-mcp-<branch-name>

# 按照 TODO 清单逐项完成
# 实时更新 TASK.md 中的完成状态
```

### 阶段5：本地测试
```bash
# 运行完整测试套件
npm test

# 确保所有测试通过
# 验证所有验收标准
```

### 阶段6：提交和推送
```bash
# 提交更改
git add .
git commit -m "feat/fix: 简要描述更改内容"

# 推送到远程
git push origin <branch-name>
```

### 阶段7：创建 Pull Request
```bash
# 使用 GitHub CLI 创建 PR
gh pr create --base main --head <branch-name> --title "标题" --body "详细描述"

# 或手动在 GitHub 网页创建 PR
```

## 分支命名示例

### 新功能
- `feat/20260206-add-cdp-scroll`
- `feat/20260206-multi-account-support`
- `feat/20260206-network-monitor`

### Bug修复
- `fix/20260206-window-close-crash`
- `fix/20260206-screenshot-memory-leak`
- `fix/20260206-test-timeout`

## 工作目录结构
```
~/Desktop/
├── projects/
│   └── electron-mcp/              # 主仓库
└── branch/
    ├── electron-mcp-feat-20260206-feature1/
    ├── electron-mcp-fix-20260206-bug1/
    └── electron-mcp-feat-20260206-feature2/
```

## 核心原则
- ✅ 始终基于 `origin/main` 创建新分支
- ✅ 使用独立工作目录避免污染主仓库
- ✅ 本地测试必须全部通过才能提交
- ✅ 分支名称包含日期和清晰的功能/问题描述
- ✅ 提交信息遵循 conventional commits 规范

---
**制定时间：2026-02-06**
**适用项目：electron-mcp**
