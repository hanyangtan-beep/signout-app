# Han Sign-out — Visual & UI Style Guide

This guide codifies the design system for **Han Sign-out** (`styles.css`, `index.html`, `src/app.js`). Every new component, panel, or AI helper must follow these tokens and conventions so the app keeps its calm, clinical-instrument feel.

---

## 1. Visual Direction & Colour System

The palette is defined in **OKLCH** in `styles.css` (`:root` and `[data-theme='dark']`). Never hardcode hex/RGB colours or undefined tokens (e.g. `--border`); always use the semantic CSS variables below.

| Role | Token | Light value | Dark value | Usage |
| :--- | :--- | :--- | :--- | :--- |
| Canvas background | `--color-bg` | `oklch(0.975 0.004 240)` | `oklch(0.16 0.015 250)` | Page backdrop behind cards |
| Card surface | `--color-surface` | `oklch(0.995 0.002 240)` | `oklch(0.20 0.015 250)` | Primary column panels, modals, inputs |
| Secondary surface | `--color-surface-2` | `oklch(0.955 0.006 240)` | `oklch(0.25 0.015 250)` | Segmented controls, subtle wells, edge rails |
| Default border | `--color-border` | `oklch(0.2 0.02 250 / 0.12)` | `oklch(0.9 0.01 250 / 0.14)` | Card outlines, dividers, inputs |
| Strong border | `--color-border-strong` | `oklch(0.2 0.02 250 / 0.28)` | `oklch(0.9 0.01 250 / 0.30)` | Hover borders, active pills |
| Primary text | `--color-text` | `oklch(0.22 0.02 250)` | `oklch(0.92 0.008 250)` | Body copy, report prose, labels |
| Muted text | `--color-text-muted` | `oklch(0.50 0.02 250)` | `oklch(0.70 0.01 250)` | Secondary metadata, hints, rail labels |
| Faint text | `--color-text-faint` | `oklch(0.68 0.015 250)` | `oklch(0.52 0.01 250)` | Placeholders, keyboard hints |
| Inverse text | `--color-text-inverse` | `oklch(0.985 0.002 240)` | `oklch(0.16 0.015 250)` | Text on primary filled buttons |
| Primary (Haematoxylin) | `--color-primary` | `oklch(0.42 0.09 262)` | `oklch(0.68 0.11 262)` | Active states, primary actions, AI tint |
| Primary hover | `--color-primary-hover` | `oklch(0.36 0.09 262)` | `oklch(0.75 0.11 262)` | Hover fill for primary actions |
| Primary highlight | `--color-primary-highlight` | `oklch(0.42 0.09 262 / 0.10)` | `oklch(0.68 0.11 262 / 0.18)` | Tinted pills, `.ai-btn` wash, active chips |
| Focus ring | `--color-primary-ring` | `oklch(0.42 0.09 262 / 0.35)` | `oklch(0.68 0.11 262 / 0.45)` | Keyboard focus outline |
| Alert (Eosin) | `--color-alert` | `oklch(0.55 0.16 10)` | `oklch(0.70 0.15 10)` | Validation errors, destructive confirmations |
| OK (Green) | `--color-ok` | `oklch(0.52 0.11 155)` | `oklch(0.68 0.11 155)` | Clean check status, saved indicator |
| Warning (Amber) | `--color-warn` | `oklch(0.55 0.12 70)` | `oklch(0.74 0.12 70)` | Non-blocking warnings, AI cautions |

**Theme parity rule:** Every new class must render cleanly in both light mode and `[data-theme='dark']` without overriding colour tokens with fixed colours.

---

## 2. Typography & Scale

- **UI body:** `--font-body` (`'Switzer', 'Inter', system-ui, sans-serif`)
- **Clinical monospace:** `--font-mono` (`'JetBrains Mono', 'SFMono-Regular', Menlo, monospace`) — used for accession numbers, block keys, report preview blocks, and keyboard shortcut badges.
- **Fluid type scale:** `--text-xs`, `--text-sm`, `--text-base`, `--text-lg`, `--text-xl`.
- **Voice & copy:** British English for clinical prose (*tumour, oestrogen, haematoxylin, lymphovascular*). Keep labels short and scannable; never include model version strings or marketing fluff inside button labels or collapsible summaries.

---

## 3. Spacing, Radii & Density

- **Spacing scale:** `--space-1` (4px), `--space-2` (8px), `--space-3` (12px), `--space-4` (16px), `--space-5` (20px), `--space-6` (24px), `--space-8` (32px), `--space-12` (48px).
- **Radii:** `--radius-sm` (4px) for tight chips/inputs, `--radius-md` (8px) for buttons/cards/sub-panels, `--radius-lg` (12px) for column surfaces and modals.
- **Compact density (`:root[data-density='compact']`):** Reduces vertical padding and control heights without shrinking font size. Any new control must inherit `--space-*` and avoid fixed pixel heights that break compact mode.
- **No inline styles:** Do not add `style="..."` in `index.html` or `el(..., { style: '...' })` in `src/app.js` for layout, margins, borders, or colours. Define reusable utility/component classes in `styles.css`.

---

## 4. Button Hierarchy

Keep the top bar and panels quiet by reserving visual weight for the primary action in each zone.

| Class | Role | Examples |
| :--- | :--- | :--- |
| `.btn.primary` | Single highest-priority action in a view | **Copy all**, **Apply**, **Save** |
| `.btn` | Standard secondary action | **New case**, **Export**, **Reset** |
| `.btn.ghost` | Quiet utility or inline control | Collapse chevron, **Clear**, **Dismiss** |
| `.btn.small` | Compact action inside card headers or rows | Per-block **Copy**, **Undo** |
| `.btn.ai-btn` | AI-assisted action (consistent haematoxylin tint) | **Parse with AI**, **Extract**, **Draft with AI**, **Fill form**, **Proofread**, **Run staging audit**, **Suggest IHC** |

### `.ai-btn` rules
- Uses `--color-primary-highlight` background, `1px solid color-mix(in oklch, var(--color-primary) 28%, transparent)` border, and `--color-primary` text.
- Hover deepens the wash slightly and strengthens the border; disabled reduces opacity to `0.5`.
- Always pair with `.small` inside cards, headers, or field rows so AI controls never overpower primary sign-out actions.
- Keep AI button text to 2–3 words (e.g. `Draft with AI`, `Fill form`, `Proofread`, `Run audit`, `Suggest IHC`).

---

## 5. AI Panels & Progressive Disclosure

AI tools must support sign-out without pushing the report or checklist below the fold.

- **Collapsed by default when idle:** Optional report-column AI panels (`Staging audit`, `IHC & differential`, `Proofread`) start collapsed (`open = false`) when they have no active findings, errors, or in-flight requests. They automatically open when a user runs them, when results/errors exist, or when explicitly opened (`localStorage`).
- **Clean summaries:** `<summary>` lines show the tool name and a short status pill (e.g. `ready`, `running…`, `2 notes`, `all clear`) — omit redundant model names or verbose instructions from the summary bar.
- **Shared spacing classes:** Use `.ai-shorthand` for the shorthand-to-report disclosure box, `.ai-row` for inline action rows (`margin-top: var(--space-2)`), `.ai-flag-row` for feedback flag pickers, and `.ai-field` for stacked AI inputs inside disclosure panels.
- **Undo & auditability:** Any AI action that mutates form fields or macro text must push an undo snapshot and display a concise status line.

---

## 6. Workspace Columns & Collapsible Edge Rails

### Breakpoints
- **Ultrawide (`>= 2000px`):** 3 columns (`0.8fr / 1.35fr / 1fr`, `gap: var(--space-8)`).
- **Wide desktop (`1400px–1999px`):** 3 columns (`0.85fr / 1.2fr / 0.95fr`, `gap: var(--space-6)`).
- **Standard desktop (`961px–1399px`):** 2 columns (`Case` stacked above `Histology` on the left; `Report` on the right).
- **Tablet (`701px–960px`):** Single-column stacked flow.
- **Phone (`<= 700px`):** `.mviews` top tabs + `.actionbar` bottom bar (`44px` touch targets, `16px` inputs). Column toggles and edge rails are hidden on `<= 700px`.

### Collapsible Columns & Edge Rails (`>= 961px`)
- **Top-bar toggle (`.col-switch`):** Three compact pills (`Case | Histology | Report`) styled identically to `.mode-switch` / `.mode-btn`. Active pills represent visible columns.
- **Per-column collapse button (`.col-collapse`):** Quiet ghost icon button (`«` / `»`) in each column header.
- **Slim edge rail (`.col-rail`):** When a column is collapsed, its grid track shrinks to `44px` (on 3-column wide layouts, or for `Report` on 2-column layouts; `Case` collapses to a slim horizontal bar on 2-column layouts). The rail displays:
  - Expand chevron (`»` or `«`)
  - Vertical label (`writing-mode: vertical-rl`)
  - Live status hint: accession number on **Case**, active part letter/count on **Histology**, and check status dot/count on **Report**.
- **Guardrails:**
  - At least **one** column must remain open; attempting to hide the last visible column is ignored.
  - When **Case** is collapsed, macro fields automatically render inside **Histology** so they remain editable.
  - When **Case** or **Report** is collapsed on desktop, **Histology** enables its 2-column packed field grid to use the reclaimed width.
- **Persistence & shortcuts:** State persists in `localStorage` under `signout.cols`. Keyboard shortcuts: `Alt+1` (Case), `Alt+2` (Histology), `Alt+3` (Report).

---

## 7. Accessibility & Keyboard First

- Every interactive control must have a visible `:focus-visible` ring (`--color-primary-ring`) and an `aria-label` or visible label.
- Toggle pills use `aria-pressed="true|false"`; collapse/expand buttons update `aria-expanded` and `title` with their keyboard shortcut.
- Respect `prefers-reduced-motion: reduce` by disabling non-essential transitions.
