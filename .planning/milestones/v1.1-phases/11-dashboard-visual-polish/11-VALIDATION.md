---
phase: 11
slug: dashboard-visual-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.2 |
| **Config file** | `vitest.workspace.ts` (root) |
| **Quick run command** | `bun run test` |
| **Full suite command** | `bun run test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run test`
- **After every plan wave:** Run `bun run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | POLISH-01 | visual | `bun run check-types` | ✅ | ⬜ pending |
| 11-01-02 | 01 | 1 | POLISH-03 | visual | `bun run check-types` | ✅ | ⬜ pending |
| 11-02-01 | 02 | 1 | RESP-04 | visual | `bun run check-types` | ✅ | ⬜ pending |
| 11-02-02 | 02 | 1 | RESP-05 | visual | `bun run check-types` | ✅ | ⬜ pending |
| 11-03-01 | 03 | 2 | POLISH-04 | visual | `bun run check-types` | ✅ | ⬜ pending |
| 11-03-02 | 03 | 2 | POLISH-05 | visual | `bun run check-types` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stat cards 1→2→4 column grid responsivo | RESP-04 | Requires browser resize | Abrir em 320px, 640px, 1024px; verificar colunas |
| Charts redimensionam após sidebar toggle | RESP-05 | Requer interação DOM real | Toggle sidebar, verificar chart sem overflow |
| Leaderboard scroll horizontal em 320px | POLISH-04 | Requer navegador mobile | Abrir em 320px; rank+nome+score visíveis |
| AppTopbar breadcrumb dinâmico | POLISH-01 | Requer navegação multi-página | Navegar entre pages e verificar breadcrumb |
| Dark mode consistente | POLISH-03 | Requer inspeção visual | Alternar tema e verificar todas as páginas |
| Espaçamento/tipografia consistentes | POLISH-05 | Julgamento visual | Revisar todas as páginas em ambos os temas |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
