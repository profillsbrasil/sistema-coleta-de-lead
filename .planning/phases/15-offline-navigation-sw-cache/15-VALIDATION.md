---
phase: 15
slug: offline-navigation-sw-cache
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2 (jsdom) |
| **Config file** | `apps/web/vitest.config.ts` |
| **Quick run command** | `bun run test --filter web` |
| **Full suite command** | `bun run test` |
| **Estimated runtime** | ~5 seconds (unit) + manual protocol |

> **Limitação crítica:** Service Workers não são suportados em jsdom/Vitest. Testes de SW em si são manuais (DevTools). O que é automatizável: lógica pura extraída do sw.js + renderização de componentes.

---

## Sampling Rate

- **After every task commit:** Run `bun run test --filter web`
- **After every plan wave:** Run `bun run test` + protocolo de validação manual no Chromium
- **Before `/gsd:verify-work`:** Full suite green + validação manual offline completa
- **Max feedback latency:** ~30 seconds (unit) + ~10 min (manual protocol)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-T1 | 01 | 1 | SW-01 | unit | `bun run test --filter web` | ❌ Wave 0 | ⬜ pending |
| 15-01-T2 | 01 | 1 | SW-01 | unit | `bun run test --filter web` | ❌ Wave 0 | ⬜ pending |
| 15-01-T3 | 01 | 1 | SW-02 | unit | `bun run test --filter web` | ❌ Wave 0 | ⬜ pending |
| 15-01-T4 | 01 | 1 | SW-02 | smoke | `grep -r "manifest" apps/web/public/sw.js` | ❌ Wave 0 | ⬜ pending |
| 15-02-T1 | 02 | 2 | SW-01 | manual | — (browser DevTools) | N/A | ⬜ pending |
| 15-02-T2 | 02 | 2 | SW-01 | manual | — (browser DevTools) | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/web/src/lib/sw/__tests__/rsc-normalizer.test.ts` — unit tests para strip de `?_rsc=` da cache key
- [ ] `apps/web/src/components/__tests__/service-worker-registrar.test.tsx` — renderiza sem crash em jsdom (sem navigator.serviceWorker)
- [ ] `apps/web/src/app/(public)/offline/__tests__/page.test.tsx` — renderiza com mensagem e link, sem referência a manifest

*Infraestrutura Vitest já existe — apenas criar arquivos de teste.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Navegação offline sem RSC error | SW-01 | jsdom não suporta Service Workers | Ver Protocolo de Validação Manual (15-02) |
| SW ativa com skipWaiting + clientsClaim | SW-01 | Requer browser real + DevTools SW panel | Ver Protocolo de Validação Manual (15-02) |
| Cache-first para assets (_next/static) | SW-01 | Requer DevTools Network tab | Ver Protocolo de Validação Manual (15-02) |
| Fallback /offline para rotas não cacheadas | SW-01 | Requer browser offline + navegação | Ver Protocolo de Validação Manual (15-02) |
| Sem manifest.json, sem install prompt | SW-02 | Verificar ausência de comportamento PWA | Ver Protocolo de Validação Manual (15-02) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s (unit) + manual protocol complete
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
