const fs = require("fs");
const path = require("path");
const os = require("os");
const beautify = require("js-beautify");
const { createLogger } = require("./logger");

const logger = createLogger("WindowMonitor");

// 存储每个窗口的日志和请求
const windowLogs = new Map();
const windowRequests = new Map();
const windowRequestDetails = new Map();
const windowIndexCounters = new Map();

const MAX_INLINE_SIZE = 1024; // 1KB
const CAPTURE_DIR = path.join(
  os.homedir(),
  "Desktop",
  process.env.TEST === "TRUE" ? "CaptureDataTest" : "CaptureData"
);

function prettifyCode(code, type) {
  try {
    if (type === "json") return JSON.stringify(JSON.parse(code), null, 2);
    if (type === "html") return beautify.html(code, { indent_size: 2 });
    if (type === "js") return beautify.js(code, { indent_size: 2 });
    if (type === "css") return beautify.css(code, { indent_size: 2 });
  } catch (e) {
    logger.debug(`Failed to prettify ${type} code`, e);
  }
  return code;
}

function initWindowMonitoring(win) {
  const winId = win.id;
  logger.info(`Initializing monitoring for window ${winId}`);

  try {
    // 初始化队列和计数器
    windowLogs.set(winId, []);
    windowRequests.set(winId, []);
    windowRequestDetails.set(winId, new Map());
    windowIndexCounters.set(winId, { log: 0, request: 0 });

    // 创建捕获目录
    if (!fs.existsSync(CAPTURE_DIR)) {
      fs.mkdirSync(CAPTURE_DIR, { recursive: true });
      logger.info(`Created capture directory: ${CAPTURE_DIR}`);
    }

    // 监听控制台日志
    win.webContents.on("console-message", (event, level, message, line, sourceId) => {
      try {
        const logs = windowLogs.get(winId);
        const counters = windowIndexCounters.get(winId);
        if (logs && counters) {
          logs.push({
            index: ++counters.log,
            timestamp: Date.now(),
        level: ["verbose", "info", "warning", "error"][level] || "log",
        message,
        line,
        source: sourceId,
      });
    }
  });

  // 监听网络请求
  win.webContents.debugger.on("message", async (event, method, params) => {
    if (method === "Network.requestWillBeSent") {
      const requests = windowRequests.get(winId);
      const details = windowRequestDetails.get(winId);
      const counters = windowIndexCounters.get(winId);
      if (requests && counters && details) {
        const url = new URL(params.request.url);
        const index = ++counters.request;
        const postData = params.request.postData;
        const postDataSize = postData ? Buffer.byteLength(postData, "utf8") : 0;

        requests.push({
          index,
          timestamp: Date.now(),
          requestId: params.requestId,
          url: params.request.url,
          domain: url.hostname,
          path: url.pathname + url.search,
          method: params.request.method,
          type: params.type,
          mimeType: params.request.headers["Content-Type"] || params.type,
          postDataSize,
        });

        // 存储详细信息
        const detailData = {
          requestId: params.requestId,
          url: params.request.url,
          method: params.request.method,
          headers: params.request.headers,
          postDataSize,
          type: params.type,
        };

        // 如果 postData 太大，保存到文件
        if (postData && postDataSize > MAX_INLINE_SIZE) {
          const tmpDir = path.join(os.tmpdir(), "electron-mcp", `win-${winId}`);
          if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
          const postDataFile = path.join(tmpDir, `post-${params.requestId}.dat`);
          fs.writeFileSync(postDataFile, postData);
          detailData.postDataFile = postDataFile;
        } else if (postData) {
          detailData.postData = postData;
        }

        details.set(index, detailData);
        details.set(params.requestId, { url: params.request.url, method: params.request.method });
      }
    }

    if (method === "Network.responseReceived") {
      const details = windowRequestDetails.get(winId);
      if (details) {
        const info = details.get(params.requestId);
        if (info) {
          info.mimeType = params.response.mimeType;
          info.responseHeaders = params.response.headers;
          info.status = params.response.status;
        }
      }
    }

    if (method === "Network.loadingFinished") {
      const details = windowRequestDetails.get(winId);
      const requests = windowRequests.get(winId);
      if (!details || !requests) return;
      const info = details.get(params.requestId);
      if (!info) return;

      // 找到对应的 request index
      const request = requests.find((r) => r.requestId === params.requestId);
      const requestIndex = request ? request.index : null;

      try {
        const result = await win.webContents.debugger.sendCommand("Network.getResponseBody", {
          requestId: params.requestId,
        });

        let content = result.body;
        const mimeType = info.mimeType || "";
        const fullUrl = info.url;
        const urlObj = new URL(fullUrl);
        const domain = urlObj.hostname;
        const pathname = urlObj.pathname;
        let fileName = pathname === "/" ? "index.html" : path.basename(pathname);
        if (!fileName) fileName = "index.html";

        const domainDir = path.join(CAPTURE_DIR, `win-${winId}`, domain);
        let typeFolder = "others";
        let fileExt = path.extname(fileName).toLowerCase();

        if (mimeType.includes("text/html")) {
          typeFolder = "html";
          if (!result.base64Encoded) content = prettifyCode(content, "html");
        } else if (mimeType.includes("json") || fileExt === ".json") {
          typeFolder = "json";
          if (!result.base64Encoded) content = prettifyCode(content, "json");
        } else if (
          fileExt.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/) ||
          mimeType.includes("image/")
        ) {
          typeFolder = "images";
        } else if (mimeType.includes("javascript") || fileExt === ".js") {
          typeFolder = "js";
          if (!result.base64Encoded) content = prettifyCode(content, "js");
        } else if (mimeType.includes("css") || fileExt === ".css") {
          typeFolder = "css";
          if (!result.base64Encoded) content = prettifyCode(content, "css");
        }

        const targetDir = path.join(domainDir, typeFolder);
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        const filePath = path.join(targetDir, fileName);
        fs.writeFileSync(
          filePath,
          result.base64Encoded ? result.body : content,
          result.base64Encoded ? "base64" : "utf8"
        );

        // 保存详细信息到 .info.txt 文件（使用原始文件名 + .info.txt）
        if (requestIndex) {
          const detailInfo = {
            index: requestIndex,
            requestId: params.requestId,
            url: fullUrl,
            method: info.method || "GET",
            requestHeaders: info.headers,
            postData: info.postData,
            postDataSize: info.postDataSize,
            responseHeaders: info.responseHeaders,
            status: info.status,
            mimeType: mimeType,
            responseBodySize: result.body.length,
            responseBodyFile: filePath,
            base64Encoded: result.base64Encoded,
          };

          const infoFilePath = filePath + ".info.txt";
          fs.writeFileSync(infoFilePath, JSON.stringify(detailInfo, null, 2));
        }

        win.webContents.session.flushStorageData();
      } catch (e) {}
    }
  });

  // 启用网络监控
  try {
    win.webContents.debugger.sendCommand("Network.enable");
  } catch (e) {
    console.error("Failed to enable Network:", e);
  }

  // 页面重载时清空队列并重置计数器
  win.webContents.on("did-start-loading", () => {
    windowLogs.set(winId, []);
    windowRequests.set(winId, []);
    windowRequestDetails.set(winId, new Map());
    windowIndexCounters.set(winId, { log: 0, request: 0 });
  });

  // 窗口关闭时清理
  win.on("closed", () => {
    // 清理临时文件
    const tmpDir = path.join(os.tmpdir(), "electron-mcp", `win-${winId}`);
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }

    windowLogs.delete(winId);
    windowRequests.delete(winId);
    windowRequestDetails.delete(winId);
    windowIndexCounters.delete(winId);
  });
}

function getConsoleLogs(winId) {
  return windowLogs.get(winId) || [];
}

function getRequests(winId) {
  return windowRequests.get(winId) || [];
}

function getRequestDetail(winId, index) {
  // 优先从 .info.txt 文件加载
  const captureBase = process.env.TEST === "TRUE" ? "CaptureDataTest" : "CaptureData";
  const captureDir = path.join(os.homedir(), "Desktop", captureBase);

  // 递归查找 .info.txt 文件
  function findInfoFile(dir) {
    if (!fs.existsSync(dir)) return null;

    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        const found = findInfoFile(fullPath);
        if (found) return found;
      } else if (file.name.endsWith(".info.txt")) {
        try {
          const content = fs.readFileSync(fullPath, "utf8");
          const data = JSON.parse(content);
          if (data.index === index) return data;
        } catch (e) {}
      }
    }
    return null;
  }

  const detail = findInfoFile(captureDir);
  if (detail) return detail;

  // 回退到内存数据
  const details = windowRequestDetails.get(winId);
  return details ? details.get(index) : null;
}

module.exports = {
  initWindowMonitoring,
  getConsoleLogs,
  getRequests,
  getRequestDetail,
};
