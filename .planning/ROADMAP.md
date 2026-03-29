# Roadmap: Dashboard Leads Profills

## Milestones

- ✅ **v1.0 MVP** — Phases 1-7 (shipped 2026-03-26) — [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 UI Refactor & Mobile UX** — Phases 8-11 (shipped 2026-03-27) — [archive](milestones/v1.1-ROADMAP.md)
- 📋 **v1.2 Export, Connectivity & PWA** — Phases 12-15 (planned)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-7) — SHIPPED 2026-03-26</summary>

- [x] Phase 1: Auth Migration (4/4 plans) — completed 2026-03-24
- [x] Phase 2: Offline Infrastructure (3/3 plans) — completed 2026-03-24
- [x] Phase 3: Lead Capture (4/4 plans) — completed 2026-03-25
- [x] Phase 4: Lead Management (3/3 plans) — completed 2026-03-25
- [x] Phase 5: Dashboard & Leaderboard (3/3 plans) — completed 2026-03-25
- [x] Phase 6: Admin Panel (5/5 plans) — completed 2026-03-26
- [x] Phase 7: Auth & Admin Fixes (1/1 plan) — completed 2026-03-26

</details>

<details>
<summary>✅ v1.1 UI Refactor & Mobile UX (Phases 8-11) — SHIPPED 2026-03-27</summary>

- [x] Phase 8: Layout Foundation (3/3 plans) — completed 2026-03-26
- [x] Phase 9: Sidebar Content + Mobile UX (2/2 plans) — completed 2026-03-26
- [x] Phase 10: Responsive Pages (3/3 plans) — completed 2026-03-27
- [x] Phase 11: Dashboard + Visual Polish (3/3 plans) — completed 2026-03-27

</details>

## v1.2 Export, Connectivity & PWA (Phases 12-15)

**Milestone Goal:** Tornar o app mais confiavel e acionavel durante e apos o evento com exportacao de leads, visibilidade de conectividade/sync, identidade correta no leaderboard e instalacao como app.

- [x] **Phase 12: Export Workflows** - Exportacao completa, segura e compativel com planilhas (completed 2026-03-29)
- [ ] **Phase 13: Sync Visibility** - Estado de conectividade e sync confiavel no shell autenticado
- [ ] **Phase 14: Leaderboard Identity Normalization** - Nome legivel e consistente em ranking e superficies admin
- [ ] **Phase 15: PWA Installability** - Manifest, icones e fluxo de instalacao por plataforma

## Phase Details

### Phase 12: Export Workflows
**Goal**: Exportar datasets completos de vendedor e admin com escopo explicito, arquivo compativel com Excel/Sheets e hardening basico para dados reais de evento
**Depends on**: Phase 11 (v1.1 complete)
**Requirements**: ENH-01, ENH-07
**Success Criteria** (what must be TRUE):
  1. Vendedor exporta todos os leads do escopo selecionado em `/leads`, e a contagem do arquivo bate com a UI
  2. Admin exporta todos os leads do vendedor/filtro selecionado, nao apenas a pagina atualmente renderizada
  3. CSV abre corretamente em Excel e Google Sheets com headers legiveis, acentos preservados e colunas uteis para follow-up
  4. Campos controlados por usuario sao neutralizados contra formula injection antes da abertura em planilhas
**Plans**: 2 plans
**UI hint**: no

Plans:
- [x] 12-01-PLAN.md — Definir contrato de exportacao por escopo e separar datasets de exportacao dos datasets paginados/renderizados
- [x] 12-02-PLAN.md — Hardening do CSV: encoding, sanitizacao, feedback de sucesso e testes de compatibilidade

### Phase 13: Sync Visibility
**Goal**: Tornar o estado offline-first observavel no shell sem bloquear captura, diferenciando conectividade, fila pendente, sync em andamento e ultimo sucesso
**Depends on**: Phase 12
**Requirements**: ENH-02, ENH-08
**Success Criteria** (what must be TRUE):
  1. Usuario autenticado ve um indicador de status em todas as rotas autenticadas
  2. O indicador diferencia offline, syncing, pending, synced/stale ou erro recente com base no runtime real
  3. Reconnect e sync bem-sucedido atualizam o estado automaticamente sem refresh manual
  4. O novo status nao bloqueia formularios nem adiciona spam de toasts durante uso em campo
**Plans**: 2 plans
**UI hint**: yes

Plans:
- [ ] 13-01: Expor runtime status compartilhado a partir do sync engine/providers
- [ ] 13-02: Implementar indicador no shell com estados observaveis e verificacao offline/online

### Phase 14: Leaderboard Identity Normalization
**Goal**: Corrigir nomes do leaderboard de forma canonica e consistente, incluindo cache offline e superficies admin relacionadas ao vendedor
**Depends on**: Phase 13
**Requirements**: ENH-06, ENH-09
**Success Criteria** (what must be TRUE):
  1. Todas as linhas do leaderboard mostram nome legivel com fallback canonico previsivel
  2. Usuario atual continua claramente identificado sem quebrar o nome real exibido
  3. Cache offline do leaderboard reflete a nova regra de nomes sem manter placeholders antigos
  4. Seletores/admin stats relacionados ao vendedor usam a mesma resolucao de display name
**Plans**: 2 plans
**UI hint**: no

Plans:
- [ ] 14-01: Normalizar resolver de display name no server e alinhar leaderboard/admin queries
- [ ] 14-02: Invalidar/versionar cache de ranking e verificar fallback/current-user em online e offline

### Phase 15: PWA Installability
**Goal**: Entregar instalabilidade mobile com metadata valida, CTA respeitoso por plataforma e verificacao real de home-screen launch sem expandir para uma plataforma PWA completa
**Depends on**: Phase 14
**Requirements**: PWA-01, PWA-02, PWA-03
**Success Criteria** (what must be TRUE):
  1. App expoe manifest e icones validos e pode ser instalado em modo standalone nos browsers suportados
  2. Browsers Chromium exibem CTA/prompt apenas quando o evento de install esta disponivel e ocultam o CTA apos instalacao
  3. iOS Safari exibe orientacao manual de "Adicionar a Tela de Inicio" em vez de um botao de prompt quebrado
  4. Abrir o app pela home screen nos browsers alvo leva a um shell funcional e nao interrompe a captura de leads
**Plans**: 3 plans
**UI hint**: yes

Plans:
- [ ] 15-01: Adicionar manifest, icones e metadata de instalacao no App Router
- [ ] 15-02: Implementar CTA de instalacao Chromium + guidance iOS + hide em standalone
- [ ] 15-03: Verificacao cross-browser do fluxo instalado/home-screen launch sem scope creep de push/background sync

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Auth Migration | v1.0 | 4/4 | Complete | 2026-03-24 |
| 2. Offline Infrastructure | v1.0 | 3/3 | Complete | 2026-03-24 |
| 3. Lead Capture | v1.0 | 4/4 | Complete | 2026-03-25 |
| 4. Lead Management | v1.0 | 3/3 | Complete | 2026-03-25 |
| 5. Dashboard & Leaderboard | v1.0 | 3/3 | Complete | 2026-03-25 |
| 6. Admin Panel | v1.0 | 5/5 | Complete | 2026-03-26 |
| 7. Auth & Admin Fixes | v1.0 | 1/1 | Complete | 2026-03-26 |
| 8. Layout Foundation | v1.1 | 3/3 | Complete | 2026-03-26 |
| 9. Sidebar Content + Mobile UX | v1.1 | 2/2 | Complete | 2026-03-26 |
| 10. Responsive Pages | v1.1 | 3/3 | Complete | 2026-03-27 |
| 11. Dashboard + Visual Polish | v1.1 | 3/3 | Complete | 2026-03-27 |
| 12. Export Workflows | v1.2 | 2/2 | Complete   | 2026-03-29 |
| 13. Sync Visibility | v1.2 | 0/2 | Not started | - |
| 14. Leaderboard Identity Normalization | v1.2 | 0/2 | Not started | - |
| 15. PWA Installability | v1.2 | 0/3 | Not started | - |
