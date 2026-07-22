# Product Backlog

This file records product work requested or accepted as part of the cleanup plan and its delivery status.

## Data Integrity

### Virtual FK orphan validation
- Status: implemented
- Goal: block creation of a virtual FK when the proposed relationship would connect orphan records on either side of the join.
- Expected behavior:
  - validate real data compatibility before persisting the virtual FK
  - if orphan rows exist, do not create the relationship
  - show an explicit warning explaining why creation was blocked
  - generate a diagnostic SQL query that lists the orphan rows responsible for the block
- Rationale:
  - keeps the SQL Map surface honest
  - prevents the editor from suggesting a relationship that real data does not support
- Verification:
  - worker-based bidirectional orphan preflight blocks invalid relationships
  - the blocking dialog exposes diagnostic SQL for the incompatible rows

## SQL Map UX

### Floating drag affordance for virtual FK creation
- Status: implemented
- Goal: when the user drags one field onto another in the SQL Map, the relationship should visually follow the pointer instead of appearing only after drop.
- Expected behavior:
  - render a floating relationship draft that tracks the cursor
  - preserve readable source/target hover states during the drag
  - keep the effect lightweight and legible rather than ornamental
- Rationale:
  - improves perceived direct manipulation
  - makes the virtual FK gesture easier to understand before drop
- Verification:
  - an SVG draft edge follows the pointer and highlights compatible targets
  - the same relationship workflow is available with keyboard focus, Enter/Space, and Escape

## QA Tooling

### Table population workflow for synthetic data
- Status: implemented
- Goal: add a QA-oriented table seeding workflow so users can populate a chosen table with configurable volumes and per-column generation rules.
- Expected behavior:
  - inspect the selected table schema and list the columns before insertion
  - keep PK fields on the automatic path by default
  - allow per-column strategies based on type, including:
    - fixed numeric values
    - numeric increments with configurable start/step
    - random numeric ranges
    - fixed text
    - random or lorem-style text
    - other type-appropriate strategies introduced later
  - let the user define the target record count
  - insert the requested number of rows into the current database
- Intended use:
  - QA data setup
  - performance and load experiments against app databases
  - local stress tests such as `100_000` or `1_000_000` row scenarios
- Verification:
  - table actions open a schema-aware configuration dialog with type-specific strategies
  - insertion runs in one worker transaction with progress, rollback, cancellation, and a `1_000_000` row ceiling
  - volumes above `100_000` rows require explicit confirmation
