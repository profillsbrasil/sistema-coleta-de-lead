---
phase: 8
slug: layout-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2 |
| **Config file** | `apps/web/vitest.config.ts` (jsdom environment) |
| **Quick run command** | `bun run check-types && bun run check` |
| **Full suite command** | `bun run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run check-types && bun run check`
- **After every plan wave:** Run `bun run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | LAYOUT-02 | smoke | `ls apps/web/src/app/\(public\)/login/page.tsx` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | LAYOUT-02 | smoke | `ls apps/web/src/app/\(app\)/dashboard/page.tsx` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 1 | LAYOUT-01 | smoke | `grep -c SidebarProvider apps/web/src/app/\(app\)/layout.tsx` returns 1 | ❌ W0 | ⬜ pending |
| 08-02-02 | 02 | 1 | LAYOUT-07 | smoke | `grep getUser apps/web/src/app/\(app\)/layout.tsx` | ❌ W0 | ⬜ pending |
| 08-02-03 | 02 | 1 | LAYOUT-03 | smoke | `grep -r SidebarProvider apps/web/src --include="*.tsx" -l \| wc -l` returns 1 | ❌ W0 | ⬜ pending |
| 08-03-01 | 03 | 2 | LAYOUT-05 | smoke | `test ! -f apps/web/src/components/header.tsx` | N/A | ⬜ pending |
| 08-03-02 | 03 | 2 | LAYOUT-06 | smoke | `test ! -f apps/web/src/components/admin-sidebar.tsx` | N/A | ⬜ pending |
| 08-03-03 | 03 | 2 | MOBILE-03 | manual | Navigate to /login on mobile viewport — no sidebar visible | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- None — this phase is structural (file moves, component creation/deletion). Automated verification uses grep-based smoke checks and `bun run build` to validate all imports resolve. No unit test files needed for layout restructuring.

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sidebar renders on authenticated routes | LAYOUT-01 | Visual layout — no DOM assertion in Vitest | Navigate to /dashboard, verify sidebar visible on left |
| Login page has no sidebar | MOBILE-03 | Visual layout on mobile viewport | Open /login in 375px viewport, verify no sidebar/drawer |
| No flash of layout on navigation | LAYOUT-02 | CLS is visual/temporal | Navigate between /login and /dashboard, verify no layout shift |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
