---
phase: 07-auth-admin-fixes
plan: "01"
subsystem: auth
tags: [supabase, middleware, next.js, trpc, dexie, dashboard]

requires:
  - phase: 06-admin-panel
    provides: admin tRPC routers (admin.stats.getGlobalStats, admin.leads.listVendors) and admin layout with getClaims() pattern

provides:
  - Next.js middleware em src/ com default export correto para session refresh
  - dashboard/page.tsx com isAdmin via getClaims() consistente com admin/layout.tsx
  - /leads/new com auth guard server-side (redirect para /login quando nao autenticado)
  - PersonalDashboard com prop overrideStats para exibir stats de outros vendedores
  - Dashboard com query condicional getGlobalStats quando admin seleciona vendedor

affects:
  - auth (session refresh agora funciona corretamente em todos os requests)
  - admin-panel (admin ve stats reais do vendedor via tRPC ao inves de zeros do Dexie)

tech-stack:
  added: []
  patterns:
    - "getClaims() pattern: usar supabase.auth.getClaims() para role check em server components (ao inves de app_metadata)"
    - "overrideStats pattern: prop opcional para bypass do Dexie local quando admin visualiza outro vendedor"
    - "middleware em src/: Next.js exige middleware.ts em src/ com export default nomeado middleware"

key-files:
  created:
    - apps/web/src/middleware.ts
  modified:
    - apps/web/src/app/dashboard/page.tsx
    - apps/web/src/app/leads/new/page.tsx
    - apps/web/src/app/dashboard/personal-dashboard.tsx
    - apps/web/src/app/dashboard/dashboard.tsx

key-decisions:
  - "middleware.ts em src/ em vez de proxy.ts na raiz: Next.js ignora arquivos fora de src/ para middleware"
  - "getClaims() para isAdmin em dashboard/page.tsx: consistente com admin/layout.tsx, usa JWT sem network call"
  - "overrideStats prop no PersonalDashboard: hooks precisam ser incondicionais, overrideStats faz bypass apenas no render"
  - "today->hoje mapeamento em Dashboard: campo do servidor (today) mapeado para campo local (hoje) no PersonalStats"

patterns-established:
  - "Auth guard pattern: getUser() + redirect('/login') em server components para rotas protegidas"
  - "Admin role check: getClaims() -> claimsData?.claims?.user_role === 'admin' (padrao canonico)"

requirements-completed: [AUTH-05, ADMN-07]

duration: 3min
completed: "2026-03-26"
---

# Phase 07 Plan 01: Auth Admin Fixes Summary

**Next.js middleware movido para src/ com export default correto, admin ve stats reais via tRPC ao selecionar vendedor, e inconsistencias de auth pattern (getClaims, /leads/new guard) corrigidas**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-26T15:33:07Z
- **Completed:** 2026-03-26T15:36:30Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- AUTH-05 fechado: middleware.ts criado em src/ com `export default async function middleware` — Next.js agora carrega o middleware e dispara session refresh em cada request
- ADMN-07 fechado: admin que seleciona outro vendedor ve stats reais carregados via `trpc.admin.stats.getGlobalStats` ao inves de zeros do Dexie local
- Consistencia de auth pattern: dashboard/page.tsx agora usa `getClaims()` identico a admin/layout.tsx (removendo app_metadata/user_metadata)
- Auth guard em /leads/new: rota agora redireciona para /login quando usuario nao autenticado, consistente com /leads e /leads/[id]

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: Criar middleware.ts e deletar proxy.ts (AUTH-05)** - `0f003c9` (fix)
2. **Task 2: Corrigir isAdmin para getClaims() e adicionar auth guard em /leads/new** - `f7a6acc` (fix)
3. **Task 3: ADMN-07 — overrideStats em PersonalDashboard e vendor stats via tRPC em Dashboard** - `a09a0ad` (fix)
4. **Lint/format fixes via biome** - `41af549` (chore)

## Files Created/Modified

- `apps/web/src/middleware.ts` - Novo middleware Next.js com export default correto para session refresh
- `apps/web/proxy.ts` - DELETADO (arquivo fora de src/ era ignorado pelo Next.js)
- `apps/web/src/app/dashboard/page.tsx` - Substituido app_metadata/user_metadata por getClaims()
- `apps/web/src/app/leads/new/page.tsx` - Convertido para async server component com auth guard
- `apps/web/src/app/dashboard/personal-dashboard.tsx` - Adicionada prop overrideStats opcional
- `apps/web/src/app/dashboard/dashboard.tsx` - Adicionada query condicional getGlobalStats para stats de vendedor
- `packages/ui/src/components/scroll-area.tsx` - Removido import React nao utilizado (auto-fix)

## Decisions Made

- `middleware.ts` em `src/` com `export default function middleware`: Next.js exige o arquivo em `src/` e o nome especifico `middleware` como export default
- `overrideStats` prop usa `useLiveQuery` sempre (hooks incondicionais), apenas o render usa `overrideStats ?? localStats`
- Mapeamento `today -> hoje`: campo `today` do servidor mapeado para campo `hoje` do `PersonalStats` local

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removido import React nao utilizado em scroll-area.tsx**
- **Found during:** Task 2 (verificacao de tipos)
- **Issue:** `import * as React from "react"` em scroll-area.tsx causava erro TS6133 pre-existente bloqueando check-types
- **Fix:** Removido o import nao utilizado (Base UI usa JSX transform automatico)
- **Files modified:** `packages/ui/src/components/scroll-area.tsx`
- **Verification:** `bun run check-types` passou sem erros
- **Committed in:** f7a6acc (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug pre-existente)
**Impact on plan:** Auto-fix necessario para viabilizar check-types. Sem escopo adicional.

## Issues Encountered

- `bun run check` falha quando executado no worktree por conflito de biome.json com o worktree do GSD. Solucao: executar `bun x biome check --config-path /path/to/biome.json` diretamente nos arquivos modificados.

## Known Stubs

None — todos os campos estao conectados a fontes de dados reais (Dexie local para vendedor normal, tRPC para admin visualizando outro vendedor).

## Next Phase Readiness

- Fase 07 completa — todos os 4 gaps do audit v1.0 fechados
- Sistema pronto para v1.0: auth funcional, admin com dados reais, offline-first com sync

---
*Phase: 07-auth-admin-fixes*
*Completed: 2026-03-26*

## Self-Check: PASSED

All files and commits verified:
- FOUND: apps/web/src/middleware.ts
- FOUND: proxy.ts deleted (confirmed absent)
- FOUND: apps/web/src/app/dashboard/page.tsx
- FOUND: apps/web/src/app/leads/new/page.tsx
- FOUND: apps/web/src/app/dashboard/personal-dashboard.tsx
- FOUND: apps/web/src/app/dashboard/dashboard.tsx
- FOUND commit: 0f003c9 (Task 1)
- FOUND commit: f7a6acc (Task 2)
- FOUND commit: a09a0ad (Task 3)
