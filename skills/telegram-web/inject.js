// Telegram Web IndexedDB Utils
// Auto-injected on page load

// Hook CacheStorage to capture API responses
(() => {
  const _caches = caches;
  const _open = _caches.open.bind(_caches);

  _caches.open = async function(name) {
    const cache = await _open(name);
    const _match = cache.match.bind(cache);

    cache.match = async function(request, options) {
      const response = await _match(request, options);
      if (response) {
        const url = request.url || request;
        const isJS = url.includes('index-') && url.endsWith('.js');
        if (isJS) {
          const text = await response.clone().text();
          console.log('📦 Cache JS:', url.substring(0, 80));
          console.log('Content:', text.substring(0, 100));
        }
      }
      return response;
    };
    return cache;
  };

  console.log('✅ CacheStorage hooked');
})();

// Hook JSON.parse to capture messages
(() => {
  const _p = JSON.parse;
  const _s = JSON.stringify;

  JSON.parse = function(t, r) {
    try {
      const x = _p(t, r);
      if (t && typeof t === "string" && (t.includes("messages") || t.includes("peerId"))) {
        console.log("📥 JSON.parse:", t.substring(0, 150));
      }
      return x;
    } catch (e) {
      return _p(t, r);
    }
  };

  JSON.stringify = function(v, r, s) {
    try {
      const t = _s(v, r, s);
      if (t && typeof t === "string" && (t.includes("messages") || t.includes("peerId"))) {
        console.log("📤 JSON.stringify:", t.substring(0, 150));
      }
      return t;
    } catch (e) {
      return _s(v, r, s);
    }
  };

  console.log("✅ JSON hook ready");
})();

window.getIndexedDBRows = async (dbName, storeName, limit = 100) => {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const tx = db.transaction(storeName, "readonly");
  const store = tx.objectStore(storeName);
  const results = [];
  return new Promise((resolve) => {
    const request = store.openCursor();
    request.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
  });
};

window.listIndexedDB = async () => {
  const dbs = await indexedDB.databases();
  const result = {};
  for (const dbInfo of dbs) {
    try {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open(dbInfo.name);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        setTimeout(() => reject(new Error("timeout")), 1000);
      });
      result[dbInfo.name] = Array.from(db.objectStoreNames);
      db.close();
    } catch(e) {
      result[dbInfo.name] = "error: " + e.message;
    }
  }
  return result;
};

console.log("✅ IndexedDB Utils loaded");
