const { app, BrowserWindow } = require("electron");
const path = require("path");
const { config } = require("../config");
const { createLogger, withTimeout, safeExecute } = require("./logger");

const logger = createLogger("WindowUtils");

app.name = "ElectronMCP";

function setupWindowHandlers(win) {
  const winId = win.id;
  logger.debug(`Setting up handlers for window ${winId}`);
  
  try {
    if (!win.webContents.debugger.isAttached()) {
      win.webContents.debugger.attach("1.3");
      logger.debug(`Debugger attached to window ${winId}`);
    }

    // 初始化窗口监控
    if (typeof initWindowMonitoring === "function") {
      try {
        initWindowMonitoring(win);
        logger.debug(`Window monitoring initialized for window ${winId}`);
      } catch (error) {
        logger.error(`Failed to initialize window monitoring for ${winId}`, error);
      }
    }

    win.webContents.on("dom-ready", async () => {
      logger.debug(`DOM ready for window ${winId}`);
      
      try {
        const encodedCode = await withTimeout(
          win.webContents.executeJavaScript(`
            localStorage.getItem('__inject_auto_run_when_dom_ready_js') || ''
          `),
          5000,
          "Get injected code timeout"
        );
        
        if (encodedCode) {
          logger.debug(`Executing injected code for window ${winId}`);
          const code = Buffer.from(encodedCode, "base64").toString("utf-8");
          await withTimeout(
            win.webContents.executeJavaScript(`
              (async () => {
                try {
                  ${code}
                } catch(e) {
                  console.error('Injected code error:', e);
                }
              })()
            `),
            10000,
            "Execute injected code timeout"
          );
          logger.info(`Injected code executed for window ${winId}`);
        }
      } catch (e) {
        logger.error(`Auto-inject error for window ${winId}`, e);
      }
    });

    win.on("closed", () => {
      logger.info(`Window ${winId} closed`);
    });

    win.webContents.on("crashed", (event, killed) => {
      logger.error(`Window ${winId} crashed, killed: ${killed}`);
    });

    win.webContents.on("unresponsive", () => {
      logger.warn(`Window ${winId} became unresponsive`);
    });

    win.webContents.on("responsive", () => {
      logger.info(`Window ${winId} became responsive again`);
    });
    
  } catch (error) {
    logger.error(`Failed to setup handlers for window ${winId}`, error);
    throw error;
  }
}

function createWindow(options = {}, accountIdx = 0) {
  logger.info(`Creating window with account ${accountIdx}`, options);
  
  try {
    const { width = 1200, height = 800, url, webPreferences = {} } = options;

    const win = new BrowserWindow({
      width,
      height,
      x: 0,
      y: 0,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        partition: `persist:sandbox-${accountIdx}`,
        ...webPreferences,
      },
    });

    const winId = win.id;
    logger.info(`Window created: ${winId}`);

    function getTitlePrefix() {
      return `${config.port}:${accountIdx}-${winId} | `;
    }

    win.webContents.on("page-title-updated", (event, title) => {
      const newTitle = `${getTitlePrefix()} | ${title}`;
      win.setTitle(newTitle);
      logger.debug(`Window ${winId} title updated: ${title}`);
    });

    setupWindowHandlers(win);

    if (url) {
      logger.info(`Loading URL in window ${winId}: ${url}`);
      win.loadURL(url).catch((error) => {
        logger.error(`Failed to load URL in window ${winId}`, error);
      });
    }

    return win;
  } catch (error) {
    logger.error("Failed to create window", error);
    throw error;
  }
}

function getWindowInfo(win) {
  try {
    const wc = win.webContents;
    if (!wc || !wc.session) {
      logger.warn(`Invalid window or session for window ${win?.id}`);
      return null;
    }
    
    const partition = wc.session.partition || "";
    const accountIdx = partition.startsWith("persist:sandbox-")
      ? parseInt(partition.replace("persist:sandbox-", ""), 10)
      : 0;

    return {
      id: win.id,
      title: win.getTitle(),
      url: wc.getURL(),
      accountIdx,
      partition,
      debuggerIsAttached: wc.debugger.isAttached(),
      isActive: win.isFocused(),
      bounds: win.getBounds(),
      isDomReady: !wc.isLoading(),
      isLoading: wc.isLoading(),
      isDestroyed: wc.isDestroyed(),
      isCrashed: wc.isCrashed(),
      isWaitingForResponse: wc.isWaitingForResponse(),
      isVisible: win.isVisible(),
      isMinimized: win.isMinimized(),
      isMaximized: win.isMaximized(),
    };
  } catch (e) {
    return null;
  }
}

app.on("browser-window-created", (event, win) => {
  setupWindowHandlers(win);
});

module.exports = {
  createWindow,
  setupWindowHandlers,
  getWindowInfo,
};
