---
phase: 01-auth-migration
plan: 02
subsystem: api
tags: [supabase, trpc, jwt, rbac, drizzle, postgresql]

requires:
  - phase: 01-auth-migration/01
    provides: "Supabase client utilities (server.ts, client.ts), env vars, proxy.ts"
provides:
  - "tRPC context with Supabase JWT claims (getClaims)"
  - "protectedProcedure (authenticated users)"
  - "adminProcedure (role=admin only)"
  - "user_roles Drizzle table with app_role enum"
  - "Custom Access Token Hook SQL for Supabase"
affects: [01-auth-migration/03, 01-auth-migration/04, 02-lead-crud]

tech-stack:
  added: ["@supabase/ssr (packages/api)", "@supabase/supabase-js (packages/api)"]
  patterns: ["JWT claims-based auth in tRPC context", "Role-based procedure middleware", "pgEnum for RBAC roles"]

key-files:
  created:
    - packages/db/src/migrations/custom-access-token-hook.sql
  modified:
    - packages/api/src/context.ts
    - packages/api/src/index.ts
    - packages/api/package.json
    - packages/api/src/routers/index.ts
    - packages/db/src/schema/auth.ts

key-decisions:
  - "getClaims() em vez de getUser() no tRPC context (valida JWT via JWKS, sem network call extra)"
  - "setAll() no-op no context porque proxy.ts ja faz refresh de cookies"
  - "process.env.NEXT_PUBLIC_* direto no context (sem env package) porque roda no tRPC route handler"
  - "bigserial para id de user_roles (match com pattern SQL do Custom Access Token Hook)"
  - "Sem FK para auth.users no Drizzle (Drizzle gerencia apenas public schema)"

patterns-established:
  - "tRPC procedure tiers: publicProcedure < protectedProcedure < adminProcedure"
  - "JWT claims como source of truth para auth no backend (nao session objects)"
  - "app_role enum compartilhado entre Drizzle e Custom Access Token Hook"

requirements-completed: [AUTH-06, AUTH-07]

duration: 2min
completed: 2026-03-24
---

# Phase 01 Plan 02: tRPC Context + Procedures Summary

**tRPC context migrado para Supabase getClaims() com tres niveis de procedure (public, protected, admin) e schema Drizzle com user_roles + app_role enum**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-24T22:35:14Z
- **Completed:** 2026-03-24T22:37:31Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- tRPC context extraindo user claims e role via Supabase getClaims() (validacao JWT real)
- Tres niveis de procedure: publicProcedure, protectedProcedure (ctx.user), adminProcedure (ctx.userRole === "admin")
- Schema Drizzle limpo: removidas 4 tabelas Better-Auth, adicionada user_roles com app_role enum
- SQL do Custom Access Token Hook documentado para execucao manual no Supabase SQL Editor

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate tRPC context and procedures to Supabase Auth** - `3a10463` (feat)
2. **Task 2: Replace Drizzle schema - remove Better-Auth tables, add user_roles** - `8e7124c` (feat)

## Files Created/Modified
- `packages/api/src/context.ts` - tRPC context com createServerClient + getClaims()
- `packages/api/src/index.ts` - publicProcedure, protectedProcedure, adminProcedure
- `packages/api/package.json` - Removido @dashboard-leads-profills/auth, adicionado @supabase/ssr + supabase-js
- `packages/api/src/routers/index.ts` - privateData atualizado para ctx.user
- `packages/db/src/schema/auth.ts` - user_roles table com app_role enum (substituiu Better-Auth tables)
- `packages/db/src/migrations/custom-access-token-hook.sql` - SQL para Custom Access Token Hook

## Decisions Made
- getClaims() em vez de getUser() no tRPC context (valida JWT via JWKS sem network call extra)
- setAll() no-op no context porque proxy.ts ja faz refresh de cookies
- process.env.NEXT_PUBLIC_* direto no context (sem env package) porque roda no tRPC route handler
- bigserial para id de user_roles (match com pattern SQL do Custom Access Token Hook)
- Sem FK para auth.users no Drizzle (Drizzle gerencia apenas public schema)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] privateData router referenciava ctx.session.user**
- **Found during:** Task 1
- **Issue:** routers/index.ts usava ctx.session.user que nao existe mais no novo context shape
- **Fix:** Atualizado para ctx.user
- **Files modified:** packages/api/src/routers/index.ts
- **Verification:** Type check passou
- **Committed in:** 3a10463 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Fix necessario para corretude. Sem scope creep.

## Issues Encountered
None

## User Setup Required
**Custom Access Token Hook deve ser executado manualmente no Supabase SQL Editor.** Ver `packages/db/src/migrations/custom-access-token-hook.sql` para:
- Funcao PL/pgSQL que injeta user_role nos JWT claims
- Grants de permissao para supabase_auth_admin
- Deve ser executado APOS `bun run db:push` criar a tabela user_roles

## Next Phase Readiness
- tRPC backend completamente migrado para Supabase Auth
- Proximo passo: Plan 03 (cleanup de Better-Auth) pode remover packages/auth e referencias restantes
- Plan 04 (auth pages) pode usar os procedures protegidos

## Self-Check: PASSED

All 6 files verified present. Both commit hashes (3a10463, 8e7124c) confirmed in git log.

---
*Phase: 01-auth-migration*
*Completed: 2026-03-24*
