import { offlineHtmlFileName } from "./00-dom-base.js";

export function updateOfflineMode() {
  document.body.classList.remove("offline-mode");
  if (offlineHtmlFileName) {
    const fileName = location.pathname.split("/").pop() || "hSQLite-Editor.html";
    offlineHtmlFileName.textContent = fileName;
  }
}
