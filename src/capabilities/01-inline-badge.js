export const INLINE_BADGE_MODES = ["dot", "count"];
export const INLINE_BADGE_TONES = ["danger", "warning", "success", "info", "neutral"];
export const INLINE_BADGE_MAX_COUNT = 99;

export function clearInlineBadgeClasses(element) {
  INLINE_BADGE_MODES.forEach((mode) => element.classList.remove(`app-badge-${mode}`));
  INLINE_BADGE_TONES.forEach((tone) => element.classList.remove(`app-badge-${tone}`));
}

export function formatInlineBadgeCount(count, max = INLINE_BADGE_MAX_COUNT) {
  const normalized = Number(count);
  if (!Number.isFinite(normalized) || normalized <= 0) return "";
  const safeMax = Number.isFinite(Number(max)) && Number(max) > 0 ? Number(max) : INLINE_BADGE_MAX_COUNT;
  return normalized > safeMax ? `${safeMax}+` : String(Math.trunc(normalized));
}

export function setInlineBadge(element, options = {}) {
  if (!element) return;

  const visible = Boolean(options.visible);
  const requestedMode = String(options.mode || "dot").trim().toLowerCase();
  const requestedTone = String(options.tone || "danger").trim().toLowerCase();
  const mode = INLINE_BADGE_MODES.includes(requestedMode) ? requestedMode : "dot";
  const tone = INLINE_BADGE_TONES.includes(requestedTone) ? requestedTone : "danger";
  const text = mode === "count" ? formatInlineBadgeCount(options.count, options.max) : "";

  element.classList.add("app-badge");
  clearInlineBadgeClasses(element);

  if (!visible || (mode === "count" && !text)) {
    element.style.display = "none";
    element.textContent = "";
    element.dataset.badgeMode = "";
    element.dataset.badgeTone = "";
    return;
  }

  element.dataset.badgeMode = mode;
  element.dataset.badgeTone = tone;
  element.classList.add(`app-badge-${mode}`, `app-badge-${tone}`);
  element.textContent = text;
  element.style.display = "inline-flex";
}
