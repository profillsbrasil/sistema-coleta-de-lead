---
phase: 08-layout-foundation
plan: 02
subsystem: ui
tags: [next.js, sidebar, shadcn, auth-guard, layout, server-component]

# Dependency graph
requires:
  - phase: 08-01
    provides: "Route groups (public)/(app) com todas as paginas movidas"
provides:
  - "(app)/layout.tsx com auth guard centralizado e SidebarProvider unico"
  - "AppSidebar com nav vendedor + admin collapsible role-gated"
  - "Admin layout simplificado para role guard only (sem SidebarProvider)"
  - "SidebarTrigger mobile-only para hamburger menu"
affects: [08-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Component auth guard centralizado em (app)/layout.tsx"
    - "SidebarProvider unico com defaultOpen para todas as rotas autenticadas"
    - "isAdmin passado como prop do server layout para client sidebar"
    - "AppSidebar com grupos Vendedor (sempre visivel) e Admin (collapsible, role-gated)"

key-files:
  created:
    - apps/web/src/app/(app)/layout.tsx
    - apps/web/src/components/app-sidebar.tsx
  modified:
    - apps/web/src/app/(app)/admin/layout.tsx

key-decisions:
  - "collapsible='offcanvas' em vez de 'none' para manter Sheet mobile funcional"
  - "SidebarTrigger apenas em md:hidden header dentro de SidebarInset"
  - "Admin layout mantem auth check redundante como defense-in-depth"

patterns-established:
  - "SidebarMenuButton com render={<Link href={...} />} para nav items (base-ui mode)"
  - "pathname.startsWith(href) para active state detection"
  - "getClaims() para role detection no server layout"

requirements-completed: [LAYOUT-01, LAYOUT-03, LAYOUT-07, MOBILE-03]

# Metrics
duration: 8min
completed: 2026-03-26
---

# Phase 08 Plan 02: App Layout + Sidebar Summary

**Auth guard centralizado em (app)/layout.tsx com SidebarProvider unico e AppSidebar unificado (vendedor + admin collapsible)**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-26T23:28:34Z
- **Completed:** 2026-03-26T23:36:34Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- AppSidebar criado com grupos Vendedor (Dashboard, Leads, Novo Lead) e Admin (Leads, Usuarios, Stats Globais)
- Auth guard centralizado em (app)/layout.tsx como async Server Component (getUser + getClaims)
- SidebarProvider unico em (app)/layout.tsx com defaultOpen — zero nested providers
- Admin layout simplificado para role guard only — sem SidebarProvider, sem AdminSidebar
- Mobile hamburger menu via SidebarTrigger em header md:hidden

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AppSidebar component** - `f990dad` (feat)
2. **Task 2: Create (app)/layout.tsx with auth guard + SidebarProvider and replace admin/layout.tsx** - `21ab63c` (feat)

## Files Created/Modified
- `apps/web/src/components/app-sidebar.tsx` - AppSidebar com vendedor + admin groups, collapsible offcanvas, active state via pathname
- `apps/web/src/app/(app)/layout.tsx` - Auth guard + SidebarProvider + SidebarInset + SidebarTrigger mobile
- `apps/web/src/app/(app)/admin/layout.tsx` - Role guard only (removido SidebarProvider e AdminSidebar)

## Decisions Made
- `collapsible="offcanvas"` escolhido em vez de `"none"` para preservar Sheet mobile (Pitfall 1 do Research)
- SidebarTrigger renderizado apenas em `md:hidden` header — desktop sidebar sempre expandida sem toggle
- Admin layout mantem `getUser()` check como defense-in-depth mesmo que `(app)/layout.tsx` ja faca auth

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - SidebarFooter renderizado vazio intencionalmente (UserMenu deferred para Phase 9 por design).

## Next Phase Readiness
- Plan 03 pode deletar Header, AdminSidebar e limpar root layout
- AppSidebar pronto para receber UserMenu no SidebarFooter (Phase 9)
- Admin routes protegidos por role guard centralizado

## Self-Check: PASSED

All verification points confirmed:
- All 3 created/modified files exist at correct locations
- Commits f990dad and 21ab63c verified in git log
- SidebarProvider exists only in (app)/layout.tsx
- Admin layout has no SidebarProvider or AdminSidebar
- SUMMARY.md exists

---
*Phase: 08-layout-foundation*
*Completed: 2026-03-26*
