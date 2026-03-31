# Requirements: Dashboard Leads Profills

**Defined:** 2026-03-28
**Core Value:** Vendedores coletam leads de forma rapida e confiavel mesmo sem internet, com sync automatico quando a conexao voltar.
**Milestone:** v1.2 Export, Connectivity & PWA

---

## v1.2 Requirements

### Exportacao de Leads

- [x] **ENH-01**: Vendedor pode exportar seus leads a partir de `/leads` em CSV UTF-8 compativel com Excel e Google Sheets
- [x] **ENH-07**: Admin pode exportar todos os leads que correspondem ao vendedor e filtros selecionados, nao apenas a pagina atualmente renderizada

### Conectividade e Sync

- [x] **ENH-02**: Usuario autenticado ve no shell do app um estado claro de conectividade e sync sem bloquear a captura offline
- [x] **ENH-08**: Estado de sync indica quando ha alteracoes pendentes, sincronizacao em andamento, falha recente ou ultima sincronizacao bem-sucedida

### Identidade no Leaderboard

- [x] **ENH-06**: Leaderboard mostra um nome legivel para cada vendedor usando fallback canonico quando os metadados de auth estiverem incompletos
- [x] **ENH-09**: Nomes corrigidos permanecem consistentes no cache offline do leaderboard e nas superficies admin relacionadas ao vendedor

### Navegacao Offline (SW Cache)

- [ ] **SW-01**: Usuario autenticado que carregou o app online pode navegar entre todas as rotas autenticadas offline sem erro de RSC payload
- [ ] **SW-02**: Service Worker cacheia app shell e RSC payloads sem manifest, sem install prompt, sem funcionalidade PWA

## Future Requirements

### Backlog

- **ENH-03**: Usuario recebe autocomplete no campo segmento durante a captura
- **ENH-04**: Usuario recebe alerta visual quando tenta salvar lead com telefone duplicado
- **ENH-05**: Leaderboard atualiza em tempo quase real com Supabase Realtime
- **ENH-10**: Usuario pode acionar retry manual de sync se a nova telemetria visual ainda nao for suficiente

## Out of Scope

| Feature | Reason |
|---------|--------|
| Geracao nativa de `.xlsx` | CSV compativel com Excel/Sheets cobre a necessidade operacional de v1.2 sem nova dependencia pesada |
| Push notifications ou background sync | SW e apenas para cache de navegacao, nao expansao de plataforma |
| PWA (manifest, install prompt, home screen) | Usuario quer web-only, sem instalacao como app |
| Integracoes com CRM, email ou compartilhamento em nuvem | O objetivo da milestone e handoff via arquivo exportado |
| Sistema completo de perfis publicos | O bug atual pode ser resolvido com fallback canonico e cache consistente |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ENH-01 | Phase 12 | Complete |
| ENH-07 | Phase 12 | Complete |
| ENH-02 | Phase 13 | Complete |
| ENH-08 | Phase 13 | Complete |
| ENH-06 | Phase 14 | Complete |
| ENH-09 | Phase 14 | Complete |
| SW-01 | Phase 15 | Pending |
| SW-02 | Phase 15 | Pending |

**Coverage:**
- v1.2 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 after roadmap creation*
