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
- Core semantic sizes are `12`, `14`, `16`, and `20` px.
- Dense operational metadata may use `9`, `10`, `11`, or `13` px when the same role is consistent across its component family.
- Section and modal headings may use `17`, `18`, `22`, or `24` px. The boot/offline display heading may use `34` px on large screens and `22` px at constrained widths.
- `font-size: 0` is permitted only on a wrapper that visually suppresses whitespace or a redundant text slot; accessible text must remain available through semantics.
- Titles and section labels follow semantic role, not ad hoc per-instance sizing.
- Font sizes do not scale continuously with viewport width. Responsive typography uses explicit breakpoint changes.

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
- SQL tabs use the `workbench rail` model: label-first tab hit area plus a distinct utility rail.
- In the workbench rail, `close` and `rename` are the only inline utilities. `rename` remains secondary to `close`.
- `rename` is exposed by the inline pencil action, `F2`, and double click on the title. Tabs must not rely on per-tab submenus for their primary editing actions, and the workbench rail must not render a `...` per-tab action menu.
- Tab close/rename affordances must remain discoverable on keyboard and touch. Hover may emphasize controls, but must not be the only way to discover the capability.
- SQL tab utility rails must not be implemented as absolute overlays with compensating label padding.
- When the tab strip overflows, it must keep horizontal scroll plus an explicit overflow entrypoint for hidden tabs.
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
- `<= 1100px`: result and utility groups may reduce density before the primary workspace collapses.
- `<= 980px`: SQL Map adapts its graph and inspector composition.
- `> 920px`: schema and editor render as two columns.
- `<= 920px`: schema defaults to collapsed when no saved user preference exists; F4/rail restores it.
- `<= 760px`: session/settings controls may recompose before the main mobile threshold.
- `<= 720px`: header actions recompose into a grid, database status occupies its own row, editor actions prioritize Run + SQL file actions + overflow trigger.
- `<= 640px`: first-run and settings surfaces use their narrow composition.
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

## Feature Status
- Favorite instructions UX:
- Save from history to favorites.
- Favorites list with search/filter and quick load to editor.
- Settings portability UX:
- Export selected data scopes (favorites, history, theme, session, SQL tabs).
- Import with preview of selected scopes and merge/replace choice.
- Implemented SQL Map gesture UX:
- Virtual-FK creation by drag-and-drop should feel materially dragged, with a floating relationship affordance that follows the pointer until drop/cancel.
- The gesture must keep target discovery readable and must not rely on heavy animation.
- Implemented SQL Map data integrity guardrail:
- Virtual FKs are UI-level relationships, but creation should still validate live data compatibility.
- If orphan rows exist on either side of the intended join, the UI should block creation and offer a generated SQL diagnostic that reveals the orphan records.
- Implemented QA data seeding UX:
- Provide a guided table-seeding flow that maps columns and lets the user configure deterministic or random generation rules per field before bulk insertion.
- The workflow should keep PK generation automatic by default, expose type-aware strategies for numeric/text/date-like fields, and make the target row count explicit before execution.
- The surface should communicate that this is a QA/performance utility, not a primary production workflow.

## Acceptance Gates (P0/P1/P2)
- P0: interaction trust (shortcuts, focus, dialogs, keyboard table operations).
- P1: shell hierarchy and responsive density.
- P2: durable systemization (tokens, components, command palette/help, motion standards).
# Localization Contract

- Supported locale tags are `en-US`, `pt-BR`, and `es-ES`; `en-US` is the final fallback.
- Visible copy, accessible names, status messages, validation feedback, empty states, and help content are localization surfaces.
- Use stable catalog keys and shared `Intl` formatting helpers. Do not format dates, numbers, relative time, or collation directly inside feature modules.
- Controls and layouts must tolerate at least 35% text expansion without clipping, overlap, or horizontal page scrolling.
- Keep SQL, filenames, user data, and database identifiers unchanged unless presentation explicitly requires locale formatting.
- The language selector is an option menu, not a decorative segmented control, and displays each language in its native name.

# Accessibility Contract

- Target WCAG 2.2 Level AA.
- Every input and control has a programmatic accessible name; placeholders never act as labels.
- Every pointer interaction has a keyboard equivalent or an adjacent accessible command surface.
- Result-table headers support keyboard sorting, freezing, moving, and resizing. Rows use roving focus, arrow navigation, and Space selection.
- Dialogs provide a name, modal semantics, focus containment, Escape/cancel behavior, and focus restoration.
- Dynamic status and errors use live regions without stealing focus.
- Focus indicators use `--ring`, remain visible in both themes, and are not removed without an equivalent replacement.
- Color is never the sole indicator of state, severity, selection, or relationship compatibility.

# Responsive Content Rules

- Fixed-format controls use stable dimensions, but user-facing labels may wrap when the translated text requires it.
- Header actions may reflow into additional rows; they must never overlap the database status or locale selector.
- Modal content must remain usable at 320 CSS px width and 400% browser zoom.
- Tables may scroll horizontally inside their own region; the document itself must not gain incoherent horizontal overflow.
