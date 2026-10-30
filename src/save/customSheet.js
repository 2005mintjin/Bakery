// IndexedDB stores personal PNGs without using the server or localStorage's small quota.
function database() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(
      "little-hearth-character:" + new URL("./", location.href).pathname,
      1,
    );
    r.onupgradeneeded = () => r.result.createObjectStore("images");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function savedSheet(data) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(
          "images",
          data === undefined ? "readonly" : "readwrite",
        ),
        store = tx.objectStore("images"),
        r =
          data === undefined
            ? store.get("custom")
            : data === null
              ? store.delete("custom")
              : store.put(data, "custom");
      tx.oncomplete = () => resolve(r.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
