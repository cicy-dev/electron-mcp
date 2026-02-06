const { app, BrowserWindow } = require("electron");
const { initWindowMonitoring } = require("./window-monitor");

app.name = "ElectronMCP";

function setupWindowHandlers(win) {
  if (!win.webContents.debugger.isAttached()) {
    win.webContents.debugger.attach("1.3");
  }
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
  const { width = 1200, height = 800, url, webPreferences = {} } = options;

  const win = new BrowserWindow({
    width,
    height,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: `persist:sandbox-${accountIdx}`,
      ...webPreferences,
    },
  });

  const titlePrefix = `${accountIdx}-${win.id} | `;
  win.setTitle(`${titlePrefix} | Loading...`);

  win.webContents.on("page-title-updated", (event, title) => {
    win.setTitle(`${titlePrefix} | ${title}`);
  });

  setupWindowHandlers(win);

  if (url) {
    win.loadURL(url);
  }

  return win;
}

function getWindowInfo(win) {
  const wc = win.webContents;
  const partition = wc.session.partition;
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
}

app.on("browser-window-created", (event, win) => {
  setupWindowHandlers(win);
});

module.exports = {
  createWindow,
  setupWindowHandlers,
  getWindowInfo,
};
