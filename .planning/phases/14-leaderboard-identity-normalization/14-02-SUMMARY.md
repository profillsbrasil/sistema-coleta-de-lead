---
phase: 14-leaderboard-identity-normalization
plan: "02"
subsystem: web
tags: [leaderboard, dexie, cache, rank, offline, identity]

# Dependency graph
requires:
  - phase: 14-01
    provides: leaderboard.getRanking com rank: number via ROW_NUMBER() SQL
provides:
  - leaderboard-tab.tsx com rank do servidor no cache Dexie (sem rank drift)
  - Verificacao visual de nomes corretos e destaque sem "(voce)" (pendente checkpoint)
affects:
  - apps/web leaderboard display (cache offline agora reflete rank SQL correto)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - rank: r.rank em vez de i+1 no mapeamento de cache — preserva rank SQL no Dexie

key-files:
  created: []
  modified:
    - apps/web/src/app/(app)/dashboard/leaderboard-tab.tsx
    - apps/web/src/components/leaderboard-entry.tsx

key-decisions:
  - "Usar r.rank (SQL ROW_NUMBER) diretamente no cache Dexie elimina rank drift (Pitfall 3)"
  - "No displayEntries, remover rank: i+1 e deixar spread ...r incluir r.rank automaticamente"

patterns-established:
  - "Pattern: nunca recomputar rank no JS quando o servidor ja entrega rank posicional correto"

requirements-completed:
  - ENH-06
  - ENH-09

# Metrics
duration: 2min
completed: "2026-03-31"
status: awaiting-checkpoint
---

# Phase 14 Plan 02: Leaderboard rank do servidor (cache sem drift) Summary

**Duas substituicoes cirurgicas em leaderboard-tab.tsx eliminam rank drift: cache Dexie agora usa r.rank do SQL ROW_NUMBER() em vez de i+1 calculado no JS.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-31T11:21:56Z
- **Completed:** Parcial — aguardando verificacao visual (checkpoint Task 3)
- **Tasks:** 2 de 3 concluidas (Task 3 = checkpoint:human-verify)
- **Files modified:** 2

## Accomplishments

- `leaderboard-tab.tsx`: bloco de cache Dexie agora usa `rank: r.rank` — rank SQL propagado ao IndexedDB
- `leaderboard-tab.tsx`: displayEntries agora usa spread `...r` sem override de rank — `r.rank` incluido via spread
- `leaderboard-entry.tsx`: formatacao Biome corrigida (tag `<p>` colapsada em linha unica)
- Suite completa: 149 testes passando em web + api + env

## Task Commits

1. **Task 1: Atualizar leaderboard-tab.tsx para usar rank do servidor** - `6233b79` (fix)
2. **Task 2: Rodar suite completa e verificar Biome** - `e14af45` (chore)
3. **Task 3: Verificacao visual** - PENDENTE (checkpoint:human-verify)

## Files Created/Modified

- `apps/web/src/app/(app)/dashboard/leaderboard-tab.tsx` - rank: r.rank no cache Dexie; spread ...r em displayEntries; parametros i removidos
- `apps/web/src/components/leaderboard-entry.tsx` - formatacao Biome: tag p colapsada

## Decisions Made

- **r.rank via spread vs rank: r.rank explicito:** displayEntries usa `...r` que ja inclui `rank`, entao remover `rank: i+1` e suficiente. Cache Dexie requer mapeamento explicito (nao usa spread), entao precisa de `rank: r.rank` explicito.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Formatting] Biome format error em leaderboard-entry.tsx**
- **Found during:** Task 2 (Biome check dos arquivos da fase)
- **Issue:** Tag `<p>` com conteudo em 3 linhas em vez de inline — Biome flagra como format error
- **Fix:** `bun x biome check --write` aplicou o colapso automaticamente
- **Files modified:** apps/web/src/components/leaderboard-entry.tsx
- **Commit:** e14af45

---

**Total deviations:** 1 auto-fixed (Rule 1 — formatacao Biome)
**Impact on plan:** Zero scope creep. Fix de formatacao apenas.

## Known Stubs

None — rank agora vem diretamente do servidor SQL.

## Checkpoint Status

**Task 3 (checkpoint:human-verify) aguardando:**
- App deve ser iniciado com `bun run dev:web`
- Verificar nomes corretos no leaderboard, destaque visual sem "(voce)", cache offline funcional
- Verificar /admin/dashboard com nomes legiveis nos seletores de vendedor

## Self-Check: PASSED (parcial — pre-checkpoint)

- FOUND: apps/web/src/app/(app)/dashboard/leaderboard-tab.tsx
- FOUND: apps/web/src/components/leaderboard-entry.tsx
- FOUND commit: 6233b79 (fix)
- FOUND commit: e14af45 (chore)

---
*Phase: 14-leaderboard-identity-normalization*
*Completed: 2026-03-31 (parcial — aguardando checkpoint)*
