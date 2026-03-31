---
phase: 13-sync-visibility
plan: 01
subsystem: sync
tags: [react-context, dexie, sync-engine, callbacks, offline-first]

requires:
  - phase: 07-offline-sync
    provides: sync engine with push-then-pull cycle and ConnectivityDetector
provides:
  - SyncEngineCallbacks interface for engine lifecycle observation
  - startSync() accepts optional callbacks and external ConnectivityDetector
  - SyncStatusProvider with React Context exposing 5 sync status fields
  - useSyncStatus() hook for any component to consume sync state
affects: [13-02-sync-indicator, sidebar-user-menu, any future sync-dependent UI]

tech-stack:
  added: []
  patterns:
    - "Engine callback pattern: framework-agnostic lifecycle reporting via onSyncStart/onSyncEnd"
    - "Provider-owned detector: SyncStatusProvider creates ConnectivityDetector and passes to startSync"
    - "Atomic state batch: single useState object for isSyncing/lastSync/lastError to avoid flicker"
    - "useLiveQuery default value: always pass 0 as third arg to avoid undefined on first render"

key-files:
  created:
    - apps/web/src/components/sync-status-provider.tsx
    - apps/web/src/components/sync-status-provider.test.ts
  modified:
    - apps/web/src/lib/sync/engine.ts
    - apps/web/src/lib/sync/engine.test.ts
    - apps/web/src/components/providers.tsx

key-decisions:
  - "getBackoffDelay mocked to 0 in tests for instant retries instead of fake timers (IndexedDB async ops conflict with fake timers)"
  - "Interface members sorted alphabetically per Biome useSortedInterfaceMembers rule"
  - "Provider creates detector and passes to startSync for shared instance (Pitfall 1 avoidance)"

patterns-established:
  - "SyncEngineCallbacks: optional callbacks on startSync for lifecycle reporting without coupling engine to React"
  - "SyncStatusProvider: React Context wrapping children with 5 sync state fields derived from 3 sources"
  - "Promise-based test synchronization: wrapping onSyncEnd in a vi.fn that resolves a promise for async test completion"

requirements-completed: [ENH-02, ENH-08]

duration: 9min
completed: 2026-03-31
---

# Phase 13 Plan 01: Sync Status Infrastructure Summary

**Engine lifecycle callbacks (onSyncStart/onSyncEnd) e SyncStatusProvider com React Context expondo isOnline, isSyncing, pendingCount, lastSync e lastError para consumo por qualquer componente**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-31T01:57:16Z
- **Completed:** 2026-03-31T02:06:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- engine.ts refatorado com SyncEngineCallbacks interface e startSync aceitando callbacks opcionais + detector externo
- onSyncEnd reporta error somente apos todas 5 tentativas de retry falharem (D-11), erros transitorios nao aparecem
- SyncStatusProvider criado com 5 campos via React Context, pendingCount reativo via useLiveQuery
- SyncInitializer completamente removido de providers.tsx, substituido por SyncStatusProvider
- 25 testes passando (21 engine + 4 provider), cobrindo callbacks, retry exhaustion, e contrato do Context

## Task Commits

Each task was committed atomically:

1. **Task 1: Refatorar engine.ts para expor callbacks de lifecycle e aceitar ConnectivityDetector externo** - `d1d0777` (feat)
2. **Task 2: Criar SyncStatusProvider, useSyncStatus hook e substituir SyncInitializer em providers.tsx** - `3aa3e93` (feat)

## Files Created/Modified
- `apps/web/src/lib/sync/engine.ts` - SyncEngineCallbacks interface, startSync aceita callbacks e detector externo, syncWithRetry reporta lifecycle
- `apps/web/src/lib/sync/engine.test.ts` - 8 novos testes para callbacks (D-11 retry exhaustion, 401 clean exit, transient recovery)
- `apps/web/src/components/sync-status-provider.tsx` - SyncStatusProvider com Context, useSyncStatus hook, estado atomico
- `apps/web/src/components/sync-status-provider.test.ts` - 4 testes para exports e contrato do Provider
- `apps/web/src/components/providers.tsx` - SyncInitializer removido, SyncStatusProvider wrapping children

## Decisions Made
- Mocked `getBackoffDelay` to return 0 instead of using fake timers for retry tests (IndexedDB async operations conflict with vi.useFakeTimers)
- Provider creates the ConnectivityDetector and passes it to startSync, ensuring shared instance (avoids Pitfall 1 from RESEARCH.md)
- Single useState object `{ isSyncing, lastSync, lastError }` for atomic state updates (avoids Pitfall 2 - flicker)
- Promise-based test synchronization via wrapping onSyncEnd in a resolver for reliable async test completion

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Mock getBackoffDelay para retries instantaneos**
- **Found during:** Task 1 (engine callback tests)
- **Issue:** vi.useFakeTimers conflitava com operacoes async do IndexedDB (fake-indexeddb), causando timeout nos testes de retry
- **Fix:** Adicionado mock de `./constants` para retornar `getBackoffDelay: () => 0`, eliminando necessidade de fake timers
- **Files modified:** apps/web/src/lib/sync/engine.test.ts
- **Verification:** Todos 21 testes passando sem timeout
- **Committed in:** d1d0777

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Fix necessario para testes funcionarem corretamente com IndexedDB mock. Sem impacto no escopo.

## Issues Encountered
- Build pre-existente falhando por tipo RefObject em lead-list.tsx (pre-existing, fora do escopo)
- `resolveFirst!()` non-null assertion em teste existente de mutex (pre-existing Biome warning, fora do escopo)

## Known Stubs
None - all functionality is fully wired.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- SyncStatusProvider esta ativo e expondo estado via Context
- useSyncStatus() hook pronto para consumo pelo SyncStatusIcon (Plan 13-02)
- Plan 13-02 pode criar o componente visual que consome o Context

## Self-Check: PASSED

- All created files exist on disk
- All commit hashes found in git log
- 25 tests passing (engine + provider)
- No type errors in changed files
- Biome clean on all changed files

---
*Phase: 13-sync-visibility*
*Completed: 2026-03-31*
