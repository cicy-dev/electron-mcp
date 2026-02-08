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

function createWindow(options = {}, accountIdx = 0, forceNew = false) {
  const { width = 1200, height = 800, url, webPreferences = {}, x, y } = options;

  // Check if oneWindow mode is enabled - execute before coordinate logic
  if (config.oneWindow && !forceNew) {
    const allWindows = BrowserWindow.getAllWindows();
    if (allWindows.length > 0) {
      const existingWin = allWindows[0];
      console.log(`[WindowUtils] Single window mode enabled. Reusing existing window ${existingWin.id}`);

      if (existingWin.isMinimized()) existingWin.restore();
      existingWin.focus();

      if (url) {
        const currentUrl = existingWin.webContents.getURL();
        if (currentUrl === url) {
          console.log(`[WindowUtils] Same URL detected, reloading page`);
          existingWin.webContents.reload();
        } else {
          existingWin.loadURL(url);
        }
      }
      return existingWin;
    }
  }

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
      offscreen: false, // 确保不是离屏渲染
      nodeIntegration: false,
      contextIsolation: true,
      partition: `persist:sandbox-${accountIdx}`,
      ...webPreferences,
    },
  });

  // ✅ 核心修正：获取当前窗口真正使用的那个 session
  const ses = win.webContents.session;

  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log(`[Display :2] 已自动拒绝权限请求: ${permission}`);
    // 针对 Google AI Studio 常见的 geolocation 或 notifications 自动返回 false
    return callback(false);
  });

  // 💡 额外保险：处理权限检查（某些新版 Electron 需要这个）
  ses.setPermissionCheckHandler((webContents, permission, originatingOrigin) => {
    return false; // 同样全部拒绝
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
