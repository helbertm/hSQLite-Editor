# hSQLite Editor Design System

## Objective
Define a consistent UX/UI baseline for a keyboard-first SQLite workspace with a calm productivity profile inspired by GitHub/Resend.

## Product Modes
- Primary mode: Support/TI operational analysis.
- Secondary mode: Didactic exploration.

Rule:
- Primary mode actions must always have visual priority over didactic actions.

## Design Principles
- Keyboard-first for all primary actions.
- Low-noise visuals, clear hierarchy, dense but readable layout.
- Accessibility by default (focus-visible, dialog semantics, ARIA state).
- Responsive behavior with explicit density changes by breakpoint.

## Typography
- Keep current sans stack for now.
- Use only 4 semantic sizes: `12`, `14`, `16`, `20`.
- Titles and section labels must follow semantic role, not ad hoc sizing.

## Spacing Scale
- Spacing tokens: `4, 8, 12, 16, 20, 24`.
- Button heights:
- `sm`: 30px
- `md`: 36px (default)
- `lg`: 40px (primary only)

## Action Hierarchy
- `primary`: single dominant action per context (e.g. Run SQL).
- `secondary`: frequent but non-primary actions.
- `ghost`: supportive actions with low emphasis.
- `destructive`: explicit risk operations only.
- `icon-only`: compact utility actions with tooltip and aria-label.

## Keyboard System
- Single source of truth: each shortcut is defined once and rendered from the same map.
- No duplicated keybinding.
- Every shortcut badge must match runtime behavior.
- Provide one keyboard help surface (`?` or `Ctrl/Cmd+K` entry).
- For UX rewrite phase: allow single-letter shortcuts only in modal context, never as global workspace shortcuts.
- Modal shortcut baseline (rewrite backlog): `Enter` confirm, `Esc` cancel/close, `O` confirm, `A` cancel when focus is not in text input fields.

## Accessibility Rules
- Do not globally suppress focus outline.
- Use `:focus-visible` with high-contrast ring.
- All modals require: `role="dialog"`, `aria-modal="true"`, labelled title, Escape to close, focus trap, focus return.
- Sortable table headers require `aria-sort`.
- Toggle controls require semantic switch state and keyboard support.

## Layout Rules
- Desktop: 2-column workspace (schema + main).
- Tablet: collapsible schema; main workflow preserved.
- Mobile: progressive disclosure for secondary tools.

## Content Voice
- Operational surfaces: concise and neutral.
- Didactic guidance: contextual help, not always-on verbose blocks.
- Empty states and theme actions must avoid playful animations in primary flow.

## State Persistence UX
- Persist session and preferences in local storage.
- Always expose explicit controls to clear/reset stored UI state.
- For future release: support selective export/import of browser-stored data and preferences with clear scope labels and conflict strategy.

## Deferred Features (Backlog)
- Favorite instructions UX:
- Save from history to favorites.
- Favorites list with search/filter and quick load to editor.
- Settings portability UX:
- Export selected data scopes (favorites, history, theme, session, SQL tabs).
- Import with preview of selected scopes and merge/replace choice.

## Acceptance Gates (P0/P1/P2)
- P0: interaction trust (shortcuts, focus, dialogs, keyboard table operations).
- P1: shell hierarchy and responsive density.
- P2: durable systemization (tokens, components, command palette/help, motion standards).
