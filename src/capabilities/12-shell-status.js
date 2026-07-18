import { appRoot, statusEl } from "./00-dom-base.js";
import { dbInfo } from "./02-dom-database.js";

export const statusController = {
  set(message, type = "") {
    statusEl.textContent = String(message ?? "");
    statusEl.className = "status " + type;
  }
};

export const dbInfoController = {
  setLabel(fileName, sizeBytes, originLabel = "") {
    const sizeMb = (Number(sizeBytes || 0) / 1024 / 1024).toFixed(2);
    dbInfo.textContent = `${fileName} · ${sizeMb} MB`;
    dbInfo.title = "";
  }
};

export function setStatus(msg, type = "") {
  statusController.set(msg, type);
}

export function setDbInfoLabel(fileName, sizeBytes, originLabel = "") {
  dbInfoController.setLabel(fileName, sizeBytes, originLabel);
}

export function setShellAvailability(enabled) {
  if (!appRoot) return;
  if (enabled) {
    appRoot.removeAttribute("inert");
    appRoot.removeAttribute("aria-hidden");
    return;
  }
  appRoot.setAttribute("inert", "");
  appRoot.setAttribute("aria-hidden", "true");
}
