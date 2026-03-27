# Phase 11: Dashboard + Visual Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-03-27
**Phase:** 11-dashboard-visual-polish
**Mode:** discuss
**Areas discussed:** AppTopbar + Breadcrumb, Dashboard layout, Polish scope, Leaderboard mobile

## Gray Areas Presented

| Área | Opções apresentadas |
|------|---------------------|
| AppTopbar breadcrumb | Dinâmico (usePathname) vs estático por página |
| SidebarTrigger scope | Apenas mobile vs todas as telas |
| Stat cards grid | 1→2→4 cols / 2→4 cols / 2→2→4 cols |
| Polish scope | Audit + fix / Impeccable formal / Só dashboard |
| Leaderboard mobile | Manter cards verticais / Converter para tabela horizontal |

## Decisions Made

### AppTopbar + Breadcrumb
- **Breadcrumb:** Dinâmico via `usePathname()`
- **SidebarTrigger:** Apenas mobile (< 768px) — sidebar desktop sempre expandida

### Dashboard layout
- **Remover:** `max-w-[480px]` do dashboard/page.tsx
- **Grid:** `grid-cols-1 → sm:grid-cols-2 → lg:grid-cols-4`

### Polish scope
- **Escolha:** Impeccable formal (arrange, adapt, polish, typeset) em todas as páginas autenticadas

### Leaderboard mobile
- **Escolha inicial:** Tabela com scroll horizontal
- **Correção pelo usuário:** Manter cards verticais — já legível em 320px

## Corrections Made

### Leaderboard mobile
- **Escolha inicial:** Converter para tabela com scroll horizontal
- **Correção:** Usuário corrigiu para manter cards verticais (escolha errônea na seleção)
- **Decisão final:** Cards verticais

## External Research

Nenhuma pesquisa externa necessária — codebase tinha informação suficiente.
