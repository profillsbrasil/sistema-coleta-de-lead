---
phase: 12-export-workflows
plan: "01"
subsystem: export
tags: [dexie, trpc, react-query, csv, vitest]
requires:
  - phase: 11-dashboard-visual-polish
    provides: seller `/leads` and admin `/admin/leads` header export surfaces
provides:
  - seller Dexie export scope helper decoupled from infinite scroll
  - admin `exportByFilters` procedure decoupled from paginated list queries
  - seller and admin export buttons wired to full-scope datasets
affects: [12-02, export-workflows, csv]
tech-stack:
  added: []
  patterns:
    - separate export datasets from render datasets
    - reuse live admin filter objects across paginated and export queries
key-files:
  created:
    - apps/web/src/lib/lead/export-scope.ts
    - apps/web/src/lib/lead/export-scope.test.ts
  modified:
    - apps/web/src/app/(app)/leads/lead-list.tsx
    - apps/web/src/app/(app)/admin/leads/leads-panel.tsx
    - packages/api/src/routers/admin/leads.ts
    - packages/api/src/__tests__/admin-leads.test.ts
key-decisions:
  - "Seller export now uses a dedicated Dexie helper so infinite-scroll pagination cannot truncate downloads."
  - "Admin export uses a shared filter schema plus a separate `exportByFilters` procedure instead of widening `listByUser`."
  - "Admin screen derives one named `adminLeadFilters` object from live UI state and reuses it for both paginated and export queries."
patterns-established:
  - "Export scope helpers return `{ leads, total }` and own their filter semantics."
  - "Admin export contracts should model the current filter object first, then extend it for UI pagination."
requirements-completed: [ENH-01, ENH-07]
duration: 4min
completed: 2026-03-29
---

# Phase 12 Plan 01: Export Scope Separation Summary

**Full-scope seller Dexie export queries and admin filter-based export procedures now feed both header export actions instead of the rendered infinite-scroll or paginated arrays.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-29T15:21:46Z
- **Completed:** 2026-03-29T15:25:35Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Added `queryLeadExportScope()` with Dexie tests proving seller exports ignore render limits while preserving `/leads` tag and search filters.
- Added `exportByFilters` to the admin leads router with a shared filter schema and tests proving the export path does not call `limit` or `offset`.
- Rewired seller and admin header export buttons to fetch full-scope datasets before calling `exportLeadsCsv`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the seller full-scope export helper and test it independently from the render limit**
   - `eb67e0c` test(12-01): add failing test for seller export scope
   - `faa85fa` feat(12-01): implement seller export scope helper
2. **Task 2: Add a dedicated admin export procedure that accepts the current admin filter object and prove it does not inherit pagination**
   - `da16f1b` test(12-01): add failing test for admin export procedure
   - `e2a7d11` feat(12-01): add admin export procedure by filters
3. **Task 3: Rewire seller and admin export buttons to the new full-scope data paths**
   - `4193978` feat(12-01): rewire export buttons to full-scope paths

## Files Created/Modified
- `apps/web/src/lib/lead/export-scope.ts` - Full-scope seller export helper returning `{ leads, total }` without pagination.
- `apps/web/src/lib/lead/export-scope.test.ts` - Dexie-backed tests for full-scope export filtering, ordering, and exclusion rules.
- `packages/api/src/routers/admin/leads.ts` - Shared admin filter schema plus non-paginated `exportByFilters`.
- `packages/api/src/__tests__/admin-leads.test.ts` - Router contract tests for the dedicated export procedure and pagination isolation.
- `apps/web/src/app/(app)/leads/lead-list.tsx` - Seller header export action now resolves the full scoped dataset before download.
- `apps/web/src/app/(app)/admin/leads/leads-panel.tsx` - Admin header export action now reuses live filter state and fetches the dedicated export query.

## Decisions Made
- Kept `queryLeads()` unchanged for rendering and introduced a new seller export helper instead of overloading the UI query path.
- Modeled admin export as the current filter object via `adminLeadFilterSchema`, then extended that schema for paginated `listByUser`.
- Reused React Query’s imperative `fetchQuery()` path for admin export so the button can fetch a fresh full-scope dataset without changing the table query contract.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected an invalid UUID in the new admin export test fixture**
- **Found during:** Task 2
- **Issue:** The RED test used a UUID string that failed Zod’s RFC-compliant UUID validation, masking the router behavior under test.
- **Fix:** Replaced the fixture with a valid UUID and reran the targeted API test.
- **Files modified:** `packages/api/src/__tests__/admin-leads.test.ts`
- **Verification:** `bun run --cwd packages/api test src/__tests__/admin-leads.test.ts`
- **Committed in:** `e2a7d11` (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** No scope creep. The fix removed a false-negative test failure and preserved the intended router-contract coverage.

## Issues Encountered
- None beyond the invalid UUID fixture corrected during Task 2.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Seller and admin export paths now resolve complete datasets, so Plan 12-02 can harden the shared CSV contract without fighting pagination bugs.
- Manual spreadsheet-open verification and CSV sanitization/feedback work remain for Plan 12-02.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: `.planning/phases/12-export-workflows/12-01-SUMMARY.md`
- FOUND: `eb67e0c`
- FOUND: `faa85fa`
- FOUND: `da16f1b`
- FOUND: `e2a7d11`
- FOUND: `4193978`

---
*Phase: 12-export-workflows*
*Completed: 2026-03-29*
