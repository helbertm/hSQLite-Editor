# Accessibility

## Target

hSQLite Editor targets WCAG 2.2 Level AA for the latest release. Accessibility is a release property, not an optional enhancement.

## Interaction contract

- Every primary workflow must be operable with a keyboard.
- Focus must be visible and move predictably when dialogs open, close, or update.
- Controls require programmatic names; placeholders are not labels.
- Dialogs require an accessible name, appropriate description, focus containment, and focus restoration.
- Status and error feedback must be exposed without moving focus unnecessarily.
- SQL tabs keep form controls outside `role="tab"`. F2 starts an inline rename, Enter commits, Escape cancels, and both paths restore focus to the same tab. Rename and close commands for the active tab live outside the tablist and remain keyboard reachable.
- Error toasts use atomic assertive announcements; informational toasts use atomic polite announcements. Toasts never take focus, and their close buttons have localized accessible names.
- Results-grid sorting, row selection, current-row movement, and column operations require keyboard equivalents or an accessible command surface.
- SQL Map table and field selectors expose names derived from the visible database identifiers. Relationship controls support Enter and Space, preserve pressed state while a source is selected, and announce source, cancellation, blocked validation, and completion within the open dialog.
- Foreign-key direction help follows the active `en-US`, `pt-BR`, or `es-ES` locale and opens official documentation in a separate browser context.
- Color cannot be the only carrier of meaning. Text and controls must meet WCAG AA contrast.
- The active locale must be reflected in `<html lang>`.

## Verification

Run static source checks, automated browser accessibility checks in every supported locale, keyboard workflow tests, zoom/reflow checks, and native Safari smoke on the final `file://` artifact. Automated checks cannot prove screen-reader usability; release review includes manual keyboard and assistive-technology spot checks for changed workflows.

The browser matrix also checks SQL-tab rename and command focus behavior and runs axe against the populated tablist. The populated SQL Map scenario checks accessible names against real table and field identifiers, validates focus order and keyboard relationship creation, verifies blocked-state behavior, inspects the browser accessibility tree, and runs axe while the dialog is open.

Known limitations and remediation status belong in `security_posture.md` or a tracked public issue, never only in local agent notes.
