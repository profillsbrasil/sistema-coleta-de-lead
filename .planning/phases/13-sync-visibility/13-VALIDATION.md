---
phase: 13
slug: sync-visibility
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.1 |
| **Config file** | `apps/web/vitest.config.ts` (jsdom env, fake-indexeddb/auto) |
| **Quick run command** | `bunx vitest run apps/web/src/lib/sync/ apps/web/src/components/sync-status* -x` |
| **Full suite command** | `bun run test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bunx vitest run apps/web/src/lib/sync/ apps/web/src/components/sync-status* -x`
- **After every plan wave:** Run `bun run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | ENH-02 | unit | `bunx vitest run apps/web/src/components/sync-status-provider.test.tsx -x` | ❌ W0 | ⬜ pending |
| 13-01-02 | 01 | 1 | ENH-02 | unit | `bunx vitest run apps/web/src/components/sync-status-provider.test.tsx -x` | ❌ W0 | ⬜ pending |
| 13-01-03 | 01 | 1 | ENH-08 | unit | `bunx vitest run apps/web/src/lib/sync/engine.test.ts -x` | ✅ extend | ⬜ pending |
| 13-02-01 | 02 | 1 | ENH-08 | unit | `bunx vitest run apps/web/src/components/sync-status-icon.test.tsx -x` | ❌ W0 | ⬜ pending |
| 13-02-02 | 02 | 1 | ENH-02 | manual | Browser offline toggle | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/web/src/components/sync-status-provider.test.tsx` — stubs for ENH-02 (Provider Context, useSyncStatus hook defaults)
- [ ] `apps/web/src/components/sync-status-icon.test.tsx` — stubs for ENH-08 (precedence derivation, tooltip text mapping)
- [ ] Extend `apps/web/src/lib/sync/engine.test.ts` — covers ENH-08 (callback integration, D-11 retry exhaustion)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Indicator visible in sidebar footer on all authenticated routes | ENH-02 | Visual layout check | Navigate to /dashboard, /leads, /admin — verify icon present in sidebar footer |
| Offline/online transition updates icon without refresh | ENH-02 | Browser network simulation | Toggle browser offline in DevTools → verify icon turns red/disconnected → toggle online → verify icon updates |
| Sync animation visible during active sync cycle | ENH-08 | Visual timing | Create a lead while online → observe spinning icon during sync |
| Tooltip displays correct PT-BR text per state | ENH-08 | Visual + i18n | Hover icon in each state → verify tooltip text matches UI-SPEC |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
