---
phase: 11-dashboard-visual-polish
plan: "03"
subsystem: ui/responsive
tags: [polish, responsive, dark-mode, layout, flex, gap]
dependency_graph:
  requires: [11-01, 11-02]
  provides: [POLISH-03, POLISH-05, RESP-04, RESP-05]
  affects: [leaderboard-tab, stats-panel, stats-charts, lead-list, lead-detail]
tech_stack:
  added: []
  patterns: [flex-gap over space-y, CSS vars for chart theme, layout-delegated padding]
key_files:
  modified:
    - apps/web/src/app/(app)/dashboard/leaderboard-tab.tsx
    - apps/web/src/app/(app)/admin/stats/stats-panel.tsx
    - apps/web/src/app/(app)/admin/stats/stats-charts.tsx
    - apps/web/src/app/(app)/leads/lead-list.tsx
    - apps/web/src/app/(app)/leads/[id]/lead-detail.tsx
decisions:
  - "flex flex-col gap-* substituiu space-y-* em todos os 3 arquivos restantes (padrao consistente com planos anteriores)"
  - "barData em stats-charts.tsx usa var(--color-quente/morno/frio) injetados pelo ChartContainer via tagChartConfig com theme"
  - "lead-list e lead-detail delegam padding para (app)/layout.tsx — removidas redundancias px-4 py-8 e max-w-[480px]"
metrics:
  duration: 1min
  completed_date: "2026-03-27"
  tasks_completed: 2
  files_modified: 5
---

# Phase 11 Plan 03: Dashboard Visual Polish Final Pass Summary

**One-liner:** Pass final de polish substituindo space-y por flex/gap, corrigindo dark mode dos charts via CSS vars, e removendo padding/max-width duplicados em leads pages.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Leaderboard polish + stats-panel space-y fix + stats-charts dark mode | cd15d76 | leaderboard-tab.tsx, stats-panel.tsx, stats-charts.tsx |
| 2 | Remover padding duplicado e max-w em lead-list e lead-detail | b207d85 | lead-list.tsx, lead-detail.tsx |

## What Was Built

**Task 1: space-y -> flex/gap + dark mode charts**

- `leaderboard-tab.tsx`: 3 ocorrencias de `space-y-2` convertidas para `flex flex-col gap-2` — skeleton loading state, container raiz e o `<ol>` da lista
- `stats-panel.tsx`: `space-y-2` no `RankingTableSkeleton` convertido para `flex flex-col gap-2`
- `stats-charts.tsx`: `tagChartConfig` expandido com chaves `quente`, `morno`, `frio` contendo `theme: { light, dark }` — permite que o `ChartContainer` injete CSS vars `--color-quente`, `--color-morno`, `--color-frio` conforme o tema ativo
- `stats-charts.tsx`: `barData` fill hardcoded `oklch(...)` substituido por `var(--color-quente)`, `var(--color-morno)`, `var(--color-frio)` — bars do chart agora mudam de cor em dark mode

**Task 2: Remover padding duplicado e max-width desnecessario**

- `lead-list.tsx`: wrapper `<div className="flex flex-col px-4 py-8">` + inner `<div className="mx-auto w-full max-w-[480px]">` removidos; substituidos por `<div className="flex flex-col gap-6">` unico; `mt-4` e `mt-6` nas secoes filhas removidos — gap-6 cuida do espacamento
- `lead-detail.tsx`: skeleton state `px-4 py-8` + `max-w-[480px]` removidos; substituido por `flex flex-col gap-4` direto — consistente com o `LeadForm` que ja era full-width

## Verification

- `bun run check-types`: PASSED (exit 0)
- `bun run test`: PASSED — 85 tests, 13 test files, todos verdes
- Grep confirms: nenhum `space-y-` restante nos 3 arquivos modificados na task 1
- Grep confirms: `var(--color-quente/morno/frio)` presente em stats-charts.tsx
- Grep confirms: `theme: {` presente em tagChartConfig
- Grep confirms: nenhum `max-w-[480px]` nem `px-4 py-8` em lead-list.tsx nem lead-detail.tsx

## Deviations from Plan

None — plan executed exactly as written. Pre-existing Biome warnings (nested ternary, useExhaustiveDependencies, aria-label em `<div>`) em lead-list.tsx estavam presentes antes das modificacoes deste plano e sao out-of-scope. Registrados abaixo para rastreamento.

## Deferred Items

Os seguintes Biome warnings em `lead-list.tsx` sao pre-existentes (nao introduzidos por este plano):

- `lint/correctness/useExhaustiveDependencies`: linha 39 — `setLimit(PAGE_SIZE)` effect com `activeTag` no array de dependencias
- `lint/style/noNestedTernary`: linhas 85-86 — ternary aninhado no JSX de renderizacao
- `lint/a11y/useAriaPropsForRole`: linha 106 — `aria-label` em `<div>` sem role semantico

## Known Stubs

None — todos os dados renderizados vem de fontes reais (Dexie/tRPC).

## Self-Check: PASSED

- `apps/web/src/app/(app)/dashboard/leaderboard-tab.tsx`: FOUND
- `apps/web/src/app/(app)/admin/stats/stats-panel.tsx`: FOUND
- `apps/web/src/app/(app)/admin/stats/stats-charts.tsx`: FOUND
- `apps/web/src/app/(app)/leads/lead-list.tsx`: FOUND
- `apps/web/src/app/(app)/leads/[id]/lead-detail.tsx`: FOUND
- Commit cd15d76: FOUND
- Commit b207d85: FOUND
