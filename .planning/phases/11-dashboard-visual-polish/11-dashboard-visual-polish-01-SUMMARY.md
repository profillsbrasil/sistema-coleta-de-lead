---
phase: 11-dashboard-visual-polish
plan: "01"
subsystem: navigation/layout
tags: [topbar, breadcrumb, sidebar, mobile, navigation]
dependency_graph:
  requires: []
  provides: [AppTopbar]
  affects: [apps/web/src/app/(app)/layout.tsx]
tech_stack:
  added: []
  patterns: [use-client-leaf-component, dynamic-breadcrumb-from-pathname]
key_files:
  created:
    - apps/web/src/components/app-topbar.tsx
  modified:
    - apps/web/src/app/(app)/layout.tsx
decisions:
  - UUID_REGEX extraida para top-level para satisfazer Biome useTopLevelRegex
  - SidebarTrigger com className="-ml-1 md:hidden" permanece oculto em desktop
  - AppTopbar como leaf "use client" importada por Server Component layout
metrics:
  duration: 1min
  completed_date: "2026-03-27"
  tasks_completed: 2
  files_modified: 2
---

# Phase 11 Plan 01: AppTopbar com Breadcrumb Dinamico Summary

AppTopbar "use client" com SidebarTrigger mobile-only e breadcrumb dinamico derivado de usePathname() substituindo o header md:hidden no layout autenticado.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Criar app-topbar.tsx com SidebarTrigger mobile + breadcrumb dinamico | b0d39c1 | apps/web/src/components/app-topbar.tsx (created) |
| 2 | Substituir header md:hidden por AppTopbar no (app)/layout.tsx | da37f7b | apps/web/src/app/(app)/layout.tsx (modified), apps/web/src/components/app-topbar.tsx (fixed) |

## What Was Built

Novo componente `AppTopbar` permanente para o layout autenticado:

- `"use client"` na primeira linha — necessario para `usePathname()` (React hook)
- `SidebarTrigger` com `className="-ml-1 md:hidden"` — visivel apenas em mobile (< 768px)
- `ROUTE_LABELS` mapeando 6 segmentos de rota: dashboard, leads, new, admin, users, stats
- `UUID_REGEX` (`/^[0-9a-f-]{8,}$/`) definida no top-level do modulo (Biome compliance)
- `isUuid()` para detectar segmentos UUID e renderizar como "Detalhe"
- `buildSegments()` gerando array de breadcrumbs a partir do pathname atual
- Renderizacao: ultimo segmento como `BreadcrumbPage`, anteriores como `BreadcrumbLink + BreadcrumbSeparator`

O `(app)/layout.tsx` foi atualizado para:
- Remover `SidebarTrigger` da importacao (movido para AppTopbar)
- Adicionar `import { AppTopbar } from "@/components/app-topbar"`
- Substituir `<header className="flex h-14 items-center gap-2 border-b px-4 md:hidden">` por `<AppTopbar />`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Regex movida para top-level para satisfazer Biome useTopLevelRegex**
- **Found during:** Task 2 (verificacao Biome)
- **Issue:** O plano especificava `/^[0-9a-f-]{8,}$/` inline dentro da funcao `isUuid()`. Biome detectou `lint/performance/useTopLevelRegex` — regex em funcoes com chamadas frequentes causa alocacoes desnecessarias.
- **Fix:** Extraida como `const UUID_REGEX = /^[0-9a-f-]{8,}$/` no top-level do modulo; `isUuid()` usa `UUID_REGEX.test(segment)`.
- **Files modified:** apps/web/src/components/app-topbar.tsx
- **Commit:** da37f7b

## Verification Results

- `bunx biome check apps/web/src/components/app-topbar.tsx apps/web/src/app/(app)/layout.tsx` — sem erros
- `npx tsc --noEmit` (web app) — nenhum erro nos arquivos modificados (erros pre-existentes em update-lead.test.ts nao relacionados)
- Acceptance criteria verificados: "use client" na linha 1, `export function AppTopbar`, `SidebarTrigger className="-ml-1 md:hidden"`, `ROUTE_LABELS` com 6 chaves, `UUID_REGEX`, `buildSegments`, `BreadcrumbPage`, `BreadcrumbLink`, `BreadcrumbSeparator`

## Known Stubs

None — AppTopbar usa `usePathname()` com dados reais do router. Nenhum placeholder ou hardcoded value que afete a funcionalidade.

## Self-Check: PASSED

- [x] `apps/web/src/components/app-topbar.tsx` existe
- [x] `apps/web/src/app/(app)/layout.tsx` modificado com AppTopbar
- [x] Commit b0d39c1 existe (Task 1)
- [x] Commit da37f7b existe (Task 2)
