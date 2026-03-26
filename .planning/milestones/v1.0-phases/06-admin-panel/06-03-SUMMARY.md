---
phase: 06-admin-panel
plan: "03"
subsystem: ui
tags: [nextjs, trpc, shadcn, admin, leads, table, pagination, select]

requires:
  - phase: 06-01
    provides: admin tRPC routers (listByUser, listVendors, getById, update, delete, getGlobalStats)
  - phase: 06-02
    provides: admin layout shell with auth guard, refactored LeadForm with optional callback props

provides:
  - Admin leads list page with vendor selector, paginated table, and delete confirmation
  - Admin lead edit page wrapping LeadForm with tRPC callbacks (no Dexie)
  - Vendor stats row (Total, Score, Leads Hoje) via getGlobalStats query
  - Empty states for no vendor selected, no leads, and error

affects:
  - 06-04-users-page (follows same admin page pattern)
  - 06-05-stats-page (follows same admin page pattern)

tech-stack:
  added: []
  patterns:
    - tRPC v11 queryOptions/mutationOptions pattern with useQuery/useMutation from tanstack
    - Base UI Select with onValueChange(value string | null) signature
    - Base UI TooltipTrigger with render prop for custom elements
    - Server lead to Dexie Lead type mapping via Record<string, unknown> for type flexibility

key-files:
  created:
    - apps/web/src/app/admin/leads/page.tsx
    - apps/web/src/app/admin/leads/leads-panel.tsx
    - apps/web/src/app/admin/leads/[id]/page.tsx
    - apps/web/src/app/admin/leads/[id]/admin-lead-edit.tsx
  modified: []

key-decisions:
  - "TooltipTrigger render prop em vez de asChild (Base UI nao suporta asChild)"
  - "mapServerLeadToLocal usa Record<string, unknown> para evitar type mismatch entre Drizzle row e tRPC serialization"
  - "Stats do vendedor via getGlobalStats com userId filter (reusa router existente em vez de calcular client-side)"

patterns-established:
  - "Admin page pattern: Server Component wrapper + Client Component com tRPC queries"
  - "Inline oklch colors via style prop para tag badges (consistente com lead-form tag-selector)"

requirements-completed: [ADMN-01, ADMN-02, ADMN-03, ADMN-04]

duration: 6min
completed: 2026-03-25
---

# Phase 06 Plan 03: Admin Leads Management Summary

**Admin leads page with vendor selector, paginated table, delete confirmation, and lead edit wrapper via tRPC**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-25T14:41:47Z
- **Completed:** 2026-03-25T14:47:47Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Vendor selector dropdown populates from listVendors query, shows stats row on selection
- Paginated table (20/page) with Nome, Telefone/Email, Tag (badge), Segmento, Criado em, Acoes columns
- AlertDialog confirmation for lead deletion with soft-delete via tRPC
- Lead edit page wraps LeadForm with hidePhoto/hideQR and tRPC update/delete callbacks

## Task Commits

Each task was committed atomically:

1. **Task 1: Leads panel with vendor selector, table, pagination, and delete** - `a316640` (feat)
2. **Task 2: Admin lead edit page with LeadForm wrapper** - `c953a16` (feat)

## Files Created/Modified
- `apps/web/src/app/admin/leads/page.tsx` - Server Component wrapper for leads panel
- `apps/web/src/app/admin/leads/leads-panel.tsx` - Client Component with vendor selector, stats, table, pagination, delete
- `apps/web/src/app/admin/leads/[id]/page.tsx` - Server Component for lead edit page with async params
- `apps/web/src/app/admin/leads/[id]/admin-lead-edit.tsx` - Client Component wrapping LeadForm with tRPC callbacks

## Decisions Made
- Used Base UI TooltipTrigger `render` prop instead of `asChild` (Base UI API difference from Radix)
- mapServerLeadToLocal uses `Record<string, unknown>` to handle Drizzle-to-tRPC serialization type differences
- Reused existing `getGlobalStats` with userId filter for vendor stats instead of adding new query

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- tRPC v11 uses `useQuery(trpc.xxx.queryOptions())` pattern, not `trpc.xxx.useQuery()` -- adjusted to match codebase convention
- Base UI components (Select, Tooltip, Button) do not support `asChild` prop from Radix -- used `render` prop instead

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Admin leads management complete, ready for users management (06-04)
- Same page pattern (Server Component + Client Component with tRPC) applies to users and stats pages

## Self-Check: PASSED

- All 4 created files exist on disk
- Both task commits (a316640, c953a16) verified in git log
- All 20 acceptance criteria patterns verified in source files

---
*Phase: 06-admin-panel*
*Completed: 2026-03-25*
