# Dashboard Leads Profills

## What This Is

Sistema de coleta de leads para vendedores utilizarem durante congressos e conferencias. Permite coleta rapida de contatos (formulario, scan QR WhatsApp, foto), gerenciamento dos proprios leads, e um dashboard com leaderboard comparativo e estatisticas individuais. Funciona offline-first via Dexie com sync para Supabase quando houver conexao.

## Core Value

Vendedores conseguem coletar leads de forma rapida e confiavel mesmo sem internet, com sync automatico quando a conexao voltar.

## Requirements

### Validated

- ✓ Monorepo Turborepo com Next.js 16, tRPC, Drizzle, Better-Auth, shadcn/ui — existing
- ✓ Autenticacao email/password com Better-Auth — existing
- ✓ Schema de auth no banco (user, session, account, verification) — existing
- ✓ Componentes de sign-in/sign-up — existing
- ✓ Package de UI com shadcn/ui components — existing
- ✓ Env validation com T3 Env — existing

### Active

- [ ] Coleta rapida de leads via formulario (nome e contato obrigatorios, resto flexivel)
- [ ] Scan de QR Code do WhatsApp para auto-preencher telefone
- [ ] Anexo de foto ao lead (cartao de visita, crachat)
- [ ] Tags de interesse (quente, morno, frio) para qualificacao
- [ ] Campo "segmento" livre (digitado pelo vendedor)
- [ ] CRUD dos proprios leads (criar, listar, editar, deletar)
- [ ] Dashboard com estatisticas individuais do vendedor
- [ ] Leaderboard comparativo (quantidade + qualidade de leads)
- [ ] Offline-first com Dexie (tudo funciona sem internet)
- [ ] Sync automatico Dexie → Supabase quando conexao disponivel
- [ ] Leaderboard offline com dados da ultima sincronizacao

### Out of Scope

- Multi-evento (suporte a varios eventos separados) — v1 e para um evento so
- Campos customizaveis por admin — v1 tem campos fixos, flexibilidade via "segmento" e "notas"
- Notificacoes push — sem necessidade para v1
- Exportacao CSV/Excel — pode ser v2
- OAuth/magic link — email/password via Better-Auth ja suficiente
- App mobile nativo — PWA web e suficiente para o evento
- Chat entre vendedores — fora do escopo do produto

## Context

- **Cenario de uso:** Congressos e conferencias com internet instavel
- **Usuarios:** Equipe de ate 10 vendedores da empresa
- **Device:** Celulares e tablets dos vendedores (browser)
- **Stack existente:** Monorepo Turborepo com Next.js 16 (React 19), tRPC 11, Drizzle ORM, Supabase (Postgres), Better-Auth 1.5, shadcn/ui
- **Offline:** Dexie.js ja instalado (dependencia no package.json) mas nao configurado. Precisa definir estrategia de sync com Supabase + Drizzle + tRPC
- **Auth existente:** Better-Auth com sign-in/sign-up funcional, schema de auth no banco
- **Coleta de QR:** QR do WhatsApp codifica `https://wa.me/55XXXXXXXXXXX` — extrair numero do link

## Constraints

- **Offline-first:** Dexie como storage primario no client, Supabase como source of truth no server. Sync bidirecional com conflict resolution (server wins)
- **Stack:** Usar stack existente (Next.js 16, tRPC, Drizzle, Supabase, Better-Auth, shadcn/ui). Dexie para offline
- **Performance:** Coleta de lead deve ser < 3 toques ate salvar (formulario rapido)
- **Compatibilidade:** Funcionar em Chrome e Safari mobile (cameras para QR e foto)
- **Evento unico:** Sem necessidade de multi-tenancy ou separacao por evento

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Dexie como offline storage | Internet instavel em eventos; dados nao podem ser perdidos | — Pending |
| Server wins na resolucao de conflitos | Simplicidade; dados do servidor sao source of truth | — Pending |
| Segmento como campo livre | Flexibilidade sem complexidade de campos customizaveis | — Pending |
| Nome + contato como unicos obrigatorios | Coleta rapida e a prioridade; dados extras sao bonus | — Pending |
| Tags quente/morno/frio para score | Simples e intuitivo para vendedores em campo | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

## Current State

**Phase 7 complete (2026-03-26)** — Todos os 7 phases do milestone v1.0 executados.

Gaps críticos do audit v1.0 fechados:
- AUTH-05: `src/middleware.ts` ativo — session refresh e auth redirect rodam em cada request
- ADMN-07: Admin vendor stats via tRPC — admin ve dados reais ao selecionar vendedor no dashboard
- isAdmin agora usa `getClaims()` em `dashboard/page.tsx` (consistente com admin layout)
- `/leads/new` tem auth guard server-side (consistente com demais rotas protegidas)

**Pronto para:** `/gsd:complete-milestone` para fechar o milestone v1.0

---
*Last updated: 2026-03-26 after Phase 7 completion*
