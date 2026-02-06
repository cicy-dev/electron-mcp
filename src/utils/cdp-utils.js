const { createLogger, withTimeout } = require("./logger");

const logger = createLogger("CDP");

async function sendCDP(webContents, method, params = {}) {
  const winId = webContents.id;
  logger.debug(`Sending CDP command to window ${winId}: ${method}`, params);
  
  try {
    if (!webContents.debugger.isAttached()) {
      logger.debug(`Attaching debugger to window ${winId}`);
      webContents.debugger.attach("1.3");
    }
    
    const result = await withTimeout(
      webContents.debugger.sendCommand(method, params),
      30000, // 30 seconds timeout
      `CDP command timeout: ${method}`
    );
    
    logger.debug(`CDP command completed for window ${winId}: ${method}`);
    return result;
  } catch (error) {
    logger.error(`CDP command failed for window ${winId}: ${method}`, error);
    throw error;
  }
}

module.exports = { sendCDP };
