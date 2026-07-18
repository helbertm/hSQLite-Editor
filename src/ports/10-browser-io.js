export function triggerBrowserDownload(filename, payload, mime = "application/octet-stream") {
  const blob = new Blob([payload], { type: mime });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

export function downloadText(filename, text, mime = "text/plain;charset=utf-8") {
  triggerBrowserDownload(filename, text, mime);
}

export function downloadBinary(filename, bytes, mime = "application/octet-stream") {
  triggerBrowserDownload(filename, bytes, mime);
}

export async function writeClipboardText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand("copy");
  ta.remove();
  if (!ok) {
    const error = new Error("clipboard-write-denied");
    error.code = "CLIPBOARD_WRITE_DENIED";
    throw error;
  }
}

export async function readClipboardText() {
  if (navigator.clipboard && window.isSecureContext) {
    return await navigator.clipboard.readText();
  }

  const error = new Error("clipboard-read-denied");
  error.code = "CLIPBOARD_READ_DENIED";
  throw error;
}
