# Dashboard Leads Profills

## What This Is

Sistema offline-first de coleta de leads para vendedores em congressos e conferencias. Permite captura rapida de contatos via formulario, scan de QR Code do WhatsApp e foto de cartao de visita. Inclui gerenciamento de leads, dashboard pessoal com score ponderado, leaderboard comparativo, e painel admin completo. Funciona 100% offline via Dexie com sync automatico para Supabase quando a conexao retorna.

## Core Value

Vendedores conseguem coletar leads de forma rapida e confiavel mesmo sem internet, com sync automatico quando a conexao voltar.

## Current Milestone: v1.1 UI Refactor & Mobile UX

**Goal:** Refatorar toda a UI para sidebar navigation (shadcn Sidebar) com drawer mobile, garantir 100% de responsividade em todas as rotas/paginas, e elevar a qualidade visual.

**Target features:**
- Sidebar navigation com shadcn/ui Sidebar (collapsible, icones, grupos)
- Drawer/Sheet no mobile (hamburger, conteudo 100% da tela)
- Sidebar unica para vendedor e admin (secao "Admin" expandivel por role)
- Remocao do topbar atual — sidebar assume toda a navegacao
- 100% responsividade em todas as rotas e paginas
- Tabelas/listas responsivas (card layout no mobile)
- Formularios otimizados para mobile (touch-friendly)
- Touch targets adequados (min 44x44px)
- Polish visual com Impeccable skills (arrange, adapt, polish, typeset)

## Current State

**v1.0 MVP — SHIPPED 2026-03-26**
**v1.1 Phase 8: Layout Foundation — COMPLETE 2026-03-26**

8 phases concluidos, 26 plans executados:
- Phase 8: Route groups (public)/(app), sidebar navigation via shadcn Sidebar, auth guard centralizado, Header/AdminSidebar deletados
- Auth: Supabase Auth com Google/Facebook/LinkedIn OAuth, roles admin/vendedor
- Offline: Dexie + sync engine push-then-pull, server-wins, 74 testes passando
- Captura: Form (<3 toques), QR scanner, foto comprimida + Supabase Storage
- Gestao: CRUD completo offline, filtro por tag, edit/delete
- Dashboard: stats pessoais, leaderboard com cache offline, score ponderado
- Admin: leads/usuarios/stats, vendor dashboard via tRPC

Tech debt ativo:
- LinkedIn/Facebook OAuth requer configuracao no Supabase Dashboard (manual)
- Leaderboard mostra "Vendedor" para nao-current users (JOIN a auth.users pendente)
- Nyquist validation pendente para todas as fases

## Requirements

### Validated — v1.0

- ✓ Auth via Supabase Auth com Google/LinkedIn/Facebook OAuth — v1.0
- ✓ Roles admin/vendedor via custom claims (getClaims) — v1.0
- ✓ Rotas admin protegidas por server-side role guard — v1.0
- ✓ Sessao persiste via Next.js middleware (updateSession) — v1.0
- ✓ Schema Drizzle leads com soft-delete, timestamps, local_id/server_id — v1.0
- ✓ Dexie DB espelhando schema servidor (leads + syncQueue) — v1.0
- ✓ Sync engine via tRPC vanilla client (push-then-pull, server-wins) — v1.0
- ✓ Coleta funciona 100% offline — dados salvos no Dexie primeiro — v1.0
- ✓ Formulario rapido (<3 toques): nome, telefone/email, interesse obrigatorios — v1.0
- ✓ Campos opcionais: empresa, cargo, segmento, notas — v1.0
- ✓ QR scanner WhatsApp (parse wa.me URL) — v1.0
- ✓ Foto comprimida (max 1280px, JPEG 0.7) + sync para Supabase Storage — v1.0
- ✓ Tags de interesse: quente, morno, frio — v1.0
- ✓ CRUD de leads offline via Dexie — v1.0
- ✓ Dashboard pessoal: total, hoje, breakdown por tag, score — v1.0
- ✓ Leaderboard com score ponderado (quente=3, morno=2, frio=1) + cache offline — v1.0
- ✓ Admin: lista todos leads de todos vendedores, edita/exclui qualquer lead — v1.0
- ✓ Admin: CRUD de usuarios (roles, deactivate/reactivate) — v1.0
- ✓ Admin: stats globais com filtros avancados — v1.0
- ✓ Admin: vendor dashboard via tRPC (ve stats reais de outro vendedor) — v1.0

### Active — v1.1

- [ ] Sidebar navigation com shadcn/ui Sidebar (collapsible, icones, grupos)
- [ ] Drawer/Sheet no mobile (hamburger, conteudo 100% da tela)
- [ ] Sidebar unica vendedor+admin (secao "Admin" expandivel por role)
- [ ] Remocao do topbar — sidebar assume navegacao
- [ ] 100% responsividade em todas as rotas e paginas
- [ ] Tabelas/listas responsivas (card layout no mobile)
- [ ] Formularios otimizados para mobile (touch-friendly)
- [ ] Touch targets adequados (min 44x44px)
- [ ] Polish visual (arrange, adapt, polish, typeset)

### Backlog — v1.2+

- [ ] Exportacao de leads para CSV/Excel (ENH-01)
- [ ] Indicador visual de conectividade (ENH-02)
- [ ] Autocomplete no campo segmento (ENH-03)
- [ ] Alerta visual de lead duplicado (mesmo telefone) (ENH-04)
- [ ] PWA com prompt de instalacao na home screen (ENH-05)
- [ ] Supabase Realtime para leaderboard sub-5s (ENH-06)
- [ ] Leaderboard mostra nome real de todos os vendedores (JOIN a auth.users)

### Out of Scope

- Multi-evento — v1 para um evento so; muda modelo de dados
- Campos customizaveis por admin — segmento + notas cobrem 90%
- Notificacoes push — Service Worker complexo, Safari incompleto, baixo ROI
- App mobile nativo — PWA web suficiente para o evento
- Chat entre vendedores — fora do escopo do produto
- OCR de cartao de visita — API paga, precisao ruim PT-BR
- Login email/password — OAuth ja suficiente para v1

## Context

- **Cenario de uso:** Congressos e conferencias com internet instavel
- **Usuarios:** Equipe de ate 10 vendedores da empresa
- **Device:** Celulares e tablets (browser Chrome/Safari mobile)
- **Stack:** Next.js 16.2 (React 19, React Compiler), tRPC 11, Drizzle ORM, Supabase Auth + Postgres, Dexie 4, shadcn/ui, TailwindCSS 4
- **Codebase:** ~13.9k LOC TypeScript/TSX, 161 arquivos fonte, 74 testes automatizados
- **Auth:** Supabase Auth com getClaims() para role detection, Next.js middleware para session refresh

## Constraints

- **Offline-first:** Dexie como storage primario no client, Supabase como source of truth no server
- **Stack:** Usar stack existente — nao introduzir novas dependencias sem necessidade clara
- **Performance:** Coleta de lead deve ser <3 toques ate salvar
- **Compatibilidade:** Chrome e Safari mobile (cameras para QR e foto)
- **Evento unico:** Sem necessidade de multi-tenancy

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Migrar de Better-Auth para Supabase Auth | Simplificar stack; Supabase Auth ja gerencia usuarios e roles via custom claims | ✓ Bom — eliminamos um pacote inteiro |
| Dexie como offline storage | Internet instavel em eventos; dados nao podem ser perdidos | ✓ Bom — funciona bem com React via useLiveQuery |
| Server wins na resolucao de conflitos | Simplicidade; dados do servidor sao source of truth | ✓ Bom — sem complexidade de merge |
| tRPC vanilla client para sync engine | Sync roda fora do React tree; sem dependencia de hooks | ✓ Bom — funciona com polling de conectividade |
| getClaims() para role detection | Consistencia entre tRPC context, admin layout e dashboard | ✓ Bom — unica fonte de verdade para roles |
| overrideStats prop em PersonalDashboard | Admin ve stats de outro vendedor sem reescrever componente | ✓ Bom — minimal invasao no componente existente |
| Tags quente/morno/frio para score | Simples e intuitivo para vendedores em campo | ✓ Bom — score ponderado funciona bem no leaderboard |

## Evolution

**After each phase transition** (via `/gsd:transition`):
1. Requirements validated? → Move to Validated with phase reference
2. New requirements emerged? → Add to Active
3. Decisions to log? → Add to Key Decisions

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-26 after Phase 8 completion*
