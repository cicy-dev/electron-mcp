# 任务：添加跨平台进程工具模块

## 需求描述

新增 `process-utils.js` 工具模块，提供跨平台的进程和端口管理功能：
- 异步杀死占用指定端口的进程
- 异步检查端口是否开放/被占用
- 兼容 Windows、macOS、Linux 三大平台

## 实现方案

### 1. 核心模块：`src/utils/process-utils.js`

**功能1：`async killPort(port)`**
- 检测操作系统类型 (`process.platform`)
- Linux/macOS: 使用 `lsof -ti:port | xargs kill -9`
- Windows: 使用 `netstat -ano | findstr :port` + `taskkill /F /PID`
- 返回格式: `{ success: boolean, message: string, pid?: number }`

**功能2：`async isPortOpen(port, host='localhost', timeout=1000)`**
- 使用 `net.createConnection()` 尝试连接端口
- 跨平台通用方案（无需系统命令）
- 返回: `boolean` (true=端口开放, false=端口关闭)

### 2. 单元测试：`tests/process-utils.test.js`

- 测试 `killPort()` 在不同平台的执行
- 测试 `isPortOpen()` 的准确性
- 测试错误处理（权限不足、端口不存在等）

### 3. GitHub Actions：`.github/workflows/test-process-utils.yml`

- 测试矩阵：ubuntu-latest, macos-latest, windows-latest
- Node.js 版本：18.x, 20.x
- 自动运行测试套件

### 4. 文档更新：`README.md`

- 添加工具说明和使用示例
- 添加 CI 徽章

## TODO 清单

- [x] 实现 `src/utils/process-utils.js`
  - [x] `killPort()` 函数（跨平台）
  - [x] `isPortOpen()` 函数
  - [x] 错误处理和日志
  - [x] JSDoc 注释
  - [x] 端口范围验证
- [x] 编写 `tests/process-utils.test.js`
  - [x] `killPort()` 测试用例
  - [x] `isPortOpen()` 测试用例
  - [x] 边界情况测试
- [x] 配置 `.github/workflows/test-process-utils.yml`
  - [x] 多平台测试矩阵
  - [x] 多 Node.js 版本测试
- [x] 更新 `README.md`
  - [x] 添加工具文档
  - [x] 添加使用示例
- [x] 本地测试验证
  - [x] 模块加载测试
  - [x] 功能验证测试
  - [x] 边界情况测试

## 验收标准

- [ ] `process-utils.js` 功能完整且跨平台兼容
- [ ] 所有单元测试通过
- [ ] GitHub Actions 配置正确
- [ ] 代码符合项目规范（CommonJS）
- [ ] 文档完整清晰
- [ ] 无 lint 错误

## 技术要点

- 使用 Node.js 内置模块（`child_process`, `net`, `util`）
- CommonJS 语法（`require()`, `module.exports`）
- 异步操作使用 `async/await`
- 错误处理使用 `try/catch`
- 遵循项目现有代码风格

---
**创建时间：2026-02-07**
**分支名称：feat/20260207-add-process-utils**
