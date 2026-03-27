# Phase 11: Dashboard + Visual Polish - Research

**Researched:** 2026-03-27
**Domain:** Recharts ResponsiveContainer resize, shadcn Breadcrumb, Tailwind responsive grids, dark mode audit
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Criar componente `AppTopbar` com breadcrumb dinâmico baseado na rota atual via `usePathname()`. Mapeamento rota → rótulo implementado no componente (ex: `/dashboard` → "Dashboard", `/admin/leads` → "Admin > Leads").
- **D-02:** `SidebarTrigger` aparece apenas em mobile (< 768px, `md:hidden`). No desktop, sidebar sempre expandida (Phase 8 D-07/D-09) — sem trigger sem função.
- **D-03:** AppTopbar aparece em TODAS as páginas autenticadas dentro de `(app)/layout.tsx` — substituindo o `<header className="md:hidden">` atual.
- **D-04:** Componente `Breadcrumb` do `packages/ui/breadcrumb.tsx` já instalado — usar `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator`.
- **D-05:** Remover `max-w-[480px]` do `dashboard/page.tsx` — o dashboard passa a ocupar toda a largura disponível dentro do `SidebarInset`.
- **D-06:** Stat cards usam grid responsivo: `grid-cols-1` (mobile) → `sm:grid-cols-2` → `lg:grid-cols-4`. Mesmo padrão já usado em `admin/stats/stats-panel.tsx`.
- **D-07:** Charts já usam `ChartContainer` (ResponsiveContainer) — validar que redimensionam corretamente após sidebar toggle. Se necessário, forçar re-render via `ResizeObserver` ou key reset na mudança do estado da sidebar.
- **D-08:** Leaderboard mantém layout de cards verticais — já legível em 320px com rank + nome + score visíveis. Sem conversão para tabela horizontal. Validar que não há overflow em 320px.
- **D-09:** Impeccable formal em todas as páginas autenticadas: `/dashboard`, `/leads`, `/leads/new`, `/leads/[id]`, `/admin/leads`, `/admin/users`, `/admin/stats`. Skills aplicadas: `arrange` (layout/spacing), `adapt` (responsividade), `polish` (micro-details), `typeset` (tipografia).
- **D-10:** Dark mode audit incluído no polish — verificar todas as páginas em light e dark mode. Corrigir qualquer cor hardcoded ou elemento sem classe `dark:`.

### Claude's Discretion

- Mapeamento completo rota → rótulo para o breadcrumb (quais segmentos capitalizar, como tratar `[id]` dinâmico)
- Estratégia de resize dos charts após sidebar toggle (CSS transition vs ResizeObserver vs key reset)
- Sequência de aplicação do Impeccable (página por página ou por skill globalmente)
- Altura do AppTopbar (sugestão: `h-14` consistente com header atual)

### Deferred Ideas (OUT OF SCOPE)

- Nenhuma ideia fora do escopo surgiu durante a discussão
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RESP-04 | Dashboard stat cards usam grid responsivo (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`) | Pattern already in `admin/stats/stats-panel.tsx` — replicate to `personal-dashboard.tsx` |
| RESP-05 | Charts do dashboard redimensionam corretamente com `ResponsiveContainer` — sem overflow após sidebar toggle | Recharts `ResponsiveContainer` is the right primitive; sidebar state from `useSidebar()` hooks into re-render strategy |
| POLISH-01 | AppTopbar dentro de `SidebarInset` exibe SidebarTrigger + breadcrumb mostrando localização atual | `Breadcrumb*` suite already installed in `packages/ui/src/components/breadcrumb.tsx`, no new deps needed |
| POLISH-03 | Leaderboard exibe na horizontal com scroll no mobile (manter comparabilidade — rank + nome + score visíveis) | D-08 reverses "horizontal scroll" to "card layout validation" — current vertical cards already pass 320px test |
| POLISH-04 | Sidebar funciona corretamente em dark mode e light mode | Requires audit of hardcoded oklch colors in `personal-dashboard.tsx` and `stats-charts.tsx` — already patched with `dark:` variants on stat card colors |
| POLISH-05 | Polish visual com impeccable skills: espaçamento, tipografia, hierarquia visual consistentes em todas as páginas | Full audit of 7 authenticated routes applying arrange/adapt/polish/typeset skills |
</phase_requirements>

---

## Summary

Phase 11 is the final polish pass of the v1.1 milestone. Three parallel concerns must be addressed: (1) topology fix — replace the `md:hidden` header with a permanent `AppTopbar` containing `SidebarTrigger` + dynamic `Breadcrumb`; (2) dashboard responsiveness — stat cards grid and chart resize after sidebar toggle; and (3) impeccable visual quality across all authenticated routes.

All required components are already installed: `breadcrumb.tsx`, `chart.tsx` (wrapping Recharts `ResponsiveContainer`), and the `useSidebar()` hook that exposes `open`/`openMobile` state. No new library installs are expected. The dominant engineering challenge is charts failing to resize after sidebar CSS transition completes — this is a known Recharts/ResponsiveContainer pitfall that requires a deliberate re-render trigger.

The leaderboard concern (POLISH-03) is a clarification: D-08 locked the layout as vertical cards (already 320px-compatible), so POLISH-03 is primarily a validation task, not a refactor.

**Primary recommendation:** Implement in three sequential plans — (1) AppTopbar+Breadcrumb replacing the md:hidden header, (2) dashboard stat grid + chart resize fix, (3) leaderboard audit + global impeccable polish on all 7 routes.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 3.8.0 (project) / 3.8.1 (latest) | Charting with ResponsiveContainer | Already used; ChartContainer wraps it |
| next-themes | 0.4.6 | Dark/light mode switching | Already installed via catalog: |
| TailwindCSS | 4.1.18 | Responsive grid classes | Project standard |

### Already-Installed shadcn Components
| Component | Location | Used By Phase |
|-----------|----------|---------------|
| `Breadcrumb` + suite | `packages/ui/src/components/breadcrumb.tsx` | AppTopbar (POLISH-01) |
| `ChartContainer` | `packages/ui/src/components/chart.tsx` | Chart resize (RESP-05) |
| `useSidebar()` | `packages/ui/src/components/sidebar.tsx` | Sidebar state detection |
| `SidebarTrigger` | `packages/ui/src/components/sidebar.tsx` | AppTopbar mobile trigger |
| `useIsMobile()` | `packages/ui/src/hooks/use-mobile.ts` | Breakpoint 768px |

**Version verification:** recharts 3.8.1 is latest (project uses 3.8.0 — one patch behind, no action required). next-themes 0.4.6 is current. No installs needed for this phase.

---

## Architecture Patterns

### Recommended Project Structure

No new directories. New files:

```
apps/web/src/
├── components/
│   └── app-topbar.tsx       # NEW: SidebarTrigger + dynamic Breadcrumb
├── app/(app)/
│   └── layout.tsx           # MODIFY: replace md:hidden header with <AppTopbar />
│   └── dashboard/
│       ├── page.tsx         # MODIFY: remove max-w-[480px]
│       └── personal-dashboard.tsx  # MODIFY: grid responsive + chart resize
```

### Pattern 1: AppTopbar — Permanent Header Replacing md:hidden

**What:** A `"use client"` component inside `SidebarInset` that renders `SidebarTrigger` (mobile only via `md:hidden`) plus dynamic `Breadcrumb` derived from `usePathname()`.

**When to use:** Inserted in `(app)/layout.tsx` directly above `{children}`, replacing the current `<header className="flex h-14 items-center gap-2 border-b px-4 md:hidden">`.

**Key constraint (D-02):** `SidebarTrigger` must be `md:hidden` — desktop sidebar is always expanded. On desktop, only the breadcrumb renders.

**Example:**
```tsx
// apps/web/src/components/app-topbar.tsx
"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@dashboard-leads-profills/ui/components/breadcrumb";
import { SidebarTrigger } from "@dashboard-leads-profills/ui/components/sidebar";
import { usePathname } from "next/navigation";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  leads: "Leads",
  new: "Novo Lead",
  admin: "Admin",
  users: "Usuários",
  stats: "Estatísticas",
};

function buildSegments(pathname: string) {
  // Strip leading slash, split by "/"
  // Dynamic segments like [id] → treated as detail label
  // Returns array of { label, href }
}

export function AppTopbar() {
  const pathname = usePathname();
  const segments = buildSegments(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1 md:hidden" />
      <Breadcrumb>
        <BreadcrumbList>
          {/* rendered from segments */}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
```

### Pattern 2: Dynamic Breadcrumb Segment Mapping

**What:** `usePathname()` returns the current path; split by `/` and map each segment to a human-readable label. Dynamic route segments (e.g., UUID from `/leads/[id]`) should show "Detalhe" or be truncated.

**Route → Breadcrumb mapping (Claude's Discretion):**

| Route | Breadcrumb |
|-------|-----------|
| `/dashboard` | Dashboard |
| `/leads` | Leads |
| `/leads/new` | Leads > Novo Lead |
| `/leads/[id]` | Leads > Detalhe |
| `/admin/leads` | Admin > Leads |
| `/admin/users` | Admin > Usuários |
| `/admin/stats` | Admin > Estatísticas |

**Key insight:** For single-segment routes, use `BreadcrumbPage` (no link, current location). For multi-segment, render `BreadcrumbLink` for all intermediate segments and `BreadcrumbPage` for the last.

**Dynamic segment detection:** A segment is dynamic if it is not in `ROUTE_LABELS` (e.g., a UUID). Render it as "Detalhe" (or omit if undesirable).

### Pattern 3: Responsive Stat Cards Grid

**What:** Replace fixed `grid-cols-2` / `grid-cols-3` with mobile-first grid that matches the `admin/stats/stats-panel.tsx` pattern.

**Exact pattern to replicate:**
```tsx
// Source: apps/web/src/app/(app)/admin/stats/stats-panel.tsx line 141
<div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
```

**Target for `personal-dashboard.tsx`:**
```tsx
// Current: grid-cols-2 + separate grid-cols-3 row
// Target: unified grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
  <StatCard label="Total de Leads" value={stats.total} />
  <StatCard label="Leads Hoje" value={stats.hoje} />
  <StatCard label="Quentes" value={stats.quente} ... />
  <StatCard label="Mornos" value={stats.morno} ... />
  {/* Note: "Frios" and "Seu Score" may need grid placement decision */}
</div>
```

**Note on current layout:** `personal-dashboard.tsx` has 5 StatCards across two grids (2-col + 3-col) plus a standalone `StatCard` for score. The planner needs to decide how to merge 6 items into a responsive 4-column grid. Options: keep 2 rows (first 4 cards in one grid, score standalone), or use a single 4-col + 2-col grid.

### Pattern 4: Chart Resize After Sidebar Toggle

**What:** Recharts `ResponsiveContainer` listens to its DOM container's ResizeObserver. When the sidebar collapses/expands via a CSS `transition-[width] duration-200`, the container's width changes — but `ResponsiveContainer` may not fire its resize callback if the transition is not observed at the right time.

**Root cause:** Recharts uses an internal `ResizeObserver` on the container element. During CSS transitions, `ResizeObserver` DOES fire continuously — so the chart should resize correctly. However, if the chart is wrapped in a constrained parent (e.g., `max-w-[480px]` on `dashboard/page.tsx`), the outer constraint prevents proper sizing.

**Fix (two-part):**
1. Remove `max-w-[480px]` from `dashboard/page.tsx` (D-05) — this is the primary blocker.
2. Set `className="h-[Xpx] w-full"` on `ChartContainer` (already done in codebase per `h-[120px] w-full`).

**If resize still fails after removing max-width:** Use a `key` reset tied to the sidebar `open` state:

```tsx
// Source: useSidebar() from packages/ui/src/components/sidebar.tsx
"use client";
import { useSidebar } from "@dashboard-leads-profills/ui/components/sidebar";

// Inside PersonalDashboard or parent component:
const { open } = useSidebar();

// Pass as key to force chart re-mount after transition:
<ChartContainer key={String(open)} className="h-[120px] w-full" config={chartConfig}>
  ...
</ChartContainer>
```

**Caution with key reset:** Re-mounting re-runs animations and loses tooltip hover state. Prefer CSS transition + natural resize. Only use key reset as fallback.

**Alternative — ResizeObserver wrapper:**
```tsx
// Listen for sidebar transition end, then trigger state update:
const containerRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  const ro = new ResizeObserver(() => setChartKey(k => k + 1));
  if (containerRef.current) ro.observe(containerRef.current);
  return () => ro.disconnect();
}, []);
```

**Recommendation (Claude's Discretion):** Start with CSS-only (remove max-w, verify). If broken, use `useSidebar().open` as key — simpler than custom ResizeObserver.

### Pattern 5: Dark Mode Audit

**What:** Review all authenticated pages for hardcoded colors that don't adapt to dark mode.

**Known issues found in codebase:**

`personal-dashboard.tsx` already has `dark:` variants on StatCard oklch colors:
```tsx
// Already correct — pattern to follow for any new colored text:
className="[&_span:first-child]:text-[oklch(0.45_0.18_17)] dark:[&_span:first-child]:text-[oklch(0.85_0.12_17)]"
```

`stats-charts.tsx` uses hardcoded oklch fills in `barData`:
```tsx
{ tag: "Quente", count: tagData.quente, fill: "oklch(0.45 0.18 17)" }
```
These chart fills are passed directly to Recharts `<Bar>` via the `fill` prop — they bypass Tailwind dark mode. For charts, the correct pattern is to use CSS variables from `ChartConfig.color` which `ChartStyle` injects with theme-aware selectors. The current implementation hardcodes fills bypassing this system.

**Shadcn styling rule:** "No manual `dark:` color overrides. Use semantic tokens." For charts specifically, the `ChartConfig` color/theme fields emit CSS variables scoped per chart. Use `color: "oklch(...)"` in `ChartConfig` and reference via `var(--color-key)` in chart data, not inline hardcoded values.

### Pattern 6: AppTopbar Integration in Layout

**Current layout.tsx (lines 46-49):**
```tsx
<SidebarInset>
  <header className="flex h-14 items-center gap-2 border-b px-4 md:hidden">
    <SidebarTrigger />
  </header>
  <div className="flex-1 p-4 md:p-6">{children}</div>
</SidebarInset>
```

**Target (replace the header block):**
```tsx
<SidebarInset>
  <AppTopbar />
  <div className="flex-1 p-4 md:p-6">{children}</div>
</SidebarInset>
```

`AppTopbar` is `"use client"` (needs `usePathname`), so it must be a separate file imported into the Server Component `layout.tsx`.

### Anti-Patterns to Avoid

- **Hardcoded colors in chart `fill` props:** Use `var(--color-key)` references via `ChartConfig` color field — not inline oklch values in data arrays.
- **`space-y-*` for spacing:** Use `flex flex-col gap-*` (enforced by shadcn skill styling.md).
- **Manual `dark:` class overrides instead of semantic tokens:** Semantic tokens auto-adapt; manual overrides can be missed in either theme.
- **Conditional rendering with `useIsMobile()` for layout:** Use CSS `md:hidden` / `hidden md:block` to avoid hydration mismatch (established in Phase 10 decisions).
- **Nested SidebarProvider:** Only one in `(app)/layout.tsx`. Do not add another in `AppTopbar` or any dashboard component.
- **`usePathname()` without `"use client"`:** Hook requires client component boundary.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart resize detection | Custom ResizeObserver in each chart | Remove `max-w-[480px]` first; Recharts `ResponsiveContainer` handles it natively | ResponsiveContainer already uses ResizeObserver internally |
| Breadcrumb component | Custom styled nav | `Breadcrumb*` suite from `packages/ui/src/components/breadcrumb.tsx` | Already installed, zero new dependencies |
| Mobile breakpoint check | `window.innerWidth < 768` comparison | `useIsMobile()` from `packages/ui/src/hooks/use-mobile.ts` | Already configured with correct 768px threshold |
| Sidebar state read | `document.cookie` parsing | `useSidebar().open` from `packages/ui/src/components/sidebar.tsx` | Reactive state, works with SSR hydration |
| Dark mode toggle logic | Manual localStorage toggle | `next-themes` already installed; `ModeToggle` in SidebarFooter already handles it | Do not duplicate theme logic |
| Responsive grid | CSS grid media query in style tag | Tailwind `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` | Project standard, works with Biome formatter |

**Key insight:** Every primitive needed for Phase 11 is already in the codebase. This phase is assembly and verification, not new infrastructure.

---

## Common Pitfalls

### Pitfall 1: Charts Don't Resize After Sidebar Toggle
**What goes wrong:** After opening or closing the sidebar, Recharts charts remain at their pre-toggle width, causing overflow or empty space.
**Why it happens:** The `max-w-[480px]` constraint on `dashboard/page.tsx` is the primary cause — it limits the container that `ResponsiveContainer` observes. Secondary cause: chart parent doesn't reflow during CSS transition because it's constrained by an ancestor.
**How to avoid:** Remove `max-w-[480px]` first. Verify in browser. Only if still broken, add `key={String(open)}` from `useSidebar()` to force re-mount after toggle.
**Warning signs:** Chart appears correct on first render but wrong after toggling sidebar.

### Pitfall 2: `usePathname()` in a Server Component
**What goes wrong:** `AppTopbar` uses `usePathname()`, which is a React hook — calling it outside a Client Component causes a build error.
**Why it happens:** `(app)/layout.tsx` is a Server Component (it uses `async`, `await supabase.auth.getUser()`). Any hook must live in a separate `"use client"` file.
**How to avoid:** `AppTopbar` must be its own `"use client"` file. The layout imports and renders it as a leaf client component.
**Warning signs:** `Error: You're importing a component that needs "use client"`.

### Pitfall 3: Hardcoded oklch Colors Break Dark Mode in Charts
**What goes wrong:** Chart bars show the same color in dark mode as in light mode because the color is set directly on the data array item's `fill` property.
**Why it happens:** Recharts `fill` prop bypasses CSS variables and Tailwind's dark class. The `ChartStyle` component injects `--color-key` CSS variables that are theme-aware, but only if `ChartConfig` uses the `color` or `theme` fields.
**How to avoid:** Set colors in `chartConfig` and reference `var(--color-key)` in data, or use the `theme` object in `ChartConfig` for per-theme values.
**Warning signs:** In dark mode, chart bars look exactly the same as in light mode (not incorrect but unintuitive dark color).

### Pitfall 4: Breadcrumb Shows Raw UUID for Dynamic Routes
**What goes wrong:** For `/leads/abc-123-def`, the breadcrumb shows `abc-123-def` instead of a readable label.
**Why it happens:** The segment mapper doesn't handle dynamic segments (UUIDs, numeric IDs).
**How to avoid:** In `buildSegments()`, detect non-route segments (not in `ROUTE_LABELS` map AND looks like a UUID/number) and render as a generic label ("Detalhe") or skip if single-segment breadcrumbs are sufficient.
**Warning signs:** Breadcrumb displays long hex strings.

### Pitfall 5: `SidebarTrigger` Visible on Desktop
**What goes wrong:** The sidebar trigger button appears on desktop where sidebar is always visible, creating redundant/confusing UI.
**Why it happens:** Missing `md:hidden` on the `SidebarTrigger` wrapper.
**How to avoid:** Per D-02: `<SidebarTrigger className="-ml-1 md:hidden" />`. Always use CSS visibility, not `useIsMobile()` conditional, to avoid hydration mismatch.
**Warning signs:** On desktop viewport, a hamburger icon appears in the topbar next to the breadcrumb.

### Pitfall 6: Biome Violations During Polish
**What goes wrong:** CI fails after visual polish commits due to Biome linting errors.
**Why it happens:** Polish changes may inadvertently introduce `space-y-*`, `w-X h-X` instead of `size-X`, or manual ternaries in classNames.
**How to avoid:** Run `bun run check` (Biome check --write) before committing each plan.
**Warning signs:** `biome check` output with fixable errors.

---

## Code Examples

### AppTopbar Skeleton (Claude's Discretion for segment logic)
```tsx
// Source: packages/ui/src/components/breadcrumb.tsx (existing component)
// Source: packages/ui/src/components/sidebar.tsx (SidebarTrigger)
"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@dashboard-leads-profills/ui/components/breadcrumb";
import { SidebarTrigger } from "@dashboard-leads-profills/ui/components/sidebar";
import { usePathname } from "next/navigation";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  leads: "Leads",
  new: "Novo Lead",
  admin: "Admin",
  users: "Usuários",
  stats: "Estatísticas",
};

function isUuid(segment: string): boolean {
  return /^[0-9a-f-]{8,}$/.test(segment);
}

function buildSegments(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  return parts.map((part, i) => ({
    label: ROUTE_LABELS[part] ?? (isUuid(part) ? "Detalhe" : part),
    href: "/" + parts.slice(0, i + 1).join("/"),
    isLast: i === parts.length - 1,
  }));
}

export function AppTopbar() {
  const pathname = usePathname();
  const segments = buildSegments(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1 md:hidden" />
      <Breadcrumb>
        <BreadcrumbList>
          {segments.map((seg, i) => (
            <BreadcrumbItem key={seg.href}>
              {seg.isLast ? (
                <BreadcrumbPage>{seg.label}</BreadcrumbPage>
              ) : (
                <>
                  <span className="text-muted-foreground text-sm">{seg.label}</span>
                  <BreadcrumbSeparator />
                </>
              )}
            </BreadcrumbItem>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
```

### Stat Cards Responsive Grid (replicate from admin/stats/stats-panel.tsx)
```tsx
// Source: apps/web/src/app/(app)/admin/stats/stats-panel.tsx line 141
// Pattern: grid-cols-2 gap-4 lg:grid-cols-4 (existing)
// Target for personal-dashboard.tsx: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
  <StatCard label="Total de Leads" value={stats.total} />
  <StatCard label="Leads Hoje" value={stats.hoje} />
  <StatCard ... label="Quentes" value={stats.quente} />
  <StatCard ... label="Mornos" value={stats.morno} />
</div>
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
  <StatCard ... label="Frios" value={stats.frio} />
  <StatCard label="Seu Score" value={`${stats.score} pts`} />
</div>
```

### Chart Resize — Key Reset Strategy (fallback only)
```tsx
// Source: packages/ui/src/components/sidebar.tsx (useSidebar hook)
"use client";
import { useSidebar } from "@dashboard-leads-profills/ui/components/sidebar";

// In PersonalDashboard component body:
const { open } = useSidebar();

// Apply key to ChartContainer to force re-mount after sidebar toggle:
<ChartContainer
  key={`leads-chart-${String(open)}`}
  className="h-[120px] w-full"
  config={chartConfig}
>
  <BarChart data={chartData} layout="vertical">
    ...
  </BarChart>
</ChartContainer>
```

### Dark Mode — ChartConfig with theme-aware colors
```tsx
// Source: packages/ui/src/components/chart.tsx (ChartConfig type)
// Preferred pattern for theme-aware chart colors:
const chartConfig: ChartConfig = {
  quente: {
    label: "Quente",
    theme: {
      light: "oklch(0.45 0.18 17)",
      dark: "oklch(0.85 0.12 17)",
    },
  },
  morno: {
    label: "Morno",
    theme: {
      light: "oklch(0.5 0.13 85)",
      dark: "oklch(0.85 0.1 85)",
    },
  },
  frio: {
    label: "Frio",
    theme: {
      light: "oklch(0.45 0.15 240)",
      dark: "oklch(0.85 0.1 240)",
    },
  },
};

// In chartData, reference via var(--color-key) instead of hardcoded oklch:
const chartData = [
  { tag: "Quente", count: stats.quente, fill: "var(--color-quente)" },
  { tag: "Morno", count: stats.morno, fill: "var(--color-morno)" },
  { tag: "Frio", count: stats.frio, fill: "var(--color-frio)" },
];
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Header topbar for all pages | Sidebar + permanent topbar with breadcrumb | Phase 8-11 migration | Breadcrumb replaces page title in topbar |
| Fixed-width dashboard (max-w-[480px]) | Full-width within SidebarInset | Phase 11 D-05 | Charts and grids now use available space |
| md:hidden header (no breadcrumb) | Permanent AppTopbar with breadcrumb on all viewports | Phase 11 D-03 | Context indicator always visible |

**No deprecated approaches in Phase 11.** All patterns are additive refinements.

---

## Open Questions

1. **Stat cards count for personal-dashboard.tsx grid**
   - What we know: Currently 5 stat cards + 1 score card across 2 rows (2-col + 3-col). D-06 says `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`.
   - What's unclear: Whether to merge all 6 into a single grid or keep 2 rows. A 6-item grid on `lg:grid-cols-4` results in 4+2 layout which looks unbalanced.
   - Recommendation: Keep two separate grids — row 1: 4 cards (Total, Hoje, Quentes, Mornos) with `grid-cols-2 sm:grid-cols-2 lg:grid-cols-4`; row 2: 2 cards (Frios, Score) with `grid-cols-2`. Planner decides.

2. **Breadcrumb on multi-level admin routes**
   - What we know: Routes like `/admin/leads/[id]` don't exist yet (detail is at `/leads/[id]` for vendors). Admin routes are flat: `/admin/leads`, `/admin/users`, `/admin/stats`.
   - What's unclear: Does `buildSegments` need to handle 3-level nesting?
   - Recommendation: Handle up to 3 levels safely. Current routes are max 3 segments deep (`/admin/leads` = 2). Implement generic depth handling to avoid future regressions.

3. **Chart key reset timing relative to sidebar transition**
   - What we know: Sidebar CSS transition is `duration-200`. Key reset causes immediate re-mount, not after transition completes.
   - What's unclear: Should the key reset be delayed by 200ms to match transition? Or does immediate re-mount handle the final size correctly?
   - Recommendation: Try without delay first. If chart mounts at wrong size during transition, add `setTimeout(() => setChartKey(k => k + 1), 200)` tied to the `open` state change.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 11 is purely code/config changes. No new external dependencies, CLIs, or services required. All tools (Bun, Biome, Vitest, Node.js) are already verified from previous phases.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.1 |
| Config file | `apps/web/vitest.config.ts` (jsdom environment, fake-indexeddb) |
| Quick run command | `cd /home/othavio/Work/sistema-coleta-de-lead && bun run test` |
| Full suite command | `cd /home/othavio/Work/sistema-coleta-de-lead && bun run test` (single suite) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RESP-04 | Stat cards grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` in DOM | smoke/manual | visual viewport check at 320px, 640px, 1024px | N/A — CSS-only |
| RESP-05 | Charts resize correctly after sidebar toggle | manual | browser DevTools resize + sidebar toggle | N/A — visual/interactive |
| POLISH-01 | AppTopbar renders SidebarTrigger + breadcrumb | unit | `bun run test` + visual check | ❌ Wave 0 if needed |
| POLISH-03 | Leaderboard cards legible at 320px | manual | visual check at 320px | N/A — visual |
| POLISH-04 | Dark/light mode correct on all pages | manual | toggle dark mode, audit all 7 routes | N/A — visual |
| POLISH-05 | Spacing/typography/hierarchy consistent | manual | Impeccable audit of all 7 routes | N/A — subjective |

**Note on testability:** Phase 11 requirements are predominantly visual/behavioral. Unit tests cannot verify CSS layout or Recharts resize behavior. The validation strategy relies on browser-based visual verification (the verifier step), not Vitest unit tests. Existing unit test coverage (`fab.test.ts`, `stats.test.ts`, etc.) is not impacted by Phase 11 changes.

### Sampling Rate
- **Per task commit:** `bun run check` (Biome) + `bun run check-types` (TypeScript)
- **Per wave merge:** `bun run test` (full Vitest suite — must remain green, changes don't touch tested logic)
- **Phase gate:** Visual verification in browser at 320px, 768px, 1280px before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all testable logic in this phase. The phase adds no new functions requiring unit tests (only UI composition and class changes).

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 11 |
|-----------|-------------------|
| `"use client"` required for hooks | `AppTopbar` must be separate client component file |
| `cn()` from `@dashboard-leads-profills/ui/lib/utils` for all className composition | No string concatenation in classNames |
| No `space-y-*` or `space-x-*` (Biome/shadcn rule) | Use `flex flex-col gap-*` in polish pass |
| Double quotes (Biome) | All new strings use double quotes |
| Tabs indentation (Biome) | All new files use tab indentation |
| `bun run check` before commit | Run after each plan to ensure Biome compliance |
| Import from path-based exports, no barrel: `@dashboard-leads-profills/ui/components/breadcrumb` | Import `Breadcrumb*` from full path, not `@dashboard-leads-profills/ui` |
| Conventional Commits em Portugues | e.g., `feat: adicionar AppTopbar com breadcrumb dinamico` |
| shadcn skill applies | Breadcrumb component already installed, check `packages/ui/src/components/` before creating any component |
| No `any` types; no `console.log` in committed code | TypeScript strict; remove any debug logs |
| No dark: manual color overrides — use semantic tokens | Exception: oklch colors for charts use `ChartConfig.theme` pattern, not raw dark: overrides |

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `packages/ui/src/components/breadcrumb.tsx`, `chart.tsx`, `sidebar.tsx`, `use-mobile.ts`
- Direct codebase inspection — `apps/web/src/app/(app)/layout.tsx`, `dashboard/page.tsx`, `personal-dashboard.tsx`, `leaderboard-tab.tsx`, `admin/stats/stats-panel.tsx`, `stats-charts.tsx`
- Direct codebase inspection — `apps/web/src/components/leaderboard-entry.tsx`, `stat-card.tsx`
- `.agents/skills/shadcn/rules/styling.md` — semantic color rules, gap vs space-y, dark mode pattern
- `.planning/phases/11-dashboard-visual-polish/11-CONTEXT.md` — all locked decisions

### Secondary (MEDIUM confidence)
- Recharts ResponsiveContainer behavior with CSS transitions — based on how ResizeObserver fires during CSS transitions (standard DOM behavior), cross-verified with CONTEXT.md D-07 which anticipates needing ResizeObserver or key reset.

### Tertiary (LOW confidence)
- None — no unverified claims made.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all verified from package.json and direct file inspection
- Architecture patterns: HIGH — derived from existing codebase patterns (stats-panel.tsx grid, chart.tsx source)
- Pitfalls: HIGH (chart resize, usePathname client boundary) / MEDIUM (chart dark mode fix — ChartConfig.theme field present in type but not used in current codebase; fix is correct but untested)

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable stack, no fast-moving dependencies in scope)
