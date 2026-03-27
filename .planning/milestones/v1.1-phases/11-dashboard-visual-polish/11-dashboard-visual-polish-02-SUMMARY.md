---
phase: 11-dashboard-visual-polish
plan: "02"
subsystem: apps/web
tags: [responsive, dashboard, chart, dark-mode, sidebar]
dependency_graph:
  requires: []
  provides: [dashboard-responsivo, chart-theme-aware, stat-grid-responsivo]
  affects: [apps/web/src/app/(app)/dashboard]
tech_stack:
  added: []
  patterns: [useSidebar-key-reset, ChartConfig-theme-aware, grid-responsivo-1-2-4]
key_files:
  created: []
  modified:
    - apps/web/src/app/(app)/dashboard/page.tsx
    - apps/web/src/app/(app)/dashboard/personal-dashboard.tsx
decisions:
  - "ChartConfig usa theme: { light, dark } em vez de color hardcoded — dark mode correto via CSS variables"
  - "chartData usa var(--color-quente/morno/frio) em vez de oklch inline — CSS variables injetadas pelo ChartContainer"
  - "ChartContainer key vinculado a useSidebar().open — garante resize do canvas apos sidebar toggle"
  - "Stat cards em grid 1->2->4 colunas — mobile-first sem overflow em 320px"
metrics:
  duration: "1 min"
  completed_date: "2026-03-27"
  tasks_completed: 2
  files_changed: 2
---

# Phase 11 Plan 02: Dashboard Responsivo + ChartConfig Theme-Aware Summary

Dashboard totalmente responsivo com remoção de max-w-[480px], grid de stat cards 1→2→4 colunas, ChartConfig theme-aware para dark mode correto via CSS variables, e key reset do ChartContainer vinculado ao useSidebar().open para resize correto após sidebar toggle.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remover max-w-[480px] do dashboard/page.tsx | c6f8470 | apps/web/src/app/(app)/dashboard/page.tsx |
| 2 | Grid responsivo + ChartConfig theme-aware + chart key reset | 3fc69ea | apps/web/src/app/(app)/dashboard/personal-dashboard.tsx |

## What Was Built

**Task 1 — dashboard/page.tsx:**
- Substituído `<div className="mx-auto w-full max-w-[480px] px-4 pt-8">` por `<div className="w-full">`
- O dashboard agora ocupa toda a largura do SidebarInset, alinhado com as demais páginas

**Task 2 — personal-dashboard.tsx:**
- Stat cards reorganizados: `grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4` (row 1: Total, Hoje, Quentes, Mornos) + `grid-cols-1 gap-4 sm:grid-cols-2` (row 2: Frios, Score)
- Skeleton de loading atualizado para refletir os novos grids (4 + 2 + chart)
- `chartConfig` migrado de `color: "oklch(...)"` para `theme: { light: "...", dark: "..." }` para dark mode correto
- `chartData` migrado de `fill: "oklch(...)"` para `fill: "var(--color-quente)"` etc. — CSS variables injetadas pelo ChartContainer
- `useSidebar` importado de `@dashboard-leads-profills/ui/components/sidebar`
- `ChartContainer` recebe `key={`leads-chart-${String(open)}`}` — força remount após sidebar toggle, corrigindo overflow

## Decisions Made

1. **ChartConfig theme vs color:** `theme: { light, dark }` é o campo correto do shadcn ChartConfig para dark mode. `color` é estático e não muda com o tema.
2. **CSS variables via ChartContainer:** O ChartContainer injeta `--color-{key}` como CSS vars no escopo do chart, resolvendo as cores corretas por tema. Usar `var(--color-quente)` no fill do chartData é o padrão correto.
3. **key reset do chart:** React Compiler + ResizeObserver não reagem ao toggle da sidebar. Forçar unmount/remount via `key` é a solução confiável para garantir que o Recharts recalcule a largura do canvas.
4. **Layout do skeleton:** Atualizado para 4+2+chart para ser consistente com o layout de dados reais.

## Deviations from Plan

None — plano executado exatamente como especificado.

## Known Stubs

None — todos os dados são wired via `useLiveQuery` (Dexie) e `overrideStats` prop.

## Self-Check: PASSED

- `apps/web/src/app/(app)/dashboard/page.tsx` existe e contém `className="w-full"` sem `max-w-[480px]`
- `apps/web/src/app/(app)/dashboard/personal-dashboard.tsx` existe e contém `grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4`, `theme: { light:`, `var(--color-quente)`, `leads-chart-${String(open)}`
- Commits c6f8470 e 3fc69ea confirmados no git log
- Biome check sem erros nos dois arquivos modificados
