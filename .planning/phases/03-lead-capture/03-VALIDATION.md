---
phase: 3
slug: lead-capture
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 3 — Validation Strategy

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

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| *Populated during planning* | - | - | - | - | - | - | ⬜ pending |

---

## Wave 0 Requirements

- [ ] Canvas mock utilities for image compression tests
- [ ] html5-qrcode mock for QR scanner tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| QR scan via camera | CAPT-03 | Requires physical QR code + camera access | Open form, tap QR icon, scan wa.me QR, verify phone auto-fills |
| Photo capture via camera | CAPT-04 | Requires camera on device | Open form, tap photo button, take photo, verify preview shows |
| Photo visible after sync | CAPT-06 | Requires Supabase Storage + real sync | Create lead with photo offline, go online, verify photo in Supabase |
| < 3 toques flow | CAPT-01 | UX timing test | FAB > fill name+phone > Salvar = 3 actions |
| Safari iOS compatibility | CAPT-03/04 | Requires Safari on iOS | Test QR and photo on real Safari mobile |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
