const log = require("electron-log");
const path = require("path");

/**
 * 获取调用者信息（文件名:方法名:行号）
 */
function getCallerInfo() {
  const err = new Error();
  const stack = err.stack.split("\n");
  // stack[3] 是实际调用日志的位置
  const callerLine = stack[3] || "";
  const match = callerLine.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):\d+\)?$/);
  
  if (match) {
    const method = match[1] || "anonymous";
    const fullPath = match[2];
    const filename = path.basename(fullPath);
    const lineNum = match[3];
    return `${filename}:${method}:${lineNum}`;
  }
  return "";
}

/**
 * 统一日志工具
 * 提供 info, debug, error, warn 方法
 */
class Logger {
  constructor(module) {
    this.module = module;
  }

  info(message, ...args) {
    const caller = getCallerInfo();
    log.info(`[${this.module}] ${caller} ${message}`, ...args);
  }

  debug(message, ...args) {
    const caller = getCallerInfo();
    log.debug(`[${this.module}] ${caller} ${message}`, ...args);
  }

  error(message, error, ...args) {
    const caller = getCallerInfo();
    if (error instanceof Error) {
      log.error(`[${this.module}] ${caller} ${message}`, error.message, error.stack, ...args);
    } else {
      log.error(`[${this.module}] ${caller} ${message}`, error, ...args);
    }
  }

  warn(message, ...args) {
    const caller = getCallerInfo();
    log.warn(`[${this.module}] ${caller} ${message}`, ...args);
  }
}

/**
 * 创建模块日志器
 */
function createLogger(moduleName) {
  return new Logger(moduleName);
}

/**
 * 包装异步函数，添加超时和错误处理
 */
async function withTimeout(promise, timeoutMs, errorMessage = "Operation timeout") {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

/**
 * 安全执行函数，捕获错误
 */
async function safeExecute(fn, logger, errorMessage = "Operation failed") {
  try {
    return await fn();
  } catch (error) {
    logger.error(errorMessage, error);
    throw error;
  }
}

module.exports = {
  createLogger,
  withTimeout,
  safeExecute,
};
