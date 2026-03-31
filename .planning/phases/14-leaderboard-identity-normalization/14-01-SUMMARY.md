---
phase: 14-leaderboard-identity-normalization
plan: "01"
subsystem: api
tags: [trpc, sql, coalesce, postgresql, leaderboard, identity, testing]

# Dependency graph
requires:
  - phase: 12-export-workflows
    provides: admin routers (leads.ts, stats.ts) with raw SQL execute pattern
  - phase: 13-sync-status-indicator
    provides: no direct dependency
provides:
  - leaderboard ranking com fallback "Vendedor #N" via SQL CTE + ROW_NUMBER + COALESCE
  - admin/leads listVendors com name sempre non-null via SPLIT_PART email fallback
  - admin/stats getRanking com name sempre non-null + u.email no GROUP BY
  - LeaderboardEntry sem sufixo "(voce)"
  - Suite de testes leaderboard.test.ts com 7 casos cobrindo ENH-06
affects:
  - 14-02 (consumira os dados normalizados do leaderboard)
  - apps/web leaderboard display

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SQL CTE com ROW_NUMBER() OVER (ORDER BY ...) para ranking posicional
    - COALESCE com fallback string composto via SQL concatenation (|| rank)
    - SPLIT_PART(email, '@', 1) como fallback de nome para superficies admin
    - vi.doMock + vi.resetModules() para isolamento de modulos em tests

key-files:
  created:
    - packages/api/src/__tests__/leaderboard.test.ts
  modified:
    - packages/api/src/routers/leaderboard.ts
    - packages/api/src/routers/admin/leads.ts
    - packages/api/src/routers/admin/stats.ts
    - apps/web/src/components/leaderboard-entry.tsx
    - packages/api/src/__tests__/admin-leads.test.ts
    - packages/api/src/__tests__/admin-stats.test.ts

key-decisions:
  - "D-07: COALESCE inline em cada router vs shared helper — mantido inline; queries sao distintas (CTE vs SPLIT_PART)"
  - "CTE com ROW_NUMBER() para leaderboard publico garante rank baseado em posicao SQL, nao em index JS"
  - "SPLIT_PART(email, '@', 1) como fallback para admin porque vendedor tem email mas pode nao ter name configurado"
  - "isCurrentUser permanece no leaderboard para destacar visualmente via border-2 border-primary, sem interferir no nome"

patterns-established:
  - "Pattern: SQL COALESCE para nome non-null em todas as superficies de usuario"
  - "Pattern: testes com vi.doMock + vi.resetModules() para isolamento entre test cases do mesmo modulo"

requirements-completed:
  - ENH-06
  - ENH-09

# Metrics
duration: 5min
completed: "2026-03-31"
---

# Phase 14 Plan 01: Leaderboard Identity Normalization Summary

**SQL CTE + ROW_NUMBER() + COALESCE elimina nomes null em leaderboard publico e superficies admin, com fallback "Vendedor #N" para ranking e email prefix para admin.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-31T11:13:40Z
- **Completed:** 2026-03-31T11:18:41Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Leaderboard publico: query refatorada com CTE + ROW_NUMBER() OVER e COALESCE("rawName", 'Vendedor #' || rank) — name nunca nulo
- Admin surfaces: COALESCE + SPLIT_PART(email, '@', 1) em listVendors e getRanking — GROUP BY expandido para incluir u.email
- LeaderboardEntry: sufixo " (voce)" removido do campo name; isCurrentUser permanece para destaque visual via CSS

## Task Commits

1. **Task 1: Criar leaderboard.test.ts (RED)** - `0ef9398` (test)
2. **Task 2: Corrigir leaderboard.ts com CTE + ROW_NUMBER (GREEN)** - `827acef` (feat)
3. **Task 3: Corrigir admin/leads, admin/stats, leaderboard-entry + testes** - `cae48f1` (feat)

## Files Created/Modified

- `packages/api/src/__tests__/leaderboard.test.ts` - 7 test cases cobrindo ENH-06: fallback Vendedor #N, isCurrentUser, ausencia de (voce), campo rank
- `packages/api/src/routers/leaderboard.ts` - CTE + ROW_NUMBER() + COALESCE; JS layer apenas computa isCurrentUser
- `packages/api/src/routers/admin/leads.ts` - listVendors: COALESCE + SPLIT_PART para name non-null
- `packages/api/src/routers/admin/stats.ts` - getRanking: COALESCE + SPLIT_PART + u.email no GROUP BY
- `apps/web/src/components/leaderboard-entry.tsx` - sufixo "(voce)" removido; isCurrentUser so para estilo
- `packages/api/src/__tests__/admin-leads.test.ts` - novo test case listVendors com email prefix fallback
- `packages/api/src/__tests__/admin-stats.test.ts` - refatorado para vi.doMock + novo test getRanking

## Decisions Made

- **D-07 (COALESCE inline vs shared helper):** Mantido inline em cada router. As queries sao suficientemente distintas (leaderboard usa CTE+rank, admin usa SPLIT_PART) que um helper compartilhado adicionaria complexidade sem beneficio.
- **CTE com ROW_NUMBER():** Necessario porque o rank precisa ser computado no SQL para ser referenciado no COALESCE outer SELECT. Alternativa seria dois passes JS mas violaria DRY do ordenamento.
- **SPLIT_PART vs COALESCE com 'Vendedor':** Admin usa email prefix porque admin gerencia vendedores e o email e mais informativo que um numero generico.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript errors nos test files**
- **Found during:** Task 3 (verificacao de tipos pos-escrita)
- **Issue:** `leaderboard.test.ts` criado sem `userRole` no caller context (campo obrigatorio pelo tipo Context); array index access possivelmente `undefined` em varios test files
- **Fix:** Adicionado `userRole: "vendedor"` ao createCaller; substituido `result.ranking[0].name` por `result.ranking[0]?.name` usando optional chaining
- **Files modified:** leaderboard.test.ts, admin-leads.test.ts, admin-stats.test.ts
- **Verification:** `bun x tsc --noEmit` em packages/api sem erros
- **Committed in:** cae48f1 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug em test types)
**Impact on plan:** Correcao necessaria para type safety. Sem scope creep.

## Issues Encountered

Pre-existing type errors em `apps/web` (lead-list.tsx e update-lead.test.ts) sao out-of-scope desta fase. Documentados em `deferred-items.md`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 14-02 pode consumir os dados normalizados do leaderboard
- Todos os 22 testes em packages/api passando
- Types limpos em packages/api (sem erros tsc)

---
*Phase: 14-leaderboard-identity-normalization*
*Completed: 2026-03-31*
