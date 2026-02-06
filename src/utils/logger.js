const log = require("electron-log");

/**
 * 统一日志工具
 * 提供 info, debug, error, warn 方法
 */
class Logger {
  constructor(module) {
    this.module = module;
  }

  info(message, ...args) {
    log.info(`[${this.module}] ${message}`, ...args);
  }

  debug(message, ...args) {
    log.debug(`[${this.module}] ${message}`, ...args);
  }

  error(message, error, ...args) {
    if (error instanceof Error) {
      log.error(`[${this.module}] ${message}`, error.message, error.stack, ...args);
    } else {
      log.error(`[${this.module}] ${message}`, error, ...args);
    }
  }

  warn(message, ...args) {
    log.warn(`[${this.module}] ${message}`, ...args);
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
