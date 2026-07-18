(function attachInlineBadgeApi(globalObject) {
  const INLINE_BADGE_MODES = ["dot", "count"];
  const INLINE_BADGE_TONES = ["danger", "warning", "success", "info", "neutral"];
  const INLINE_BADGE_MAX_COUNT = 99;

  function clearInlineBadgeClasses(element) {
    INLINE_BADGE_MODES.forEach((mode) => element.classList.remove(`inline-badge-${mode}`));
    INLINE_BADGE_TONES.forEach((tone) => element.classList.remove(`inline-badge-${tone}`));
  }

  function formatInlineBadgeCount(count, max = INLINE_BADGE_MAX_COUNT) {
    const normalized = Number(count);
    if (!Number.isFinite(normalized) || normalized <= 0) return "";
    const safeMax = Number.isFinite(Number(max)) && Number(max) > 0 ? Number(max) : INLINE_BADGE_MAX_COUNT;
    return normalized > safeMax ? `${safeMax}+` : String(Math.trunc(normalized));
  }

  function setInlineBadge(element, options = {}) {
    if (!element) return;

    const visible = Boolean(options.visible);
    const requestedMode = String(options.mode || "dot").trim().toLowerCase();
    const requestedTone = String(options.tone || "danger").trim().toLowerCase();
    const mode = INLINE_BADGE_MODES.includes(requestedMode) ? requestedMode : "dot";
    const tone = INLINE_BADGE_TONES.includes(requestedTone) ? requestedTone : "danger";
    const text = mode === "count" ? formatInlineBadgeCount(options.count, options.max) : "";

    element.classList.add("inline-badge");
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
    element.classList.add(`inline-badge-${mode}`, `inline-badge-${tone}`);
    element.textContent = text;
    element.style.display = "inline-flex";
  }

  globalObject.setInlineBadge = setInlineBadge;
  globalObject.formatInlineBadgeCount = formatInlineBadgeCount;
})(window);
