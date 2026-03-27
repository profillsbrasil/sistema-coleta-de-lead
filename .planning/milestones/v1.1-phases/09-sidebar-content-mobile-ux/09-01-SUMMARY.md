---
phase: 09-sidebar-content-mobile-ux
plan: 01
subsystem: ui
tags: [sidebar, gravatar, theme-toggle, mobile-ux, touch-targets, active-state]

requires:
  - phase: 08-layout-foundation
    provides: "SidebarProvider, AppSidebar skeleton, route groups (app)/(public)"
provides:
  - "getGravatarUrl utility (SHA-256, Web Crypto API)"
  - "SidebarUserMenu component (avatar, name, role, ModeToggle, logout)"
  - "AppSidebar with user props, auto-close mobile, touch targets 44px, active state"
  - "Layout passing user data as server props to AppSidebar"
affects: [09-02-PLAN, mobile-responsiveness, admin-sidebar]

tech-stack:
  added: []
  patterns:
    - "Server-side user data extraction passed as props (zero client fetch)"
    - "useRef + useEffect for mobile drawer auto-close on pathname change"
    - "ThemeIcon extracted component to avoid nested ternary (Biome rule)"
    - "Top-level regex constant for Biome useTopLevelRegex compliance"

key-files:
  created:
    - apps/web/src/lib/gravatar.ts
    - apps/web/src/components/sidebar-user-menu.tsx
  modified:
    - apps/web/src/app/(app)/layout.tsx
    - apps/web/src/components/app-sidebar.tsx

key-decisions:
  - "useRef+useEffect pattern instead of pathname dependency array to satisfy Biome useExhaustiveDependencies"
  - "ThemeIcon extracted as separate component to avoid nested ternary (Biome noNestedTernary)"
  - "userEmail kept in props interface for future use (prefixed with _ to satisfy unused param lint)"

patterns-established:
  - "Gravatar URL generation: SHA-256 via Web Crypto API, d=404 for fallback trigger"
  - "Sidebar footer pattern: SidebarMenu > SidebarMenuItem > flex layout with avatar+info+actions"
  - "Touch target minimum: min-h-11 (44px) on all SidebarMenuButton nav items"
  - "Active state: exact match for /leads, startsWith for all other routes"

requirements-completed: [LAYOUT-04, LAYOUT-08, MOBILE-01, MOBILE-02, MOBILE-04, MOBILE-05, TOUCH-01, TOUCH-04, POLISH-02]

duration: 4min
completed: 2026-03-27
---

# Phase 09 Plan 01: Sidebar Content & Mobile UX Summary

**Sidebar completa com user menu (Gravatar + ModeToggle + logout), auto-close mobile, touch targets 44px, e active state refinado para rotas aninhadas**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-27T01:26:48Z
- **Completed:** 2026-03-27T01:30:59Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Gravatar URL generator usando SHA-256 via Web Crypto API com d=404 fallback
- SidebarUserMenu com avatar (Gravatar + iniciais), nome truncado, role badge (Admin/Vendedor), ModeToggle (Sun/Moon cycling), e logout inline
- Layout extrai user data server-side (zero client fetch) e passa como props ao AppSidebar
- Auto-close do drawer mobile via useRef + useEffect no pathname change
- Touch targets 44px (min-h-11) em todos os nav items (VENDEDOR + ADMIN)
- Active state exato para /leads (exact match) vs startsWith para demais rotas

## Task Commits

Each task was committed atomically:

1. **Task 1: Criar gravatar.ts utility e sidebar-user-menu.tsx component** - `a54c08d` (feat)
2. **Task 2: Atualizar layout.tsx e app-sidebar.tsx** - `2a1328d` (feat)

## Files Created/Modified
- `apps/web/src/lib/gravatar.ts` - Gravatar URL generator (SHA-256 hash, d=404)
- `apps/web/src/components/sidebar-user-menu.tsx` - User menu com avatar, nome, role, ModeToggle, logout
- `apps/web/src/app/(app)/layout.tsx` - Extrai user data e passa props ao AppSidebar
- `apps/web/src/components/app-sidebar.tsx` - Auto-close mobile, touch targets, active state, SidebarUserMenu no footer

## Decisions Made
- Usado useRef + useEffect sem dependency array em vez de pathname no deps array para satisfazer Biome useExhaustiveDependencies (pathname nao e usado no corpo do efeito, apenas comparado com ref)
- ThemeIcon extraido como componente separado para evitar nested ternary (Biome noNestedTernary)
- userEmail mantido na interface de props com prefixo _ para uso futuro (e.g., tooltip, profile page)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Biome lint compliance adjustments**
- **Found during:** Task 2 (Biome check)
- **Issue:** Multiple Biome rules triggered: useExhaustiveDependencies (pathname as extra dep), noNestedTernary (theme icon), useSortedAttributes (JSX prop order), useSortedInterfaceMembers, useTopLevelRegex, useBlockStatements, useAtIndex
- **Fix:** Refactored useEffect to use useRef pattern, extracted ThemeIcon component, sorted props/interface members alphabetically, moved regex to top-level constant, used block statements, used .at(-1)
- **Files modified:** apps/web/src/components/app-sidebar.tsx, apps/web/src/components/sidebar-user-menu.tsx
- **Verification:** `npx @biomejs/biome check` exits 0 for all 4 files
- **Committed in:** 2a1328d (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking - Biome lint compliance)
**Impact on plan:** Necessary adjustments for Biome strict linting. No scope creep. All planned functionality delivered.

## Issues Encountered
- Pre-existing type errors in `update-lead.test.ts` (out of scope, unrelated to this plan)
- Biome `check` command at root level fails due to nested biome.json in `.claude/worktrees/` directory (not our code, workaround: run biome directly on specific files)

## Known Stubs
None - all data flows are wired (server props from layout to AppSidebar to SidebarUserMenu).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Sidebar fully functional with navigation, user identity, theme toggle, and mobile UX
- Ready for 09-02 plan (responsive content pages, table/form optimizations)
- ModeToggle migrated from standalone DropdownMenu to inline SidebarFooter icon button

## Self-Check: PASSED

All files exist. All commits verified (a54c08d, 2a1328d).

---
*Phase: 09-sidebar-content-mobile-ux*
*Completed: 2026-03-27*
