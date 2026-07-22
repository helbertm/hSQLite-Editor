import { formatDateTime } from "./03-localization.js";

export function formatQueryHistoryDate(iso) {
  try {
    return formatDateTime(iso);
  } catch {
    return iso || "";
  }
}

export function getHistoryStatusIcon(status) {
  if (status === "success") return '<svg viewBox="0 0 24 24" role="img" focusable="false"><path d="M20 6 9 17l-5-5"></path></svg>';
  return '<svg viewBox="0 0 24 24" role="img" focusable="false"><path d="M18 6 6 18"></path><path d="M6 6l12 12"></path></svg>';
}

export function getHistoryLoadIcon() {
  return `
    <span class="history-symbol query-history-action-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" role="img" focusable="false">
        <path d="M14 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z"></path>
        <path d="M14 4v5h5"></path>
        <path d="M8 12h7"></path>
        <path d="m12 8 4 4-4 4"></path>
      </svg>
    </span>
  `;
}
