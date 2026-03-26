---
phase: 6
slug: admin-panel
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2 |
| **Config file** | `packages/api/vitest.config.ts` |
| **Quick run command** | `bun run test` |
| **Full suite command** | `bun run test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run test`
- **After every plan wave:** Run `bun run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | ADMN-01, ADMN-02, ADMN-03, ADMN-04 | unit | `bun run test` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | ADMN-05 | unit | `bun run test` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 2 | ADMN-06, ADMN-07 | unit | `bun run test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Admin router test stubs in `packages/api/src/routers/__tests__/admin.test.ts`
- [ ] User management router test stubs in `packages/api/src/routers/__tests__/user-management.test.ts`

*Existing Vitest infrastructure covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin sidebar navigation | ADMN-07 | UI layout/routing | Navigate /admin/*, verify sidebar links work |
| Vendor selector in /dashboard | ADMN-07 | Client-side interactivity | Login as admin, select vendor from dropdown, verify dashboard updates |
| Stats charts rendering | ADMN-06 | Visual chart output | Open /admin/stats, verify charts render with data |
| User ban/unban | ADMN-05 | Supabase Admin API side-effect | Deactivate user, verify cannot login |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
