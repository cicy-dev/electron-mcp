// Telegram Web IndexedDB Utils
// Auto-injected on page load

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

