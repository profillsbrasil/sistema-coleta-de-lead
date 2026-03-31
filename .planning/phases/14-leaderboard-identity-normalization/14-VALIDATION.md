---
phase: 14
slug: leaderboard-identity-normalization
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2 |
| **Config file** | `packages/api/vitest.config.ts` |
| **Quick run command** | `bun vitest run packages/api` |
| **Full suite command** | `bun run test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun vitest run packages/api`
- **After every plan wave:** Run `bun run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | ENH-06 | unit | `bun vitest run packages/api/src/__tests__/leaderboard.test.ts` | ❌ Wave 0 | ⬜ pending |
| 14-01-02 | 01 | 1 | ENH-06 | unit | `bun vitest run packages/api/src/__tests__/leaderboard.test.ts` | ❌ Wave 0 | ⬜ pending |
| 14-01-03 | 01 | 1 | ENH-09 | unit | `bun vitest run packages/api/src/__tests__/admin-leads.test.ts` | ✅ needs case | ⬜ pending |
| 14-01-04 | 01 | 1 | ENH-09 | unit | `bun vitest run packages/api/src/__tests__/admin-stats.test.ts` | ✅ needs case | ⬜ pending |
| 14-02-01 | 02 | 2 | ENH-06 | unit | `bun vitest run packages/api/src/__tests__/leaderboard.test.ts` | ❌ Wave 0 | ⬜ pending |
| 14-02-02 | 02 | 2 | ENH-09 | manual | Open leaderboard online + offline | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/api/src/__tests__/leaderboard.test.ts` — stubs para ENH-06: fallback "Vendedor #N", isCurrentUser flag presente, nomes reais sem "(voce)"

*Existing infrastructure covers admin-leads and admin-stats test files (need new test cases, not new files).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cache offline mostra nome correto após sync | ENH-09 | Requer Dexie em browser real | 1. Carregar leaderboard online; 2. ir offline; 3. recarregar — verificar que nomes corretos aparecem do cache |
| `isCurrentUser` destaque visual permanece | ENH-06 | Requer render em browser | Confirmar que o vendedor atual tem destaque visual (border/bg) no LeaderboardEntry sem o sufixo "(voce)" |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
