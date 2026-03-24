# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-24)

**Core value:** Vendedores coletam leads de forma rapida e confiavel mesmo sem internet, com sync automatico quando a conexao voltar.
**Current focus:** Phase 1 — Auth Migration

## Current Position

Phase: 1 of 6 (Auth Migration)
Plan: 0 of ? in current phase
Status: Ready to plan
Last activity: 2026-03-24 — Roadmap criado; pronto para iniciar planejamento da Phase 1

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Auth: Better-Auth esta sendo substituido por Supabase Auth (Google, Facebook, LinkedIn, email/password)
- Roles: admin + vendedor armazenados no perfil do usuario Supabase Auth
- Offline: Dexie como storage primario no client; Supabase e source of truth; server-wins para conflitos
- Segmento: campo livre de texto (sem lista de opcoes) — flexibilidade sem complexidade
- Score: quente=3, morno=2, frio=1 para leaderboard ponderado

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 2 (Sync Engine): tRPC vanilla client fora do React tree precisa de validacao de inicializacao no App Router — singleton em lib/sync/engine.ts e a abordagem recomendada
- Phase 3 (Camera iOS): comportamento do Safari iOS para getUserMedia requer user gesture direto no onClick; testar em dispositivo fisico obrigatorio

## Session Continuity

Last session: 2026-03-24
Stopped at: Roadmap criado com 6 fases e 41 requisitos mapeados
Resume file: None
