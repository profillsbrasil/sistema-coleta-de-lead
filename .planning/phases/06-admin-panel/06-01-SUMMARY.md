---
phase: 06-admin-panel
plan: "01"
subsystem: api
tags: [tRPC, admin, backend, auth, drizzle]
dependency_graph:
  requires: []
  provides:
    - trpc.admin.leads.*
    - trpc.admin.users.*
    - trpc.admin.stats.*
    - SUPABASE_SERVICE_ROLE_KEY env var
    - supabaseAdmin client singleton
  affects:
    - packages/api/src/routers/index.ts (AppRouter type extended)
    - apps/web (admin UI pages can now consume admin tRPC procedures)
tech_stack:
  added: []
  patterns:
    - adminProcedure middleware (role === "admin" guard)
    - db.execute() with raw SQL for cross-schema JOINs (auth.users)
    - vi.mock() for env + db in unit tests (avoid T3 Env validation at test time)
key_files:
  created:
    - packages/api/src/__tests__/admin-leads.test.ts
    - packages/api/src/__tests__/admin-users.test.ts
    - packages/api/src/__tests__/admin-stats.test.ts
    - packages/api/src/lib/supabase-admin.ts
    - packages/api/src/routers/admin/leads.ts
    - packages/api/src/routers/admin/users.ts
    - packages/api/src/routers/admin/stats.ts
    - packages/api/src/routers/admin/index.ts
  modified:
    - packages/env/src/server.ts
    - packages/api/src/routers/index.ts
decisions:
  - "vi.mock() para env e db em testes: T3 Env valida no import time; sem mock os testes falham com missing env var"
  - "delete+insert para updateRole: unique constraint em user_roles e (userId, role), nao apenas userId"
  - "db.execute() com raw SQL para JOINs cross-schema: drizzle nao suporta JOIN com auth.users diretamente"
  - "as unknown as T para cast de QueryResult: Drizzle db.execute() retorna QueryResult, nao array"
metrics:
  duration: "7 minutos"
  completed_date: "2026-03-25"
  tasks_completed: 4
  files_changed: 10
---

# Phase 06 Plan 01: Admin tRPC Backend Summary

Admin tRPC backend com tres sub-routers (leads, users, stats) usando adminProcedure middleware, Supabase Admin API para ban/unban, e raw SQL para JOINs cross-schema com auth.users.

## What Was Built

### Task 1: Test Scaffolds (TDD RED)
Tres arquivos de teste com `vi.mock()` para env e db. Todos os 16 testes admin falhavam antes da implementacao (RED confirmado).

### Task 2: Env + Supabase Admin Client + Admin Leads Router
- `packages/env/src/server.ts`: adicionado `SUPABASE_SERVICE_ROLE_KEY: z.string().min(1)` ao T3 Env
- `packages/api/src/lib/supabase-admin.ts`: singleton Supabase client com service_role key
- `packages/api/src/routers/admin/leads.ts`: procedures `listByUser`, `getById`, `update`, `delete`, `listVendors`

### Task 3: Admin Users Router
- `packages/api/src/routers/admin/users.ts`: procedures `list`, `updateRole`, `deactivate`, `reactivate`
- `list`: pagina via Supabase Admin API + join local com user_roles e leads count
- `deactivate`: ban de 876000h + demote para vendedor; self-ban bloqueado

### Task 4: Admin Stats Router + Wiring
- `packages/api/src/routers/admin/stats.ts`: procedures `getGlobalStats`, `getTimeline`, `getRanking`, `getDistinctSegments`
- `packages/api/src/routers/admin/index.ts`: compoe adminRouter
- `packages/api/src/routers/index.ts`: `admin: adminRouter` adicionado ao appRouter

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| vi.mock() para env e db em testes | T3 Env valida no import time; sem mock os testes falham com missing env var antes do test runner executar |
| delete+insert para updateRole | Unique constraint em user_roles e (userId, role), nao apenas userId; onConflictDoUpdate precisaria de target composto |
| db.execute() com raw SQL | Drizzle nao tem suporte nativo para JOIN com auth.users (cross-schema no Supabase); raw SQL com drizzle sql tag e a abordagem correta |
| as unknown as T | db.execute() retorna QueryResult, nao array; TypeScript nao permite cast direto sem intermediario unknown |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] vi.mock() adicionado nos test scaffolds**
- **Found during:** Task 1 (RED phase)
- **Issue:** Tests usam dynamic import de routers que importam env (T3 Env). Sem mock, todos os testes falhavam com "missing env var" ao inves de "module not found".
- **Fix:** Adicionados `vi.mock()` para `@dashboard-leads-profills/env/server`, `@dashboard-leads-profills/db`, schemas relevantes e `@supabase/supabase-js`.
- **Files modified:** packages/api/src/__tests__/admin-leads.test.ts, admin-users.test.ts, admin-stats.test.ts

**2. [Rule 1 - Bug] Type cast via `unknown` intermediario em db.execute()**
- **Found during:** Task 4 (type check)
- **Issue:** `db.execute()` retorna `QueryResult<Record<string, unknown>>` que nao pode ser cast diretamente para arrays tipados.
- **Fix:** Adicionado `as unknown as Array<T>` nos retornos de `db.execute()`.
- **Files modified:** packages/api/src/routers/admin/leads.ts, stats.ts
- **Commit:** 9806ef1

**3. [Rule 1 - Bug] delete+insert em vez de onConflictDoUpdate para updateRole e deactivate**
- **Found during:** Task 3 (implementation)
- **Issue:** `user_roles` tem unique constraint em (userId, role), nao apenas userId. onConflictDoUpdate com `target: [userRoles.userId]` e invalido.
- **Fix:** Substituido por delete + insert sequencial.
- **Files modified:** packages/api/src/routers/admin/users.ts

## Known Stubs

None. Todos os procedures estao implementados e retornam dados reais do banco.

## User Setup Required

`SUPABASE_SERVICE_ROLE_KEY` deve ser adicionado ao `apps/web/.env`:
- Obtido em: Supabase Dashboard -> Project Settings -> API -> service_role key (secret)
- A aplicacao falha ao iniciar se esta var estiver ausente (T3 Env import-time validation)

## Verification Results

- `packages/api` type check: PASS (0 errors)
- `bun run test` (vitest): 17/17 PASS
- biome check: PASS (9 arquivos verificados, 0 erros)

## Self-Check

### Files Created/Modified

- [x] packages/api/src/__tests__/admin-leads.test.ts
- [x] packages/api/src/__tests__/admin-users.test.ts
- [x] packages/api/src/__tests__/admin-stats.test.ts
- [x] packages/env/src/server.ts
- [x] packages/api/src/lib/supabase-admin.ts
- [x] packages/api/src/routers/admin/leads.ts
- [x] packages/api/src/routers/admin/users.ts
- [x] packages/api/src/routers/admin/stats.ts
- [x] packages/api/src/routers/admin/index.ts
- [x] packages/api/src/routers/index.ts

## Self-Check: PASSED
