---
phase: 1
slug: auth-migration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.2 |
| **Config file** | `vitest.workspace.ts` (root), `packages/api/vitest.config.ts`, `packages/env/vitest.config.ts` |
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
| *Populated during planning* | - | - | - | - | - | - | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Auth test utilities — Supabase client mocks for unit testing
- [ ] Env validation tests — updated for new SUPABASE_URL, SUPABASE_ANON_KEY vars

*Existing vitest infrastructure covers framework needs; only auth-specific stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| OAuth login via Google | AUTH-02 | Requires real Google OAuth flow | Click Google login, verify redirect + session |
| OAuth login via Facebook | AUTH-03 | Requires real Facebook OAuth flow | Click Facebook login, verify redirect + session |
| OAuth login via LinkedIn | AUTH-04 | Requires real LinkedIn OAuth flow | Click LinkedIn login, verify redirect + session |
| Session persists after browser close | AUTH-05 | Requires browser restart | Login, close browser, reopen, verify still authenticated |

*OAuth provider flows require real credentials and browser interaction.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
