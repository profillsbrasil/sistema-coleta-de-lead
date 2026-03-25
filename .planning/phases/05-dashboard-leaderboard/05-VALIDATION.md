---
phase: 5
slug: dashboard-leaderboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.2 |
| **Config file** | `packages/api/vitest.config.ts` |
| **Quick run command** | `bun run test` |
| **Full suite command** | `bun run test` |
| **Estimated runtime** | ~10 seconds |

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
| 05-01-01 | 01 | 1 | DASH-01 | unit | `bun run test` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | DASH-02 | unit | `bun run test` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | DASH-03 | unit | `bun run test` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | DASH-04 | unit | `bun run test` | ❌ W0 | ⬜ pending |
| 05-03-01 | 03 | 2 | DASH-05 | unit | `bun run test` | ❌ W0 | ⬜ pending |
| 05-03-02 | 03 | 2 | DASH-06 | manual | browser check | N/A | ⬜ pending |
| 05-04-01 | 04 | 2 | DASH-07 | manual | browser check | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for dashboard stats aggregation (DASH-01, DASH-02)
- [ ] Test stubs for leaderboard tRPC procedure (DASH-03, DASH-04)
- [ ] Test stubs for offline cache (DASH-05)

*Existing vitest infrastructure covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard renders stats cards | DASH-01 | Visual layout | Open /dashboard, verify stat cards render |
| Leaderboard ranking display | DASH-03 | Visual layout | Open /dashboard, verify ranking table |
| Offline dashboard access | DASH-06 | Network simulation | Disable network, refresh, verify cached data |
| Staleness indicator | DASH-07 | Visual + time | Check "last synced" timestamp updates |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
