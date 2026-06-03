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

## Component Contracts
- Buttons use one primitive matrix: variant (`primary`, `secondary`, `ghost`, `destructive`, `icon-only`) and size (`sm`, `md`, `lg`).
- Runtime implementation classes:
- `ui-button ui-button-primary|ui-button-secondary|ui-button-ghost|ui-button-destructive|ui-button-icon`
- `ui-button-sm|ui-button-md|ui-button-lg`
- Button content slots are stable: optional icon/symbol, optional shortcut badge, label. Per-button visual alignment fixes are not allowed unless documented as a component rule.
- Inline field clear controls use `ui-inline-clear` plus `ui-button ui-button-icon ui-button-sm`; field-specific classes may only position/show the control inside its input wrapper.
- Segmented theme/session controls are switches, not action buttons. They require `role="switch"`, `aria-checked`, and visible state.
- Runtime switch implementation classes: `ui-switch`, `ui-switch-segmented`, `ui-switch-option`, `ui-switch-thumb`.
- Menu triggers implemented with `summary` must match button focus, hover, height, border, and radius behavior.
- SQL tabs follow the accessible tab pattern: tablist, tab roles, roving `tabindex`, ArrowLeft/ArrowRight navigation, Home/End navigation, active-tab scroll-into-view, and overflow affordance only when content exceeds the strip.
- Tab close/rename affordances must remain discoverable on keyboard and touch. Hover may emphasize controls, but must not be the only way to discover the capability.
- Empty states in the primary workflow are operational and low-motion. Didactic personality belongs in optional help/onboarding surfaces.
- Result toolbars must expose labels for compact/icon controls and keep pagination, filtering, sort reset, selection reset, and freeze reset visually distinct but consistent.

## Motion Policy
- Decorative or ambient animation must never be required to understand or complete a task.
- `prefers-reduced-motion: reduce` disables nonessential animation and transitions.
- Primary workflow feedback may use short motion only when it improves status visibility, such as running-state pulse or toast entry.

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
- `summary` menu triggers require the same focus-visible treatment as buttons.
- Horizontal tab overflow requires keyboard access and active-item visibility.

## Layout Rules
- Desktop: 2-column workspace (schema + main).
- Tablet: collapsible schema; main workflow preserved.
- Mobile: progressive disclosure for secondary tools.
- At constrained widths, preserve visibility of SQL tabs, Run, and database-open flow before secondary utilities.
- Prefer adaptive grouping and overflow menus over uncontrolled toolbar wrapping.
- Breakpoint contracts:
- `> 920px`: schema and editor render as two columns.
- `<= 920px`: schema defaults to collapsed when no saved user preference exists; F4/rail restores it.
- `<= 720px`: header actions recompose into a grid, database status occupies its own row, editor actions prioritize Run + SQL file actions + overflow trigger.
- `<= 560px`: result toolbar becomes single-column; tab titles shrink before controls disappear.

## Table And Result Semantics
- Sortable result headers must emit `aria-sort="none|ascending|descending"`.
- Multicolumn sort may visually display order badges, but the semantic direction on each sorted header still follows its own state.
- Pagination and utility controls use `ui-button-icon` or `ui-button-ghost`; they do not define independent button families.

## Primary Workflow Tone
- Primary workflow states must not use novelty animations, jokes, or mascot-style scenes.
- Offline, empty-result, and confirmation states use static operational copy and restrained visual hierarchy.
- Didactic examples may contain personality only inside optional help/onboarding/sample surfaces.

## Content Voice
- Operational surfaces: concise and neutral.
- Didactic guidance: contextual help, not always-on verbose blocks.
- Empty states and theme actions must avoid playful animations in primary flow.
- Interface language should be consistent within a surface; avoid mixing English labels into Portuguese operational controls unless the term is a conventional technical label.

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
