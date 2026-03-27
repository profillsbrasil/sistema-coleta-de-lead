---
phase: 9
slug: sidebar-content-mobile-ux
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.2 |
| **Config file** | `vitest.workspace.ts` (root), `packages/api/vitest.config.ts` |
| **Quick run command** | `bun run test` |
| **Full suite command** | `bun run test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run test`
- **After every plan wave:** Run `bun run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | LAYOUT-04, LAYOUT-08, POLISH-02 | type-check | `bun run check-types` | N/A | pending |
| 09-01-02 | 01 | 1 | MOBILE-01, MOBILE-02, MOBILE-04, MOBILE-05, TOUCH-01, TOUCH-04 | type-check + lint | `bun run check-types && bun run check` | N/A | pending |
| 09-02-01 | 02 | 2 | ALL (regression) | build + test | `bun run check-types && bun run check && bun run build && bun run test` | N/A | pending |
| 09-02-02 | 02 | 2 | LAYOUT-04, LAYOUT-08, MOBILE-01, MOBILE-02, MOBILE-04, TOUCH-01, TOUCH-04, POLISH-02 | manual | browser check | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Phase 9 is primarily UI/UX — validation is visual/manual with existing test suite for regression.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Vendedor sidebar groups | LAYOUT-04 | Visual UI role-gated rendering | Login as vendedor, verify only "Vendedor" group visible |
| Admin sidebar groups | LAYOUT-04 | Visual UI role-gated rendering | Login as admin, verify both groups visible |
| ModeToggle in footer | LAYOUT-08 | Visual UI interaction | Click Sun/Moon icon in SidebarFooter, verify dark/light toggle |
| User menu in footer | POLISH-02 | Visual UI rendering | Verify avatar + name + role + ModeToggle + logout button in sidebar footer |
| Drawer auto-close | MOBILE-01, MOBILE-02 | Touch interaction on real device | Open drawer on mobile, tap nav link, verify drawer closes |
| Touch targets 44px | TOUCH-01, TOUCH-04 | CSS inspection | DevTools -> inspect nav items, verify min-height >= 44px |
| Active state highlighting | MOBILE-04, MOBILE-05 | Visual navigation state | Navigate between routes, verify correct highlight including nested routes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
