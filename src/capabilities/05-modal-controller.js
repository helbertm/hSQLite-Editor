export const modalController = {
  activeModal: null,
  lastFocusedElement: null,
  stack: [],
  focusableSelector: 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  getFocusable(modalEl) {
    if (!modalEl) return [];
    return Array.from(modalEl.querySelectorAll(this.focusableSelector))
      .filter(el => !el.hasAttribute("disabled") && el.offsetParent !== null);
  },
  open(modalEl) {
    if (!modalEl) return;
    const existingIndex = this.stack.findIndex((entry) => entry.modalEl === modalEl);
    const entry = existingIndex >= 0
      ? this.stack.splice(existingIndex, 1)[0]
      : { modalEl, returnFocus: document.activeElement };
    this.stack.push(entry);
    this.lastFocusedElement = entry.returnFocus;
    modalEl.style.display = "flex";
    modalEl.classList.add("is-open");
    document.body.classList.add("modal-active");
    this.activeModal = modalEl;
    const preferred = modalEl.querySelector("[data-modal-initial='true']");
    if (preferred && typeof preferred.focus === "function") {
      preferred.focus();
      return;
    }
    const focusables = this.getFocusable(modalEl);
    if (focusables.length) focusables[0].focus();
  },
  close(modalEl) {
    if (!modalEl) return;
    const entryIndex = this.stack.findIndex((entry) => entry.modalEl === modalEl);
    const entry = entryIndex >= 0 ? this.stack.splice(entryIndex, 1)[0] : null;
    const wasActive = this.activeModal === modalEl;
    modalEl.style.display = "none";
    modalEl.classList.remove("is-open");
    document.body.classList.toggle("modal-active", this.stack.length > 0);
    if (!wasActive) return;

    const parentEntry = this.stack[this.stack.length - 1] || null;
    this.activeModal = parentEntry?.modalEl || null;
    this.lastFocusedElement = parentEntry?.returnFocus || null;
    let focusTarget = entry?.returnFocus || null;
    if (this.activeModal && (!focusTarget || !this.activeModal.contains(focusTarget))) {
      focusTarget = this.activeModal.querySelector("[data-modal-initial='true']")
        || this.getFocusable(this.activeModal)[0]
        || null;
    }
    if (focusTarget && typeof focusTarget.focus === "function") focusTarget.focus();
  },
  isBackdropClick(event, modalEl) {
    return Boolean(event && modalEl && event.target === modalEl);
  },
  handleKeydown(event) {
    if (!this.activeModal) return;
    const key = event.key;

    if (key === "Escape") {
      event.preventDefault();
      const cancelBtn = this.activeModal.querySelector("[data-modal-cancel='true']");
      if (cancelBtn) cancelBtn.click();
      else this.close(this.activeModal);
      return;
    }

    if (key === "Tab") {
      const focusables = this.getFocusable(this.activeModal);
      if (!focusables.length) {
        event.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }

    const typingTarget = event.target && (
      event.target.closest("input, textarea, select, [contenteditable='true']")
      || event.target.closest(".cm-editor")
    );
    if (typingTarget) return;

    if (key.toLowerCase() === "o" || key === "Enter") {
      const confirmBtn = this.activeModal.querySelector("[data-modal-confirm='true']");
      if (confirmBtn) {
        event.preventDefault();
        confirmBtn.click();
      }
      return;
    }

    if (key.toLowerCase() === "a") {
      const cancelBtn = this.activeModal.querySelector("[data-modal-cancel='true']");
      if (cancelBtn) {
        event.preventDefault();
        cancelBtn.click();
      }
    }
  }
};

export function initModalControllerBindings() {
  document.addEventListener("keydown", (event) => modalController.handleKeydown(event));
}
