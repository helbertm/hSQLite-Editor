import { recentDbList } from "./02-dom-database.js";
import { formatDateTime, t } from "./03-localization.js";
import { invokeRuntimeTestOverride } from "../core/09-test-hooks.js";
import { STORAGE_KEYS, storage } from "../ports/05-storage.js";
import { clearStoredFileHandles, loadStoredFileHandle, saveStoredFileHandle } from "../ports/30-file-access.js";
import { escapeHtml } from "../ui/00-helpers.js";

let openRecentDatabase = async () => {};

export function configureRecentDatabaseActions(actions) {
  openRecentDatabase = actions.openRecentDatabase;
}

export function buildDbSessionId({ source, name, size, lastModified }) {
  return [
    source || "db",
    String(name || "unknown"),
    Number(size || 0),
    Number(lastModified || 0)
  ].join("|");
}

export const recentDbStorage = {
  load() {
    return storage.getJSON(STORAGE_KEYS.RECENT_DBS, []);
  },
  save(items) {
    storage.setJSON(STORAGE_KEYS.RECENT_DBS, items.slice(0, 10));
  },
  clear() {
    storage.remove(STORAGE_KEYS.RECENT_DBS);
  }
};

export function getRecentDbs() {
  try {
    return recentDbStorage.load();
  } catch {
    return [];
  }
}

export function saveRecentDbs(items) {
  recentDbStorage.save(items);
  renderRecentDbs();
}

export function renderRecentDbs() {
  const items = getRecentDbs();
  if (!recentDbList) return;
  if (!items.length) {
    recentDbList.innerHTML = `<div class="query-history-empty">${escapeHtml(t("recent.empty"))}</div>`;
    return;
  }
  recentDbList.innerHTML = items.map((item) => {
    const date = item.lastOpenedAt ? formatDateTime(item.lastOpenedAt) : "";
    const secondary = [item.path && item.path !== item.name ? item.path : "", date].filter(Boolean).join(" · ");
    return `
      <div class="query-history-item">
        <span class="query-history-status-icon" aria-hidden="true">🗄️</span>
        <div>
          <div class="query-history-meta"><span>${escapeHtml(item.name)}</span></div>
          <pre class="query-history-sql">${escapeHtml(secondary || t("recent.file"))}</pre>
        </div>
        <button class="ui-button ui-button-secondary ui-button-sm query-history-load-btn" type="button" data-recent-open="${escapeHtml(item.id)}">${escapeHtml(t("recent.open"))}</button>
      </div>
    `;
  }).join("");
  recentDbList.querySelectorAll("[data-recent-open]").forEach((button) => {
    button.addEventListener("click", async () => {
      await openRecentDatabase(button.dataset.recentOpen);
    });
  });
}

export async function addRecentDb(file, handle = null) {
  const id = makeRecentDbId(file, handle);
  const now = new Date().toISOString();
  const item = {
    id,
    name: file.name,
    path: handle ? handle.name : file.webkitRelativePath || file.name,
    size: file.size,
    lastModified: file.lastModified || null,
    lastOpenedAt: now,
    hasHandle: Boolean(handle)
  };

  const items = getRecentDbs().filter(x => x.id !== id);
  items.unshift(item);
  saveRecentDbs(items);

  if (handle) {
    await saveFileHandle(id, handle);
  }
}

export function makeRecentDbId(file, handle = null) {
  return [
    handle ? "handle" : "file",
    file.name,
    file.size || 0,
    file.lastModified || 0
  ].join("|");
}

export async function saveFileHandle(id, handle) {
  await saveStoredFileHandle(id, handle);
}

export async function getFileHandle(id) {
  return invokeRuntimeTestOverride("getFileHandle", [id], loadStoredFileHandle);
}

export async function clearFileHandles() {
  await clearStoredFileHandles();
}
