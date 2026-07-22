export const statusEl = document.getElementById("status");
export const isMacOS = (() => {
  const platform = navigator.platform || "";
  const ua = navigator.userAgent || "";
  return /Mac|iPhone|iPad|iPod/i.test(platform) || /Mac OS X|iPhone OS|iPad/i.test(ua);
})();
export const toastContainer = document.getElementById("toastContainer");
export const appRoot = document.getElementById("appRoot");
export const bootScreen = document.getElementById("bootScreen");
export const bootStateBadge = document.getElementById("bootStateBadge");
export const bootStateLabel = document.getElementById("bootStateLabel");
export const bootScreenTitle = document.getElementById("bootScreenTitle");
export const bootScreenMessage = document.getElementById("bootScreenMessage");
export const bootScreenActions = document.getElementById("bootScreenActions");
export const bootRetryBtn = document.getElementById("bootRetryBtn");
export const offlineScreen = document.getElementById("offlineScreen");
export const offlineHtmlFileName = document.getElementById("offlineHtmlFileName");
