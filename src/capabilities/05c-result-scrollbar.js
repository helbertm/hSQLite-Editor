import { isMacOS } from "./00-dom-base.js";
import { resultHScroll, resultHScrollRange, tableWrap } from "./01-dom-layout-schema.js";

export function bindResultTableHorizontalWheel() {
  if (!tableWrap) return;
  tableWrap.addEventListener("wheel", (event) => {
    if (!event.shiftKey || tableWrap.scrollWidth <= tableWrap.clientWidth) return;
    event.preventDefault();
    tableWrap.scrollLeft += event.deltaY;
  }, { passive: false });
}

export function updatePersistentResultHorizontalScrollbar() {
  if (!tableWrap || !resultHScroll || !resultHScrollRange) return;
  if (!isMacOS) {
    resultHScroll.classList.remove("show");
    return;
  }

  const hasOverflow = tableWrap.scrollWidth > tableWrap.clientWidth + 1;
  resultHScroll.classList.toggle("show", hasOverflow);
  if (!hasOverflow) {
    resultHScrollRange.max = "0";
    resultHScrollRange.value = "0";
    return;
  }

  const maxScroll = Math.max(0, tableWrap.scrollWidth - tableWrap.clientWidth);
  resultHScrollRange.max = String(maxScroll);
  resultHScrollRange.value = String(Math.min(maxScroll, tableWrap.scrollLeft));
}

export function bindPersistentResultHorizontalScrollbar() {
  if (!tableWrap || !resultHScroll || !resultHScrollRange) return;
  if (!isMacOS) {
    resultHScroll.classList.remove("show");
    return;
  }

  let syncLock = false;
  tableWrap.addEventListener("scroll", () => {
    if (syncLock) return;
    syncLock = true;
    const maxScroll = Math.max(0, tableWrap.scrollWidth - tableWrap.clientWidth);
    resultHScrollRange.max = String(maxScroll);
    resultHScrollRange.value = String(Math.min(maxScroll, tableWrap.scrollLeft));
    syncLock = false;
  });
  resultHScrollRange.addEventListener("input", () => {
    if (syncLock) return;
    syncLock = true;
    tableWrap.scrollLeft = Number(resultHScrollRange.value || 0);
    syncLock = false;
  });
  window.addEventListener("resize", updatePersistentResultHorizontalScrollbar);
  updatePersistentResultHorizontalScrollbar();
}
