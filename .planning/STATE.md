---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Ready to plan
stopped_at: Completed 01-04-PLAN.md
last_updated: "2026-03-24T23:23:07.358Z"
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 4
  completed_plans: 4
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-24)

**Core value:** Vendedores coletam leads de forma rapida e confiavel mesmo sem internet, com sync automatico quando a conexao voltar.
**Current focus:** Phase 01 — auth-migration

## Current Position

Phase: 2
Plan: Not started

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
| Phase 01 P01 | 5min | 2 tasks | 15 files |
| Phase 01 P03 | 2min | 2 tasks | 5 files |
| Phase 01 P02 | 2min | 2 tasks | 6 files |
| Phase 01 P04 | 3min | 2 tasks | 5 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Auth: Better-Auth esta sendo substituido por Supabase Auth (Google, Facebook, LinkedIn, email/password)
- Roles: admin + vendedor armazenados no perfil do usuario Supabase Auth
- Offline: Dexie como storage primario no client; Supabase e source of truth; server-wins para conflitos
- Segmento: campo livre de texto (sem lista de opcoes) — flexibilidade sem complexidade
- Score: quente=3, morno=2, frio=1 para leaderboard ponderado
- [Phase 01]: proxy.ts (Next.js 16) em vez de middleware.ts para session refresh
- [Phase 01]: getClaims() em vez de getUser() no proxy (mais leve, sem network call)
- [Phase 01]: NEXT_PUBLIC_SUPABASE_* no server block do T3 Env (vars publicas seguras)
- [Phase 01]: SVG icons inline no login-card (3 icones nao justificam pacote adicional)
- [Phase 01]: getClaims() no tRPC context em vez de getUser() (valida JWT via JWKS sem network call)
- [Phase 01]: Tres niveis de procedure: public < protected < admin (role check via JWT claims)
- [Phase 01]: user_roles table com app_role enum (admin, vendedor) em public schema
- [Phase 01]: Removido @tanstack/react-form junto com better-auth (sem uso apos remocao dos forms)
- [Phase 01]: Dashboard page usa getUser() server-side para auth guard (consistente com proxy.ts)

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 2 (Sync Engine): tRPC vanilla client fora do React tree precisa de validacao de inicializacao no App Router — singleton em lib/sync/engine.ts e a abordagem recomendada
- Phase 3 (Camera iOS): comportamento do Safari iOS para getUserMedia requer user gesture direto no onClick; testar em dispositivo fisico obrigatorio

## Session Continuity

Last session: 2026-03-24T23:19:22.125Z
Stopped at: Completed 01-04-PLAN.md
Resume file: None
