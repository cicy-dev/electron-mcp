const { app, BrowserWindow } = require("electron");
const path = require("path");
const { config } = require("../config");
const { initWindowMonitoring } = require("./window-monitor");

app.name = "ElectronMCP";

function setupWindowHandlers(win) {
  if (!win.webContents.debugger.isAttached()) {
    win.webContents.debugger.attach("1.3");
  }

  // 初始化窗口监控（在 dom-ready 之前调用）
  initWindowMonitoring(win);

  win.webContents.on("dom-ready", async () => {
    try {
      const encodedCode = await win.webContents.executeJavaScript(`
        localStorage.getItem('__inject_auto_run_when_dom_ready_js') || ''
      `);
      if (encodedCode) {
        const code = Buffer.from(encodedCode, "base64").toString("utf-8");
        await win.webContents.executeJavaScript(`
          (async () => {
            try {
              ${code}
            } catch(e) {
              console.error('Injected code error:', e);
            }
          })()
        `);
      }
    } catch (e) {
      console.error("Auto-inject error:", e);
    }
  });
}

function createWindow(options = {}, accountIdx = 0) {
  const { width = 1200, height = 800, url, webPreferences = {}, x, y } = options;

  // 如果没有指定 x, y，则根据现有窗口自动偏移
  let posX = x;
  let posY = y;
  
  if (posX === undefined || posY === undefined) {
    const allWindows = BrowserWindow.getAllWindows();
    const offset = allWindows.length * 30; // 每个窗口偏移30px
    posX = posX !== undefined ? posX : offset;
    posY = posY !== undefined ? posY : offset;
  }

  const win = new BrowserWindow({
    width,
    height,
    x: posX,
    y: posY,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: `persist:sandbox-${accountIdx}`,
      ...webPreferences,
    },
  });

  function getTitlePrefix() {
    return `${config.port}:${accountIdx}-${win.id} | `;
  }

  const titlePrefix = getTitlePrefix();

  win.webContents.on("page-title-updated", (event, title) => {
    win.setTitle(`${getTitlePrefix()} | ${title}`);
  });

  setupWindowHandlers(win);

  if (url) {
    win.loadURL(url);
  }

  return win;
}

function getWindowInfo(win) {
  try {
    const wc = win.webContents;
    if (!wc || !wc.session) return null;
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
