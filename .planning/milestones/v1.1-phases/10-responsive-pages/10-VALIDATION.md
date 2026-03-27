---
phase: 10
slug: responsive-pages
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.1 with jsdom environment |
| **Config file** | `apps/web/vitest.config.ts` |
| **Quick run command** | `bun run check-types && bun run check` |
| **Full suite command** | `bun run test && bun run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run check-types && bun run check`
- **After every plan wave:** Run `bun run test && bun run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-xx | 01 | 1 | RESP-01 | manual-only | Visual verification at 320px viewport | n/a | ⬜ pending |
| 10-01-xx | 01 | 1 | TOUCH-02 | manual-only | Inspect DropdownMenu trigger dimensions | n/a | ⬜ pending |
| 10-02-xx | 02 | 1 | RESP-02 | manual-only | Visual verification at 320px viewport | n/a | ⬜ pending |
| 10-02-xx | 02 | 1 | TOUCH-02 | manual-only | Inspect DropdownMenu trigger dimensions | n/a | ⬜ pending |
| 10-03-xx | 03 | 2 | RESP-03 | manual-only | Visual verification at 768px+ viewport | n/a | ⬜ pending |
| 10-03-xx | 03 | 2 | RESP-06 | manual-only | Scroll lead list until infinite scroll triggers | n/a | ⬜ pending |
| 10-03-xx | 03 | 2 | RESP-07 | manual-only | Check all routes at 320px viewport | n/a | ⬜ pending |
| 10-03-xx | 03 | 2 | TOUCH-03 | unit | `bun vitest run apps/web/src/components/fab.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/web/src/components/fab.test.ts` — test `useKeyboardVisible` hook behavior and route filtering logic (unit testable with mocked `visualViewport`)
- [ ] Vitest jsdom environment does not support `window.visualViewport` — mock it in test setup

*Existing infrastructure covers all other phase requirements (visual/responsive are manual-only).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin leads card layout at 320px | RESP-01 | CSS media queries not supported in jsdom | Open /admin/leads in DevTools at 320px, verify card layout with DropdownMenu |
| Admin users card layout at 320px | RESP-02 | CSS media queries not supported in jsdom | Open /admin/users in DevTools at 320px, verify card layout with DropdownMenu |
| Lead form grid responsive | RESP-03 | CSS grid not rendered in jsdom | Open /leads/new at 320px (1-col) and 768px+ (2-col), verify layout |
| IntersectionObserver with sidebar | RESP-06 | Requires actual scroll container | Scroll lead list to bottom, verify new items load |
| No horizontal overflow at 320px | RESP-07 | Requires actual viewport rendering | Check all auth routes at 320px, no horizontal scrollbar |
| DropdownMenu 44px touch target | TOUCH-02 | Requires actual element sizing | Inspect rendered DropdownMenuTrigger dimensions in DevTools |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
