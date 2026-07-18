import { STORAGE_KEYS } from "./05-storage.js";

export const browserFileHandleStore = {
  openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(STORAGE_KEYS.FILE_HANDLES_STORE, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("handles");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  async put(id, handle) {
    if (!("indexedDB" in window)) return;
    const dbh = await this.openDb();
    await new Promise((resolve, reject) => {
      const tx = dbh.transaction("handles", "readwrite");
      tx.objectStore("handles").put(handle, id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    dbh.close();
  },
  async get(id) {
    if (!("indexedDB" in window)) return null;
    const dbh = await this.openDb();
    const handle = await new Promise((resolve, reject) => {
      const tx = dbh.transaction("handles", "readonly");
      const req = tx.objectStore("handles").get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    dbh.close();
    return handle;
  },
  async clear() {
    if (!("indexedDB" in window)) return;
    const dbh = await this.openDb();
    await new Promise((resolve, reject) => {
      const tx = dbh.transaction("handles", "readwrite");
      tx.objectStore("handles").clear();
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    dbh.close();
  }
};

export async function saveStoredFileHandle(id, handle) {
  await browserFileHandleStore.put(id, handle);
}

export async function loadStoredFileHandle(id) {
  return browserFileHandleStore.get(id);
}

export async function clearStoredFileHandles() {
  await browserFileHandleStore.clear();
}

export async function chooseSingleFileHandle({
  extensions = [],
  description = ""
} = {}) {
  if (!window.showOpenFilePicker) return null;

  try {
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: [{
        description,
        accept: {
          "application/octet-stream": extensions,
          "application/x-sqlite3": extensions
        }
      }]
    });
    return handle || null;
  } catch (err) {
    if (err && err.name === "AbortError") return null;
    throw err;
  }
}
