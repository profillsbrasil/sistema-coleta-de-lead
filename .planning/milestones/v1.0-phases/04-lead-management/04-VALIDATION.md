---
phase: 4
slug: lead-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.2 |
| **Config file** | `apps/web/vitest.config.ts` |
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

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Infinite scroll loads more | LEAD-01 | Requires visual scroll on device | Scroll to bottom, verify more leads load |
| Edit flow end-to-end | LEAD-02 | Requires form interaction | Tap card, edit field, save, verify persistence |
| Soft-delete + sync | LEAD-03 | Requires network toggle | Delete lead, verify gone from list, verify sync |
| Filter by tag | LEAD-04 | Visual verification | Tap Quente/Morno/Frio filters, verify list updates |
| Offline CRUD | LEAD-05 | Requires network disable | Create/edit/delete offline, re-enable, verify sync |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
