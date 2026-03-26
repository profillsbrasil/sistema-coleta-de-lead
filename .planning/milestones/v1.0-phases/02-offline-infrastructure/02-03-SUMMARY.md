---
phase: 02-offline-infrastructure
plan: 03
subsystem: sync
tags: [dexie, trpc, offline-first, sync-engine, server-wins, conflict-resolution]

requires:
  - phase: 02-offline-infrastructure
    provides: "Dexie database schema (Plan 01), connectivity detector + sync constants (Plan 02)"
provides:
  - "Sync engine singleton with push-then-pull orchestration"
  - "Server-wins conflict resolution with toast notifications"
  - "Auto-sync on reconnect via connectivity detector subscription"
  - "SyncInitializer component wired into Providers"
affects: [03-lead-management, 04-dashboard-leaderboard]

tech-stack:
  added: []
  patterns: [push-then-pull sync cycle, tRPC vanilla client outside React tree, mutex-based concurrency guard, lazy dynamic import in provider]

key-files:
  created:
    - apps/web/src/lib/sync/engine.ts
    - apps/web/src/lib/sync/engine.test.ts
  modified:
    - apps/web/src/components/providers.tsx

key-decisions:
  - "tRPC vanilla client singleton (createTRPCClient) separate from React Query client for sync engine"
  - "Mutex via isSyncing boolean flag to prevent concurrent sync cycles"
  - "localStorage for lastSyncTimestamp persistence across sessions"
  - "Map server bigint id to number in Dexie (serverId field)"

patterns-established:
  - "Push-then-pull: always push local changes before pulling server updates"
  - "Server-wins: overwrite local unless local is newer AND pending"
  - "Lazy sync init: dynamic import in useEffect to keep sync engine outside SSR"
  - "Conflict toast: discrete info toast when server overwrites local data"

requirements-completed: [OFFL-03, OFFL-04, OFFL-05, OFFL-06]

duration: 4min
completed: 2026-03-25
---

# Phase 02 Plan 03: Sync Engine Summary

**Push-then-pull sync engine with server-wins conflict resolution, exponential backoff retry, 401-safe error handling, and connectivity-triggered auto-sync via tRPC vanilla client**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-25T00:08:06Z
- **Completed:** 2026-03-25T00:12:20Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Sync engine singleton orchestrates push-then-pull cycle via dedicated tRPC vanilla client
- Server-wins conflict resolution with discrete toast notification when server overwrites local data
- 401/UNAUTHORIZED errors stop sync without clearing local Dexie data or syncQueue
- Exponential backoff retry (up to 5 attempts) for transient network failures
- Connectivity detector subscription triggers auto-sync on reconnect
- Mutex (isSyncing flag) prevents concurrent sync cycles
- 13 passing unit tests covering push, pull, conflict resolution, error handling, and mutex
- SyncInitializer component lazy-imports engine in Providers for SSR safety

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Failing tests for sync engine** - `c0f15a3` (test)
2. **Task 1 (GREEN): Sync engine implementation** - `03beb0f` (feat)
3. **Task 2: Wire SyncInitializer into Providers** - `7b79f1f` (feat)

## Files Created/Modified

- `apps/web/src/lib/sync/engine.ts` - Sync engine singleton: pushChanges, pullChanges, syncCycle, syncWithRetry, startSync
- `apps/web/src/lib/sync/engine.test.ts` - 13 unit tests covering all sync behaviors
- `apps/web/src/components/providers.tsx` - Added SyncInitializer component with lazy import

## Decisions Made

- Used tRPC vanilla client (createTRPCClient) separate from React Query for sync engine, keeping it outside the React tree
- Mutex via simple boolean flag (isSyncing) rather than more complex locking since sync is single-threaded in browser
- localStorage for lastSyncTimestamp to persist pull checkpoint across page reloads
- Server bigint id mapped to Number for Dexie serverId field (safe for lead counts)
- SyncInitializer placed inside QueryClientProvider but independent of React Query (uses own tRPC client)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] jsdom localStorage not available in test environment**
- **Found during:** Task 1 (TDD GREEN phase)
- **Issue:** jsdom in this vitest environment provides a non-standard localStorage without clear/removeItem
- **Fix:** Created a Map-based localStorage mock via Object.defineProperty on globalThis
- **Files modified:** apps/web/src/lib/sync/engine.test.ts
- **Verification:** All 13 tests pass
- **Committed in:** 03beb0f (part of GREEN phase commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Test infrastructure fix, no scope change.

## Issues Encountered

None beyond the localStorage mock issue documented above.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all sync engine functionality is fully wired. Push sends to server, pull receives from server, conflict resolution applies server-wins, connectivity triggers auto-sync.

## Next Phase Readiness

- Sync infrastructure complete: Dexie schema (Plan 01), sync procedures + connectivity (Plan 02), sync engine (Plan 03)
- Phase 02 fully complete, ready for Phase 03 (lead management) which will use Dexie + syncQueue for offline CRUD
- Lead CRUD operations should add items to syncQueue and the engine will automatically push them on next cycle

---
*Phase: 02-offline-infrastructure*
*Completed: 2026-03-25*
