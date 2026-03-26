---
phase: 08-layout-foundation
plan: 01
subsystem: ui
tags: [next.js, app-router, route-groups, layout]

# Dependency graph
requires: []
provides:
  - "(public) route group com layout pass-through para login"
  - "(app) route group para todas as paginas autenticadas"
  - "Home page redirect baseado em auth (/ -> /dashboard ou /login)"
  - "/todos removido do produto"
affects: [08-02, 08-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Route groups (public)/(app) para separacao de layout"
    - "Server-side redirect na home page via createClient + getUser"

key-files:
  created:
    - apps/web/src/app/(public)/layout.tsx
    - apps/web/src/app/(public)/page.tsx
  modified:
    - apps/web/src/app/(public)/login/page.tsx (moved from app/login/)
    - apps/web/src/app/(app)/dashboard/ (moved from app/dashboard/)
    - apps/web/src/app/(app)/leads/ (moved from app/leads/)
    - apps/web/src/app/(app)/admin/ (moved from app/admin/)

key-decisions:
  - "Public layout como pass-through fragment -- login ja tem seu proprio centering"
  - "Home page como server component com redirect -- sem rendering condicional"

patterns-established:
  - "Route group (public): paginas sem sidebar/nav autenticada"
  - "Route group (app): paginas com auth guard e layout autenticado"

requirements-completed: [LAYOUT-02, MOBILE-03]

# Metrics
duration: 4min
completed: 2026-03-26
---

# Phase 08 Plan 01: Route Groups Summary

**Route groups (public) e (app) criados com login isolado, home como redirect por auth, e /todos removido**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-26T23:21:02Z
- **Completed:** 2026-03-26T23:25:17Z
- **Tasks:** 1
- **Files modified:** 26

## Accomplishments
- Route group (public) criado com layout pass-through e login page
- Route group (app) criado com todas as paginas autenticadas (dashboard, leads, admin)
- Home page (/) reescrita como server-side redirect baseado em auth status
- /todos page deletada (nao pertence ao produto)
- /auth/callback e /api/trpc mantidos no root (nao afetados)
- git history preservado via git mv

## Task Commits

Each task was committed atomically:

1. **Task 1: Create route groups and move all pages** - `3aee992` (feat)

## Files Created/Modified
- `apps/web/src/app/(public)/layout.tsx` - Public layout pass-through (fragment wrapper)
- `apps/web/src/app/(public)/page.tsx` - Home redirect (auth check -> /dashboard ou /login)
- `apps/web/src/app/(public)/login/page.tsx` - Login page (moved, unchanged)
- `apps/web/src/app/(app)/dashboard/page.tsx` - Dashboard page (moved, unchanged)
- `apps/web/src/app/(app)/dashboard/dashboard.tsx` - Dashboard client component (moved)
- `apps/web/src/app/(app)/dashboard/leaderboard-tab.tsx` - Leaderboard tab (moved)
- `apps/web/src/app/(app)/dashboard/personal-dashboard.tsx` - Personal dashboard (moved)
- `apps/web/src/app/(app)/leads/page.tsx` - Leads page (moved)
- `apps/web/src/app/(app)/leads/lead-list.tsx` - Lead list client component (moved)
- `apps/web/src/app/(app)/leads/new/page.tsx` - New lead page (moved)
- `apps/web/src/app/(app)/leads/[id]/page.tsx` - Lead detail page (moved)
- `apps/web/src/app/(app)/leads/[id]/lead-detail.tsx` - Lead detail client component (moved)
- `apps/web/src/app/(app)/admin/layout.tsx` - Admin layout (moved, temporary until Plan 03)
- `apps/web/src/app/(app)/admin/page.tsx` - Admin redirect to /admin/leads (moved)
- `apps/web/src/app/(app)/admin/leads/page.tsx` - Admin leads page (moved)
- `apps/web/src/app/(app)/admin/leads/leads-panel.tsx` - Admin leads panel (moved)
- `apps/web/src/app/(app)/admin/leads/[id]/page.tsx` - Admin lead edit page (moved)
- `apps/web/src/app/(app)/admin/leads/[id]/admin-lead-edit.tsx` - Admin lead edit component (moved)
- `apps/web/src/app/(app)/admin/users/page.tsx` - Admin users page (moved)
- `apps/web/src/app/(app)/admin/users/users-panel.tsx` - Admin users panel (moved)
- `apps/web/src/app/(app)/admin/stats/page.tsx` - Admin stats page (moved)
- `apps/web/src/app/(app)/admin/stats/stats-panel.tsx` - Admin stats panel (moved)
- `apps/web/src/app/(app)/admin/stats/stats-charts.tsx` - Admin stats charts (moved)
- `apps/web/src/app/(app)/admin/stats/stats-filters.tsx` - Admin stats filters (moved)
- `apps/web/src/app/page.tsx` - Deleted (old home page with health check)
- `apps/web/src/app/todos/page.tsx` - Deleted (not product relevant)

## Decisions Made
- Public layout como fragment pass-through: login page ja tem `flex min-h-svh items-center justify-center` proprio, layout nao precisa adicionar nada
- Home page como async server component com redirect: sem renderizacao visual, apenas redirect
- Admin layout mantido temporariamente: sera removido/substituido em Plan 03

## Deviations from Plan

None - plan executed exactly as written.

## Pre-existing Issues Found (Out of Scope)

Logged in `.planning/phases/08-layout-foundation/deferred-items.md`:
- Type errors em `save-lead.ts`, `update-lead.ts`, `update-lead.test.ts` (pre-existentes, nao relacionados a este plan)
- Lint issues em `lead-list.tsx` (nested ternary, exhaustive deps -- pre-existentes)

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all files are fully functional (moved as-is or created with complete logic).

## Next Phase Readiness
- Route groups prontos para Plan 02 adicionar (app)/layout.tsx com SidebarProvider e auth guard centralizado
- (public)/layout.tsx pronto para receber theming ou branding futuro
- Admin layout temporario sera substituido em Plan 03

## Self-Check: PASSED

All 12 verification points confirmed:
- All new files exist at correct locations
- All old locations removed (todos/, page.tsx)
- Root routes untouched (auth/callback, api/trpc)
- Commit 3aee992 verified in git log
- SUMMARY.md exists

---
*Phase: 08-layout-foundation*
*Completed: 2026-03-26*
