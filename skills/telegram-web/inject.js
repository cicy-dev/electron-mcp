// Telegram Web IndexedDB Utils
// Auto-injected on page load

(async () => {
  const  name = "cachedAssets"
  const cache = await caches.open(name);
  const requests = await cache.keys();

  console.log(`\n📦 缓存 ${name} 资源数:`, requests.length);

  for (const req of requests) {
    const url = req.url;
    // console.log(url)
    // 只抓 JS（你可改条件）
    const isHit =
        url.includes("index-") &&
        url.endsWith(".js");
    if (!isHit) continue;

    console.log("🔗 命中JS:", url);

    const res = await cache.match(req);
    if (!res) continue;

    let text = await res.text();


    if(!text.startsWith('window.__ver="1.0.3"')){
      if(text.indexOf(";this.pushSingleManagerthis")===-1){
          text = text.replace("this.pushSingleManager","window.init(this.mirrors);this.pushSingleManager");
          text= `window.__ver="1.0.3";console.log("=========+>> __v:",window.__v);window.init = (m)=>{window.__m = m};` + text
          const fileName =
            url.substring(url.lastIndexOf("/") + 1) ||
            "unknown.js";

          await cache.put(
            fileName,
            new Response(text, {
              headers: {
                "Content-Type": "application/javascript",
              },
            })
          );

          console.log("💾 已备份:", fileName);
        }
    }

     // text = text.replace(",__v);",",window.__v);");


     // const fileName =
     //        url.substring(url.lastIndexOf("/") + 1) ||
     //        "unknown.js";

     //  text = text.replace(",__v);",",window.__v);");
     //  await cache.put(
     //    fileName,
     //    new Response(text, {
     //      headers: {
     //        "Content-Type": "application/javascript",
     //      },
     //    })
     //  );

  }

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
    } catch (e) {
      result[dbInfo.name] = "error: " + e.message;
    }
  }
  return result;
};

console.log("✅ IndexedDB Utils loaded");
