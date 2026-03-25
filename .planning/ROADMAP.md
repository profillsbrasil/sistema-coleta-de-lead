# Roadmap: Dashboard Leads Profills

## Overview

O projeto parte de um monorepo existente com auth (Better-Auth) e UI components. O trabalho e migrar a auth para Supabase Auth, construir a infraestrutura offline-first (Dexie + sync engine), entregar o core loop de captura de leads (formulario, QR, foto), adicionar gerenciamento de leads e dashboard pessoal, e fechar com o painel de admin. A ordem e determinada por dependencias tecnicas rigidas: auth e schema sao a base de tudo; sync engine vem antes de qualquer UI que escreva dados; captura antes de gerenciamento; dashboard depois de dados existirem; admin por ultimo porque depende de usuarios e leads reais.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Auth Migration** - Migrar Better-Auth para Supabase Auth com OAuth e roles
- [ ] **Phase 2: Offline Infrastructure** - Schema Drizzle, Dexie DB e Sync Engine
- [x] **Phase 3: Lead Capture** - Formulario rapido, QR scan e captura de foto (completed 2026-03-25)
- [ ] **Phase 4: Lead Management** - CRUD completo de leads com filtros, tudo offline
- [ ] **Phase 5: Dashboard & Leaderboard** - Estatisticas pessoais e ranking da equipe
- [ ] **Phase 6: Admin Panel** - Gestao global de leads e usuarios pelo admin

## Phase Details

### Phase 1: Auth Migration
**Goal**: Usuarios conseguem acessar o sistema via Supabase Auth (Google, Facebook, LinkedIn) e o sistema conhece o role de cada usuario
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07
**Success Criteria** (what must be TRUE):
  1. Vendedor consegue fazer login via Google, Facebook ou LinkedIn (OAuth)
  2. Sessao persiste apos fechar e reabrir o browser
  3. Usuario com role vendedor nao consegue acessar rotas de admin
  4. Usuario tem role (admin ou vendedor) visivel e funcional no sistema
**Plans:** 4 plans

Plans:
- [x] 01-01-PLAN.md — Supabase infrastructure (packages, env vars, client utilities, proxy.ts, callback route)
- [x] 01-02-PLAN.md — Backend migration (tRPC context, procedures, Drizzle schema user_roles)
- [x] 01-03-PLAN.md — Frontend migration (LoginCard OAuth buttons, user-menu, remove old forms)
- [x] 01-04-PLAN.md — Cleanup and human verification (remove Better-Auth remnants, verify OAuth flow)

**UI hint**: yes

### Phase 2: Offline Infrastructure
**Goal**: O sistema persiste dados localmente via Dexie e sincroniza com Supabase automaticamente quando ha conexao, com conflict resolution server-wins
**Depends on**: Phase 1
**Requirements**: OFFL-01, OFFL-02, OFFL-03, OFFL-04, OFFL-05, OFFL-06
**Success Criteria** (what must be TRUE):
  1. Dados escritos offline ficam preservados no Dexie mesmo sem internet
  2. Ao recuperar conexao, dados locais sao enviados para o servidor automaticamente (sem acao do usuario)
  3. Conflito de dados e resolvido com server-wins baseado em updated_at
  4. Sync falha graciosamente quando sessao expirou — dados locais nao sao perdidos
  5. Detector de conectividade funciona no Safari mobile (polling fallback)
**Plans:** 2/3 plans executed

Plans:
- [x] 02-01-PLAN.md — Drizzle leads schema, Dexie DB + types, test infrastructure (fake-indexeddb)
- [x] 02-02-PLAN.md — tRPC sync router (pushChanges/pullChanges), connectivity detector
- [x] 02-03-PLAN.md — Sync engine singleton (push-then-pull, conflict resolution, retry, provider wiring)

### Phase 3: Lead Capture
**Goal**: Vendedor consegue criar um lead em menos de 3 toques, com suporte a QR code do WhatsApp e foto do cartao de visita, tudo funcionando offline
**Depends on**: Phase 2
**Requirements**: CAPT-01, CAPT-02, CAPT-03, CAPT-04, CAPT-05, CAPT-06, CAPT-07, CAPT-08
**Success Criteria** (what must be TRUE):
  1. Vendedor preenche nome, telefone/email e interesse e salva um lead em menos de 3 toques (funciona offline)
  2. Vendedor escaneia QR do WhatsApp e o telefone e preenchido automaticamente no formulario
  3. Vendedor tira foto de cartao de visita e ela e salva junto ao lead (comprimida, sem travar o app)
  4. Foto aparece no lead apos sync — visivel no detalhe do lead quando online
  5. Tag de interesse (quente, morno, frio) e atribuida na criacao do lead
**Plans:** 4/4 plans complete

Plans:
- [x] 03-01-PLAN.md — Utility modules with TDD (validation, wa-parser, compression, saveLead) + dependency install
- [x] 03-02-PLAN.md — LeadForm UI, TagSelector, FAB, /leads/new page
- [x] 03-03-PLAN.md — QRScanner overlay + PhotoCapture component wired into form
- [x] 03-04-PLAN.md — Photo upload sync to Supabase Storage + human verification

**UI hint**: yes

### Phase 4: Lead Management
**Goal**: Vendedor consegue visualizar, editar, filtrar e excluir seus proprios leads de qualquer lugar, online ou offline
**Depends on**: Phase 3
**Requirements**: LEAD-01, LEAD-02, LEAD-03, LEAD-04, LEAD-05
**Success Criteria** (what must be TRUE):
  1. Vendedor ve lista dos seus leads ordenada por recencia (funciona offline)
  2. Vendedor edita qualquer campo de um lead e a alteracao persiste (online e offline)
  3. Vendedor exclui um lead e ele some da lista (soft-delete, sincroniza quando online)
  4. Vendedor filtra sua lista de leads por tag de interesse (quente, morno, frio)
**Plans:** 3 plans

Plans:
- [x] 04-01-PLAN.md — Data layer TDD (updateLead, deleteLead, queries, relativeTime)
- [x] 04-02-PLAN.md — UI components (LeadCard, TagFilter, AlertDialog, LeadForm edit mode)
- [ ] 04-03-PLAN.md — Page wiring (/leads list + /leads/[id] detail/edit) + human verification

**UI hint**: yes

### Phase 5: Dashboard & Leaderboard
**Goal**: Vendedor ve suas proprias estatisticas de performance e o ranking comparativo da equipe, inclusive quando offline
**Depends on**: Phase 4
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07
**Success Criteria** (what must be TRUE):
  1. Vendedor ve dashboard pessoal com total de leads, breakdown por tag e leads de hoje
  2. Vendedor ve leaderboard com ranking de todos vendedores por quantidade e score ponderado (quente=3, morno=2, frio=1)
  3. Dashboard e leaderboard funcionam offline com dados da ultima sincronizacao
  4. Leaderboard mostra quando os dados foram sincronizados pela ultima vez (indicador de staleness)
**Plans**: TBD
**UI hint**: yes

### Phase 6: Admin Panel
**Goal**: Admin consegue visualizar e gerenciar todos os leads de todos os vendedores, filtrar por vendedor, editar ou excluir qualquer lead, e gerenciar usuarios
**Depends on**: Phase 5
**Requirements**: ADMN-01, ADMN-02, ADMN-03, ADMN-04, ADMN-05, ADMN-06, ADMN-07
**Success Criteria** (what must be TRUE):
  1. Admin ve lista completa de todos os leads de todos os vendedores
  2. Admin filtra leads por vendedor e ve o mesmo dashboard que o vendedor ve (com filtro por vendedor)
  3. Admin edita ou exclui qualquer lead (inclusive de outros vendedores)
  4. Admin gerencia usuarios — cria, edita e desativa contas de vendedores
  5. Admin ve tela de stats globais da equipe com filtros avancados
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Auth Migration | 4/4 | Complete | - |
| 2. Offline Infrastructure | 3/3 | Complete |  |
| 3. Lead Capture | 4/4 | Complete   | 2026-03-25 |
| 4. Lead Management | 0/3 | Not started | - |
| 5. Dashboard & Leaderboard | 0/? | Not started | - |
| 6. Admin Panel | 0/? | Not started | - |
