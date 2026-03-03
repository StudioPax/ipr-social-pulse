# UI Specification — Data & Research Application

Version 1.0 · Studio Pax

---

## 1. Audience & Design Principles

**Target user:** Researchers, analysts, and knowledge workers consuming dense quantitative and qualitative content.

| Principle | Rationale |
|-----------|-----------|
| **Information density first** | Users come to read, not to be impressed. Reduce chrome; maximize content. |
| **Scannable hierarchy** | F-pattern and Z-pattern reading; data must be findable in < 3 seconds. |
| **Accessible contrast** | WCAG AA minimum; data ink must never fail on contrast. |
| **Composable, not monolithic** | Every panel, figure, and table must work as a standalone embed. |
| **Responsive but desktop-primary** | Assume 1280–1920px workstations; graceful collapse to tablet. |

---

## 2. Recommended Technology Stack

### Core Framework: React 18 + Next.js 14 (App Router)
- Server components reduce bundle size for data-heavy pages
- Ideal surface for Claude Code: file-based routing is easy to reason about
- Strong Figma-to-code toolchain support

### Styling: Tailwind CSS v3 + CSS Custom Properties
- Claude Code generates Tailwind reliably and consistently
- Design tokens map directly: Figma Variables → CSS variables → Tailwind config
- Utility-first = easy diffing and AI-assisted editing

### Component Foundation: shadcn/ui (not a library — copied source components)
- Unopinionated primitives: Dialog, Tabs, Tooltip, DropdownMenu, etc.
- Claude Code can read and modify individual component files directly
- Official Figma community kit available (shadcn/ui UI Kit)
- Built on Radix UI for full accessibility out of the box

### Data Visualization: Recharts (primary) + Observable Plot (exploratory figures)
- Recharts: composable, React-native, easy for Claude Code to generate and modify
- Observable Plot: grammar-of-graphics API ideal for research-quality static figures
- Both accept raw JSON/CSV — no transformation layers needed

### Tables: TanStack Table v8
- Headless: complete control over markup and styling
- Handles sorting, filtering, pagination, column pinning natively
- Claude Code generates TanStack Table configs accurately from schema descriptions

### Type Rendering: MDX (Markdown + JSX)
- Allows mixed prose, figures, and interactive components in a single document
- Ideal for research content authored in plain text with embedded visualizations
- Direct import into Next.js App Router

---

## 3. Design Token Architecture

Tokens flow **one direction**: Figma → code. No manual sync.

```
Figma Variables
  ↓ (Tokens Studio plugin or Figma REST API)
tokens.json (Style Dictionary input)
  ↓
tailwind.config.ts + global.css (CSS variables)
  ↓
Components
```

### Token Categories

| Category | Example tokens | CSS variable pattern |
|----------|---------------|---------------------|
| Color / Semantic | `surface`, `surface-muted`, `border`, `accent` | `--color-surface` |
| Typography | `font-mono`, `font-sans`, `text-xs` → `text-2xl` | `--font-mono` |
| Spacing | `space-1` → `space-16` (4px grid) | inherited from Tailwind |
| Radius | `radius-sm`, `radius-md`, `radius-none` | `--radius` |
| Data ink | `chart-1` → `chart-8` (accessible palette) | `--chart-1` |

**Rule:** Never use raw hex values in component code. Always reference a token.

---

## 4. Layout System

### Page Shell

```
┌─────────────────────────────────────────────────────┐
│  TopBar [logo · project title · nav · user]         │
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│  SideNav │  ContentArea (scrollable)                │
│  (240px) │                                          │
│          │  ┌─────────────────────────────────────┐ │
│          │  │  PageHeader (sticky)                │ │
│          │  ├─────────────────────────────────────┤ │
│          │  │  Main content: figures / tables /   │ │
│          │  │  prose — variable column width      │ │
│          │  └─────────────────────────────────────┘ │
└──────────┴──────────────────────────────────────────┘
```

### Content Width Variants

| Context | Max-width | Use |
|---------|-----------|-----|
| Prose-only | `65ch` (readable measure) | Text-heavy sections |
| Mixed content | `900px` | Default research view |
| Full-bleed table | `100%` | Wide data tables |
| Dashboard | `1400px` | Multi-panel overview |

---

## 5. Component Specifications

### 5.1 Data Table

**Component:** `<DataTable>` — wraps TanStack Table

| Element | Spec |
|---------|------|
| Header row | `bg-surface-muted`, `text-xs uppercase tracking-wider`, sticky on scroll |
| Row height | 40px compact / 52px default |
| Cell alignment | Numbers: right-aligned, monospace. Text: left-aligned |
| Sorting | Chevron icon in header; active column highlighted with `accent` color |
| Row hover | `bg-surface-hover` (subtle, no border change) |
| Empty state | Centered illustration + message, same height as typical table body |
| Pagination | Bottom-right, shows "1–25 of 340 rows", compact |
| Column resize | Drag handle on header separator, cursor `col-resize` |

**Figma component:** One master component with variants: `size=compact|default`, `state=default|loading|empty`.

### 5.2 Figure / Chart Panel

**Component:** `<FigurePanel>` — wraps any chart child

| Element | Spec |
|---------|------|
| Container | `rounded-radius-md border border-border bg-surface p-4` |
| Figure title | `text-sm font-semibold text-foreground` — above chart |
| Subtitle / caption | `text-xs text-muted-foreground` — below chart |
| Chart area | Minimum height 200px; aspect-ratio `16/9` default; configurable |
| Tooltip | Dark surface, monospace values, no border radius (sharp = data-precise) |
| Legend | Below chart, horizontal, pill chips per series |
| Loading state | Skeleton shimmer matching chart shape |
| Download action | Icon button (↓) in top-right corner; exports SVG or PNG |

**Color palette rule:** Chart colors use `--chart-1` through `--chart-8` exclusively. Defined once in the token file, tested for colorblind accessibility.

### 5.3 Inline Data Card (KPI / Stat)

**Component:** `<StatCard>`

```
┌──────────────────────────┐
│  Label (muted, xs)       │
│  Value (2xl, mono, bold) │
│  ± Delta   Sparkline     │
└──────────────────────────┘
```

- Delta: green (`text-success`) positive, red (`text-destructive`) negative, neutral for zero
- Sparkline: 60px wide, 24px tall, no axes, Recharts `<LineChart>` simplified
- Grid: typically 2–4 cards per row in `grid grid-cols-2 lg:grid-cols-4 gap-4`

### 5.4 Prose + Figure Document View

For mixed research documents (MDX-rendered):

- Prose: `max-w-[65ch]` centered, `leading-relaxed`, system-serif or Lora for body
- Figures break out of prose column using negative margin: `mx-[-2rem] md:mx-[-4rem]`
- Footnotes: `text-xs text-muted-foreground border-t mt-8 pt-4`
- Section anchors: `#` icon on heading hover, links to permalink

---

## 6. Typography

| Role | Font | Weight | Size |
|------|------|--------|------|
| Page title | `font-display` (DM Serif Display) | 400 | `text-3xl` |
| Section heading | `font-sans` (DM Sans) | 600 | `text-xl` |
| Body text | `font-sans` | 400 | `text-sm` / `text-base` |
| Data / numbers | `font-mono` (JetBrains Mono) | 400–500 | `text-sm` |
| Labels / meta | `font-sans` | 400 | `text-xs` |
| Code blocks | `font-mono` | 400 | `text-xs` |

**Rule:** Numbers in tables and charts always use `font-mono` with `tabular-nums` for column alignment.

---

## 7. Color System (Light + Dark)

### Semantic Roles

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `background` | #FAFAF9 | #0F0F0E | Page background |
| `surface` | #FFFFFF | #1A1A19 | Cards, panels |
| `surface-muted` | #F4F4F3 | #242423 | Table headers, sidebars |
| `border` | #E5E5E3 | #2E2E2C | Dividers, input borders |
| `foreground` | #111110 | #EEEEEC | Primary text |
| `muted-foreground` | #6E6E6A | #888884 | Labels, captions |
| `accent` | #2563EB | #3B82F6 | Links, active states, CTAs |
| `success` | #16A34A | #22C55E | Positive deltas |
| `destructive` | #DC2626 | #EF4444 | Errors, negative deltas |

**Chart palette (8 stops, colorblind-safe):** `#2563EB` · `#D97706` · `#16A34A` · `#9333EA` · `#DB2777` · `#0891B2` · `#65A30D` · `#EA580C`

---

## 8. Figma ↔ Code Integration

### Recommended Figma Setup

1. **Figma Variables** for all design tokens (color, spacing, radius, typography)
2. **Components match shadcn/ui naming exactly:** Button, Card, Table, Badge, Dialog, Tabs
3. **Auto Layout** on all components — maps directly to Flexbox/Grid in code
4. **Variants** use `Property=Value` notation matching Tailwind variant names where possible

### AI Generation Workflow

| Tool | Role |
|------|------|
| Figma AI | Generate layout explorations from prompts; refine with the token set |
| Builder.io Figma plugin | Convert Figma frames to React/Tailwind code |
| Claude Code | Consume generated code + spec; refine, extend, maintain |
| Tokens Studio | Sync Figma Variables → `tokens.json` → CI pipeline |

### Claude Code Integration Rules

- All components live in `components/ui/` (shadcn convention) — Claude Code knows this path
- Each component file is self-contained for easier AI editing
- JSDoc comment at top of every component: `// @component DataTable — TanStack Table wrapper`
- All props typed with TypeScript interfaces defined in the same file
- No magic numbers: all values reference Tailwind classes or CSS variables

---

## 9. Interaction & States

Every interactive component must implement all states:

| State | Visual treatment |
|-------|-----------------|
| Default | Base token values |
| Hover | `bg-surface-hover` or underline; `transition-colors duration-150` |
| Focus | `ring-2 ring-accent ring-offset-2` — never remove outline |
| Loading | Skeleton shimmer (`animate-pulse`) matching element shape |
| Error | `border-destructive` + inline message, never color alone |
| Empty | Illustrated empty state with actionable prompt |
| Disabled | `opacity-50 cursor-not-allowed` |

---

## 10. Accessibility Baselines

- All color combinations meet WCAG AA (4.5:1 text, 3:1 UI elements)
- Keyboard navigation fully supported (Radix UI handles this for all shadcn components)
- `aria-label` required on all icon-only buttons
- Tables: `<thead>`, `<th scope="col">`, `<caption>` for all data tables
- Charts: provide `aria-label` describing the chart + a data table fallback
- Motion: wrap all animations in `@media (prefers-reduced-motion: reduce)`

---

## 11. File & Folder Conventions

```
app/
  layout.tsx          ← Shell with TopBar + SideNav
  [section]/page.tsx  ← Route pages
components/
  ui/                 ← shadcn primitives (auto-generated, don't edit)
  data/
    DataTable.tsx     ← TanStack Table wrapper
    FigurePanel.tsx   ← Chart container
    StatCard.tsx      ← KPI tile
    ProseDocument.tsx ← MDX renderer
lib/
  tokens.ts           ← Re-export CSS variable names as TS constants
  charts.ts           ← Shared Recharts config (colors, tooltip style)
styles/
  globals.css         ← CSS variables (generated from tokens.json)
tailwind.config.ts    ← Extends Tailwind with token values
```

---

*Spec owner: Studio Pax · For component behavior, refer to shadcn/ui docs. For token updates, modify `tokens.json` and re-run Style Dictionary.*
