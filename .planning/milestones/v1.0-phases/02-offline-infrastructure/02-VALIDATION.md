---
phase: 2
slug: offline-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.2 |
| **Config file** | `vitest.workspace.ts` (root), per-package configs |
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
| *Populated during planning* | - | - | - | - | - | - | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Dexie test utilities — fake-indexeddb setup for vitest
- [ ] Sync engine test helpers — mock tRPC client, mock connectivity detector
- [ ] Schema test stubs — Drizzle leads table assertions

*Existing vitest infrastructure covers framework needs; offline-specific mocks needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Offline data persistence | OFFL-01 | Requires disabling network in browser DevTools | Write lead offline, check Dexie in DevTools Application tab |
| Auto-sync on reconnect | OFFL-02 | Requires toggling network connectivity | Write lead offline, re-enable network, verify data appears in Supabase |
| Safari polling fallback | OFFL-05 | Requires Safari on iOS device | Test connectivity detection on real Safari mobile |
| Session expired graceful fail | OFFL-04 | Requires expired Supabase session | Let session expire, attempt sync, verify local data preserved |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
