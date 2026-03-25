---
phase: 05-dashboard-leaderboard
plan: 01
subsystem: api, database
tags: [dexie, trpc, sql, leaderboard, stats, vitest, offline]

requires:
  - phase: 02-offline-sync
    provides: Dexie schema v1 com leads e syncQueue
  - phase: 03-lead-capture
    provides: Lead type e queries no Dexie
provides:
  - PersonalStats interface e getPersonalStats function (client-side, Dexie)
  - LeaderboardEntry type para cache offline
  - Dexie v2 com leaderboardCache table
  - leaderboardRouter tRPC com getRanking procedure (server-side, SQL)
affects: [05-02, 05-03, dashboard-ui, leaderboard-ui]

tech-stack:
  added: []
  patterns: [Dexie versioning incremental, raw SQL via drizzle sql tag, cross-schema JOIN auth.users]

key-files:
  created:
    - apps/web/src/lib/lead/stats.ts
    - apps/web/src/lib/lead/stats.test.ts
    - packages/api/src/routers/leaderboard.ts
  modified:
    - apps/web/src/lib/db/types.ts
    - apps/web/src/lib/db/index.ts
    - packages/api/src/routers/index.ts

key-decisions:
  - "Dexie version(2) incremental: mantem version(1) intacta, adiciona leaderboardCache"
  - "getPersonalStats usa Date comparison (nao string) para hoje — timezone-safe"
  - "leaderboardRouter usa raw SQL com drizzle sql tag para aggregation cross-schema"
  - "COALESCE fallback para nome: full_name -> email -> Unknown"

patterns-established:
  - "Dexie versioning: sempre manter versoes anteriores, adicionar nova version() com todas as stores"
  - "Stats calculation: filtrar leads no Dexie com .filter() para soft-delete, contar por tag"

requirements-completed: [DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07]

duration: 3min
completed: 2026-03-25
---

# Phase 05 Plan 01: Data Layer Summary

**Personal stats com score ponderado (quente=3/morno=2/frio=1), leaderboard tRPC com SQL aggregation e Dexie v2 para cache offline**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-25T10:44:39Z
- **Completed:** 2026-03-25T10:48:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- PersonalStats calculando total, breakdown por tag, leads de hoje (timezone-safe) e weighted score
- 7 testes unitarios passando para getPersonalStats
- Leaderboard tRPC procedure com SQL aggregation e JOIN auth.users para nomes
- Dexie v2 com leaderboardCache table para cache offline do ranking

## Task Commits

Each task was committed atomically:

1. **Task 1: Dexie types, schema update, and personal stats with TDD** - `344dc68` (feat)
2. **Task 2: Leaderboard tRPC procedure with SQL aggregation** - `0f64112` (feat)

## Files Created/Modified
- `apps/web/src/lib/db/types.ts` - Adicionado LeaderboardEntry interface
- `apps/web/src/lib/db/index.ts` - Dexie version(2) com leaderboardCache table
- `apps/web/src/lib/lead/stats.ts` - PersonalStats interface e getPersonalStats function
- `apps/web/src/lib/lead/stats.test.ts` - 7 testes unitarios para stats
- `packages/api/src/routers/leaderboard.ts` - leaderboardRouter com getRanking procedure
- `packages/api/src/routers/index.ts` - Registro do leaderboardRouter no appRouter

## Decisions Made
- Dexie version(2) incremental mantendo version(1) intacta para nao perder dados existentes
- getPersonalStats compara Date objects (nao strings ISO) para leads de hoje — timezone-safe
- leaderboardRouter usa raw SQL via drizzle `sql` tag para aggregation com cross-schema JOIN auth.users
- COALESCE fallback para nome do vendedor: full_name -> email -> "Unknown"
- ctx.db nao disponivel — importou db diretamente de @dashboard-leads-profills/db (mesmo pattern do syncRouter)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Worktree nao consegue rodar vitest por causa do fake-indexeddb module resolution. Testes foram copiados para o main repo temporariamente para verificacao e restaurados apos. Nao afeta o resultado.
- Pre-existing type error em packages/ui (scroll-area.tsx TS6133) nao relacionado — ignorado.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Data layer completo: PersonalStats (client) e getRanking (server) prontos para consumo pelos UI components
- Plans 02-03 podem importar getPersonalStats e usar trpc.leaderboard.getRanking
- LeaderboardEntry type pronto para cache offline do ranking

## Self-Check: PASSED

All 6 files verified present. Both commits (344dc68, 0f64112) verified in git log.

---
*Phase: 05-dashboard-leaderboard*
*Completed: 2026-03-25*
