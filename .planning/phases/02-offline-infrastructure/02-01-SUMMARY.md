---
phase: 02-offline-infrastructure
plan: 01
subsystem: database
tags: [drizzle, dexie, indexeddb, postgresql, offline-first, vitest]

requires:
  - phase: 01-auth-supabase
    provides: Supabase auth schema, user_roles table, env validation
provides:
  - Drizzle leads table with bigserial PK, UUID local_id, soft-delete, indices
  - interestTag pgEnum (quente, morno, frio)
  - Dexie database with leads and syncQueue EntityTables
  - Shared Lead and SyncQueueItem TypeScript interfaces
  - Vitest test infrastructure for apps/web with fake-indexeddb
affects: [02-sync-engine, 02-trpc-leads, 03-lead-collection-ui]

tech-stack:
  added: [fake-indexeddb, jsdom, dexie (in apps/web)]
  patterns: [Dexie EntityTable typing, Drizzle pgEnum, soft-delete via deletedAt]

key-files:
  created:
    - packages/db/src/schema/leads.ts
    - apps/web/src/lib/db/types.ts
    - apps/web/src/lib/db/index.ts
    - apps/web/src/lib/db/dexie.test.ts
    - apps/web/vitest.config.ts
  modified:
    - packages/db/src/schema/index.ts
    - apps/web/package.json
    - vitest.workspace.ts
    - bun.lock

key-decisions:
  - "Dexie primary key em localId (UUID client-side) com serverId como indice secundario"
  - "syncStatus field no Lead para tracking de estado offline (pending, synced, conflict)"
  - "SyncQueue separada da tabela leads para operacoes de sync independentes"

patterns-established:
  - "Dexie EntityTable<T, PK> para tipagem forte de tabelas IndexedDB"
  - "Interfaces compartilhadas em types.ts separado do index.ts do Dexie"
  - "Vitest com jsdom + fake-indexeddb/auto para testes de IndexedDB no apps/web"

requirements-completed: [OFFL-01, OFFL-02]

duration: 3min
completed: 2026-03-24
---

# Phase 02 Plan 01: Data Foundation Summary

**Drizzle leads schema com soft-delete e indices + Dexie DB com leads/syncQueue EntityTables + Vitest para apps/web**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-24T23:58:51Z
- **Completed:** 2026-03-25T00:01:51Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Drizzle leads table com todos os campos (name, phone, email, company, position, segment, notes, interestTag, photoUrl, soft-delete, timestamps, local_id UUID, bigserial PK) e indices em userId, interestTag, updatedAt
- Dexie database configurado com leads (indexed por localId, serverId, userId, interestTag, syncStatus) e syncQueue (auto-increment, indexed por localId, operation, timestamp)
- Shared TypeScript interfaces (Lead com syncStatus tracking, SyncQueueItem com retryCount) como contrato entre Dexie e sync engine
- Vitest rodando em apps/web com jsdom environment e fake-indexeddb para testes de IndexedDB

## Task Commits

1. **Task 1: Drizzle leads schema + Dexie DB + shared types** - `5904285` (feat)
2. **Task 2: Test infrastructure para apps/web** - `4f5bb1e` (chore)

## Files Created/Modified

- `packages/db/src/schema/leads.ts` - Drizzle leads table com interestTagEnum, soft-delete, indices
- `packages/db/src/schema/index.ts` - Re-export de leads schema
- `apps/web/src/lib/db/types.ts` - Interfaces Lead e SyncQueueItem compartilhadas
- `apps/web/src/lib/db/index.ts` - Dexie database instance com leads e syncQueue EntityTables
- `apps/web/src/lib/db/dexie.test.ts` - Testes de CRUD no Dexie com fake-indexeddb
- `apps/web/vitest.config.ts` - Vitest config com jsdom + fake-indexeddb/auto + alias @/
- `apps/web/package.json` - Adicionado dexie, dexie-react-hooks, fake-indexeddb, jsdom, script test
- `vitest.workspace.ts` - Incluido apps/web no workspace
- `bun.lock` - Lock file atualizado

## Decisions Made

- Dexie primary key em `localId` (UUID gerado client-side) para funcionar offline sem dependencia de server ID
- `syncStatus` como campo do Lead (pending/synced/conflict) para tracking granular de estado offline
- SyncQueue como tabela separada para operacoes de sync independentes (create/update/delete com payload JSON)
- Biome auto-sorted propriedades das interfaces (ordem alfabetica) -- mantido pois nao afeta funcionalidade

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Instalacao de jsdom para environment Vitest**
- **Found during:** Task 1 (TDD GREEN phase)
- **Issue:** Vitest com environment "jsdom" requer jsdom package instalado
- **Fix:** `bun add -D jsdom --filter web`
- **Files modified:** apps/web/package.json, bun.lock
- **Verification:** Testes rodam com jsdom environment
- **Committed in:** 4f5bb1e (Task 2 commit)

**2. [Rule 3 - Blocking] Dexie nao estava em apps/web/package.json**
- **Found during:** Task 1
- **Issue:** Dexie estava apenas no root package.json mas nao como dependencia de apps/web
- **Fix:** Adicionado dexie e dexie-react-hooks como dependencias em apps/web/package.json
- **Files modified:** apps/web/package.json
- **Verification:** Import funciona, testes passam
- **Committed in:** 4f5bb1e (Task 2 commit)

**3. [Rule 3 - Blocking] Script test ausente em apps/web**
- **Found during:** Task 2
- **Issue:** apps/web nao tinha script "test" -- turbo ignorava o pacote no `bun run test`
- **Fix:** Adicionado `"test": "vitest run"` ao scripts
- **Files modified:** apps/web/package.json
- **Verification:** `bun run test` executa testes de apps/web (4 testes passam)
- **Committed in:** 4f5bb1e (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (3 blocking)
**Impact on plan:** Todas as correcoes eram pre-requisitos para o funcionamento. Sem scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all data structures are fully defined with proper types.

## Next Phase Readiness

- Drizzle leads schema pronto para `db:push` e `db:generate`
- Dexie DB pronto para ser usado pelo sync engine (02-02-PLAN)
- Shared types prontos para uso em tRPC procedures (02-03-PLAN)
- Test infrastructure pronta para testes de sync engine e procedures

---
*Phase: 02-offline-infrastructure*
*Completed: 2026-03-24*
