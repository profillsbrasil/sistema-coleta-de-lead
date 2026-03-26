---
plan: 06-05
phase: 06
status: complete
completed_at: "2026-03-25"
---

# Summary: Admin Stats Page + Dashboard Vendor Selector

## What was built

### Task 1 — Admin stats page
- `apps/web/src/app/admin/stats/page.tsx` — Server Component wrapper
- `apps/web/src/app/admin/stats/stats-panel.tsx` — Client Component principal com 4 stat cards (Total de Leads, Score Total, Leads Hoje, Vendedores Ativos), tabela de ranking paginada
- `apps/web/src/app/admin/stats/stats-filters.tsx` — Barra de filtros com vendor selector, tag selector, segment selector e date range picker com presets (Hoje, 7 dias, 30 dias, Todo período)
- `apps/web/src/app/admin/stats/stats-charts.tsx` — BarChart (leads por tag/método) e LineChart (leads ao longo do tempo) via Recharts + shadcn ChartContainer

### Task 2 — Dashboard vendor selector para admin
- `apps/web/src/app/dashboard/dashboard.tsx` — Vendor selector adicionado ao lado das tabs, visível apenas para usuários com `user_role === "admin"`
- `apps/web/src/app/dashboard/page.tsx` — Server Component atualizado para passar vendorId selecionado ao dashboard

## Key decisions

- Stats filtradas server-side via `trpc.admin.stats.*` com parâmetros de filtro
- Vendor selector no dashboard usa `useState` local; admin pode alternar entre vendedores sem recarregar a página
- Charts extraídos em sub-componente `stats-charts.tsx` para manter arquivos abaixo de 800 linhas

## Commits

- `b535f94` feat(06-05): pagina admin de stats globais com filtros, graficos e ranking
- `65318ce` feat(06-05): seletor de vendedor no dashboard para admin
- `080bc71` refactor(06-05): refinamentos na pagina de stats admin
