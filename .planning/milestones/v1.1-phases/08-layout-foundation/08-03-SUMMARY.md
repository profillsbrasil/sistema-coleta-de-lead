---
phase: 08-layout-foundation
plan: 03
subsystem: ui
tags: [next.js, layout, cleanup, auth-guard, header, sidebar]

# Dependency graph
requires:
  - phase: 08-02
    provides: "(app)/layout.tsx com auth guard centralizado e SidebarProvider unico"
provides:
  - "Root layout limpo sem Header e sem grid wrapper"
  - "Header e AdminSidebar deletados do codebase"
  - "Auth guards per-page removidos (centralizados em (app)/layout.tsx)"
affects: [09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Root layout e pure shell: html + body + Providers + children"
    - "Auth centralizado em (app)/layout.tsx — paginas filhas nao fazem redirect"
    - "user?.id ?? '' para props userId (Biome noNonNullAssertion compliance)"

key-files:
  created: []
  modified:
    - apps/web/src/app/layout.tsx
    - apps/web/src/app/(app)/dashboard/page.tsx
    - apps/web/src/app/(app)/leads/page.tsx
    - apps/web/src/app/(app)/leads/new/page.tsx
    - apps/web/src/app/(app)/leads/[id]/page.tsx
  deleted:
    - apps/web/src/components/header.tsx
    - apps/web/src/components/admin-sidebar.tsx

key-decisions:
  - "user?.id ?? '' em vez de user!.id para satisfazer Biome noNonNullAssertion"
  - "emptyToNull corrigido para aceitar string | undefined (pre-existing type error)"

patterns-established:
  - "Root layout sem componentes de navegacao — navegacao vive exclusivamente no (app)/layout.tsx via AppSidebar"
  - "Paginas (app)/* nao fazem auth redirect — confiam no guard do (app)/layout.tsx"

requirements-completed: [LAYOUT-05, LAYOUT-06]

# Metrics
duration: 4min
completed: 2026-03-26
---

# Phase 08 Plan 03: Legacy Cleanup Summary

**Header e AdminSidebar deletados, root layout limpo para pure shell, auth guards per-page removidos com centralizacao em (app)/layout.tsx**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-26T23:41:24Z
- **Completed:** 2026-03-26T23:46:01Z
- **Tasks:** 2
- **Files modified:** 7 (2 deleted, 5 modified)

## Accomplishments
- Header topbar deletado completamente (substituido por AppSidebar na 08-02)
- AdminSidebar deletado completamente (absorvido no AppSidebar na 08-02)
- Root layout reduzido a html + body + Providers + children (sem grid wrapper)
- Auth guards duplicados removidos de 4 paginas (dashboard, leads, leads/new, leads/[id])
- Build completo passa (check-types, biome, next build)

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete legacy components and clean root layout** - `5b07694` (refactor)
2. **Task 2: Remove redundant per-page auth guards** - `a8f0084` (refactor)

## Files Created/Modified
- `apps/web/src/components/header.tsx` - DELETED (legacy topbar navigation)
- `apps/web/src/components/admin-sidebar.tsx` - DELETED (legacy admin sidebar)
- `apps/web/src/app/layout.tsx` - Removido Header import e grid wrapper
- `apps/web/src/app/(app)/dashboard/page.tsx` - Removido redirect, mantido getUser/getClaims
- `apps/web/src/app/(app)/leads/page.tsx` - Removido redirect, mantido getUser
- `apps/web/src/app/(app)/leads/new/page.tsx` - Removido todo codigo auth
- `apps/web/src/app/(app)/leads/[id]/page.tsx` - Removido redirect, mantido getUser
- `apps/web/src/lib/lead/save-lead.ts` - emptyToNull aceita string | undefined
- `apps/web/src/lib/lead/update-lead.ts` - emptyToNull aceita string | undefined

## Decisions Made
- Usado `user?.id ?? ""` em vez de `user!.id` para satisfazer a regra `noNonNullAssertion` do Biome. O fallback `""` nunca executa porque o (app)/layout.tsx garante usuario autenticado.
- Corrigido `emptyToNull` em save-lead.ts e update-lead.ts para aceitar `string | undefined` (LeadFormData tem campos opcionais do Zod). Era um type error pre-existente que so aparecia no next build (nao no tsc --noEmit do turbo).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] emptyToNull type mismatch com LeadFormData**
- **Found during:** Task 2 (build verification)
- **Issue:** `emptyToNull(value: string)` recebia `string | undefined` dos campos opcionais do Zod schema (email, company, position, segment, notes)
- **Fix:** Alterado para `emptyToNull(value: string | undefined)` com check `!value ||` antes
- **Files modified:** apps/web/src/lib/lead/save-lead.ts, apps/web/src/lib/lead/update-lead.ts
- **Verification:** `bun run build` passa sem type errors
- **Committed in:** a8f0084 (parte do commit Task 2)

**2. [Rule 1 - Bug] Biome noNonNullAssertion rejeita user!.id**
- **Found during:** Task 2 (biome check)
- **Issue:** Plan especificava `user!.id` mas Biome bloqueia non-null assertions
- **Fix:** Usado `user?.id ?? ""` que satisfaz Biome e e type-safe (fallback nunca executa)
- **Files modified:** dashboard/page.tsx, leads/page.tsx, leads/[id]/page.tsx
- **Verification:** `bunx biome check` passa sem erros
- **Committed in:** a8f0084 (parte do commit Task 2)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Ambos auto-fixes necessarios para build e lint passarem. Sem scope creep.

## Issues Encountered
- `bun run check` (ultracite) falha por config conflict com worktree Biome. Usado `bunx biome check` diretamente como workaround. Issue pre-existente, nao relacionada a este plan.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - no stubs detected.

## Next Phase Readiness
- Phase 08 (layout-foundation) esta completa: route groups, sidebar, e cleanup feitos
- Pronto para Phase 09 (responsividade e polish)
- Todas as rotas usam o novo layout com AppSidebar

## Self-Check: PASSED

---
*Phase: 08-layout-foundation*
*Completed: 2026-03-26*
