# Requirements: Dashboard Leads Profills

**Defined:** 2026-03-24
**Core Value:** Vendedores coletam leads de forma rapida e confiavel mesmo sem internet, com sync automatico quando a conexao voltar.

## v1 Requirements

### Authentication

- [x] **AUTH-01**: Migrar de Better-Auth para Supabase Auth
- [x] **AUTH-02**: User pode fazer login via Google OAuth
- [x] **AUTH-03**: User pode fazer login via Facebook OAuth
- [x] **AUTH-04**: User pode fazer login via LinkedIn OAuth
- [x] **AUTH-05**: Sessao persiste apos refresh do browser
- [x] **AUTH-06**: User tem role (admin ou vendedor) armazenado no perfil
- [x] **AUTH-07**: Rotas de admin sao protegidas — vendedor nao acessa

### Offline Infrastructure

- [x] **OFFL-01**: Schema de leads no Drizzle com soft-delete (deleted_at), timestamps (created_at, updated_at), UUID client (local_id) e server_id
- [x] **OFFL-02**: Dexie DB configurado com schema espelhado do servidor (leads, syncQueue)
- [x] **OFFL-03**: Sync engine via tRPC vanilla client (fora do React tree) — push local changes, pull server changes
- [x] **OFFL-04**: Conflict resolution server-wins baseado em updated_at do servidor
- [x] **OFFL-05**: Sync automatico quando conexao detectada (polling fallback para Safari)
- [x] **OFFL-06**: Dados locais preservados quando sync falha (ex: 401 por sessao expirada)

### Lead Capture

- [x] **CAPT-01**: Vendedor pode criar lead via formulario rapido (nome, telefone/email, interesse obrigatorios)
- [ ] **CAPT-02**: Campos opcionais: empresa, cargo, segmento (texto livre), notas (multi-line)
- [ ] **CAPT-03**: Vendedor pode escanear QR Code do WhatsApp e auto-preencher telefone (parse wa.me URL)
- [ ] **CAPT-04**: Vendedor pode tirar foto (cartao de visita, crachat) e anexar ao lead
- [x] **CAPT-05**: Foto comprimida antes de armazenar no Dexie (max 1280px, JPEG 0.7) para evitar QuotaExceededError
- [ ] **CAPT-06**: Foto sincronizada para Supabase Storage quando online
- [x] **CAPT-07**: Vendedor pode atribuir tag de interesse ao criar lead (quente, morno, frio)
- [x] **CAPT-08**: Coleta funciona 100% offline — dados salvos no Dexie primeiro

### Lead Management

- [ ] **LEAD-01**: Vendedor pode listar seus proprios leads (ordenados por recencia)
- [ ] **LEAD-02**: Vendedor pode editar qualquer campo de seus leads
- [ ] **LEAD-03**: Vendedor pode excluir seus leads (soft-delete)
- [ ] **LEAD-04**: Vendedor pode filtrar leads por tag de interesse
- [ ] **LEAD-05**: CRUD de leads funciona offline via Dexie

### Dashboard & Stats

- [ ] **DASH-01**: Vendedor ve dashboard pessoal com total de leads coletados
- [ ] **DASH-02**: Dashboard mostra breakdown por tag (quente, morno, frio)
- [ ] **DASH-03**: Dashboard mostra leads coletados hoje
- [ ] **DASH-04**: Leaderboard comparativo de todos vendedores (quantidade + score ponderado)
- [ ] **DASH-05**: Score ponderado: quente = 3, morno = 2, frio = 1
- [ ] **DASH-06**: Leaderboard funciona offline com dados da ultima sincronizacao
- [ ] **DASH-07**: Dashboard e leaderboard acessiveis offline via cache no Dexie

### Admin

- [ ] **ADMN-01**: Admin pode ver lista de todos os leads de todos vendedores
- [ ] **ADMN-02**: Admin pode filtrar leads por vendedor
- [ ] **ADMN-03**: Admin pode editar qualquer lead (mesmo de outro vendedor)
- [ ] **ADMN-04**: Admin pode excluir qualquer lead (soft-delete)
- [ ] **ADMN-05**: Admin pode gerenciar usuarios (CRUD de vendedores)
- [ ] **ADMN-06**: Admin tem tela de stats globais com filtros avancados
- [ ] **ADMN-07**: Admin tem acesso a todas as telas de vendedor (com filtro por vendedor)

## v2 Requirements

### Enhancements

- **ENH-01**: Exportacao de leads para CSV/Excel
- **ENH-02**: Indicador visual de conectividade para o usuario
- **ENH-03**: Autocomplete no campo segmento (baseado em entradas anteriores)
- **ENH-04**: Alerta visual de lead duplicado (mesmo telefone)
- **ENH-05**: PWA com prompt de instalacao na home screen (previne evicao iOS)
- **ENH-06**: Supabase Realtime para leaderboard sub-5s (substituir polling)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Login email/password | v1 usa apenas OAuth (Google, Facebook, LinkedIn) por simplicidade |
| Multi-evento | v1 e para um evento so; muda modelo de dados fundamentalmente |
| Custom field builder | Overkill para equipe de 10; segmento + notas cobrem 90% |
| Push notifications | Service worker complexo, Safari incompleto, baixo ROI |
| CRM integration | Zero ROI para 10 vendedores em evento unico; CSV em v2 |
| Real-time collaborative list | Quebra modelo offline; leaderboard ja cobre visibilidade |
| OCR de cartao de visita | Requer API paga, latencia offline, precisao ruim em PT-BR |
| Magic link login | Supabase Auth com OAuth ja cobre; simplificar |
| Chat entre vendedores | Fora do escopo do produto |
| App mobile nativo | PWA web suficiente para o evento |
| Deduplicacao/merge de leads | Alta complexidade, beneficio marginal; alerta visual em v2 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| AUTH-06 | Phase 1 | Complete |
| AUTH-07 | Phase 1 | Complete |
| OFFL-01 | Phase 2 | Complete |
| OFFL-02 | Phase 2 | Complete |
| OFFL-03 | Phase 2 | Complete |
| OFFL-04 | Phase 2 | Complete |
| OFFL-05 | Phase 2 | Complete |
| OFFL-06 | Phase 2 | Complete |
| CAPT-01 | Phase 3 | Complete |
| CAPT-02 | Phase 3 | Pending |
| CAPT-03 | Phase 3 | Pending |
| CAPT-04 | Phase 3 | Pending |
| CAPT-05 | Phase 3 | Complete |
| CAPT-06 | Phase 3 | Pending |
| CAPT-07 | Phase 3 | Complete |
| CAPT-08 | Phase 3 | Complete |
| LEAD-01 | Phase 4 | Pending |
| LEAD-02 | Phase 4 | Pending |
| LEAD-03 | Phase 4 | Pending |
| LEAD-04 | Phase 4 | Pending |
| LEAD-05 | Phase 4 | Pending |
| DASH-01 | Phase 5 | Pending |
| DASH-02 | Phase 5 | Pending |
| DASH-03 | Phase 5 | Pending |
| DASH-04 | Phase 5 | Pending |
| DASH-05 | Phase 5 | Pending |
| DASH-06 | Phase 5 | Pending |
| DASH-07 | Phase 5 | Pending |
| ADMN-01 | Phase 6 | Pending |
| ADMN-02 | Phase 6 | Pending |
| ADMN-03 | Phase 6 | Pending |
| ADMN-04 | Phase 6 | Pending |
| ADMN-05 | Phase 6 | Pending |
| ADMN-06 | Phase 6 | Pending |
| ADMN-07 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 40 total
- Mapped to phases: 40
- Unmapped: 0

---
*Requirements defined: 2026-03-24*
*Last updated: 2026-03-24 after roadmap creation — all 41 requirements mapped to 6 phases*
