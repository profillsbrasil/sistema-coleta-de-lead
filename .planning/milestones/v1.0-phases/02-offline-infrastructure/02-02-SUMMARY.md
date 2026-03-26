---
phase: 02-offline-infrastructure
plan: 02
subsystem: api, sync
tags: [trpc, drizzle, connectivity, offline, polling, exponential-backoff]

requires:
  - phase: 02-offline-infrastructure/01
    provides: "Dexie schema with leads table, SyncQueue, and Lead/SyncQueueItem types"
provides:
  - "tRPC syncRouter with pushChanges mutation and pullChanges query"
  - "Connectivity detector with navigator.onLine + 30s polling fallback"
  - "SYNC_CONFIG constants and getBackoffDelay utility"
affects: [02-offline-infrastructure/03, 03-lead-management]

tech-stack:
  added: []
  patterns: ["tRPC sync router with userId scoping", "closure-based connectivity detector", "payload sanitization via whitelist"]

key-files:
  created:
    - packages/api/src/routers/sync.ts
    - apps/web/src/lib/sync/connectivity.ts
    - apps/web/src/lib/sync/constants.ts
  modified:
    - packages/api/src/routers/index.ts

key-decisions:
  - "Whitelist sanitization de payload no pushChanges (apenas campos permitidos passam)"
  - "Closure-based connectivity detector (sem classe, sem estado global)"

patterns-established:
  - "Sync router: todas operacoes DB filtram por userId (seguranca)"
  - "Connectivity detector: notifica apenas em mudanca de estado"

requirements-completed: [OFFL-03, OFFL-05]

duration: 2min
completed: 2026-03-25
---

# Phase 02 Plan 02: Sync Procedures + Connectivity Summary

**tRPC pushChanges/pullChanges com userId scoping e connectivity detector com navigator.onLine + polling HEAD 30s**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-25T00:04:22Z
- **Completed:** 2026-03-25T00:06:33Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- tRPC syncRouter com pushChanges (create/upsert, update, soft-delete) e pullChanges (since-based, inclui soft-deleted)
- Todas operacoes DB filtradas por userId para prevenir acesso cross-user
- Connectivity detector com navigator.onLine + polling HEAD cada 30s, notificando apenas em mudanca de estado
- Sync constants com exponential backoff + jitter

## Task Commits

Each task was committed atomically:

1. **Task 1: tRPC sync router (pushChanges + pullChanges)** - `651ca1f` (feat)
2. **Task 2: Connectivity detector + sync constants** - `de01f5f` (feat)

## Files Created/Modified
- `packages/api/src/routers/sync.ts` - tRPC sync router com pushChanges mutation e pullChanges query
- `packages/api/src/routers/index.ts` - Registro do syncRouter no appRouter
- `apps/web/src/lib/sync/constants.ts` - SYNC_CONFIG e getBackoffDelay com exponential backoff + jitter
- `apps/web/src/lib/sync/connectivity.ts` - Connectivity detector com onLine events + polling fallback

## Decisions Made
- Whitelist sanitization no pushChanges: apenas campos permitidos (name, phone, email, company, position, segment, notes, interestTag, photoUrl) passam para o DB. Previne injection de campos arbitrarios.
- Closure-based connectivity detector em vez de classe: mais simples, sem estado global, encapsula bem o lifecycle.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Sanitizacao de payload no pushChanges**
- **Found during:** Task 1
- **Issue:** Plan passava payload direto do client para o DB sem filtrar campos. Um client malicioso poderia injetar campos arbitrarios (ex: userId de outro user).
- **Fix:** Adicionado ALLOWED_LEAD_FIELDS whitelist + sanitizePayload() que filtra campos antes de qualquer operacao DB.
- **Files modified:** packages/api/src/routers/sync.ts
- **Verification:** Type check passa, apenas campos permitidos chegam ao DB.
- **Committed in:** 651ca1f (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Sanitizacao essencial para seguranca. Sem scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- syncRouter e connectivity detector prontos para consumo pelo sync engine (Plan 03)
- pushChanges aceita operacoes da SyncQueue do Dexie
- pullChanges retorna leads atualizados para merge no Dexie
- Connectivity detector sera usado pelo sync engine para trigger de sync automatico

---
*Phase: 02-offline-infrastructure*
*Completed: 2026-03-25*
