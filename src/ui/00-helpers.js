export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlightSchemaMatch(value, filter) {
  const text = String(value ?? "");
  const needle = String(filter ?? "").trim();
  if (!needle) return escapeHtml(text);
  const regex = new RegExp(`(${escapeRegExp(needle)})`, "ig");
  return escapeHtml(text).replace(regex, '<mark class="schema-highlight">$1</mark>');
}
