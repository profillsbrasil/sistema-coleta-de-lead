# Dashboard Leads Profills

## What This Is

Sistema offline-first de coleta de leads para vendedores em congressos e conferencias. Permite captura rapida de contatos via formulario, scan de QR Code do WhatsApp e foto de cartao de visita. Inclui gerenciamento de leads, dashboard pessoal com score ponderado, leaderboard comparativo, e painel admin completo. Funciona 100% offline via Dexie com sync automatico para Supabase quando a conexao retorna.

## Core Value

Vendedores conseguem coletar leads de forma rapida e confiavel mesmo sem internet, com sync automatico quando a conexao voltar.

## Current State

**v1.0 MVP — SHIPPED 2026-03-26**
**v1.1 UI Refactor & Mobile UX — SHIPPED 2026-03-27**

11 phases concluidos, 34 plans executados, ~14.5k LOC TypeScript/TSX:
- Auth: Supabase Auth com Google/Facebook/LinkedIn OAuth, roles admin/vendedor
- Offline: Dexie + sync engine push-then-pull, server-wins, 74 testes passando
- Captura: Form (<3 toques), QR scanner, foto comprimida + Supabase Storage
- Gestao: CRUD completo offline, filtro por tag, edit/delete
- Dashboard: stats pessoais, leaderboard com cache offline, score ponderado
- Admin: leads/usuarios/stats, vendor dashboard via tRPC
- Layout: Route groups (public)/(app), AppSidebar unificada (shadcn Sidebar), auth guard centralizado
- Mobile: Drawer auto-close, touch targets 44px, card layout em tabelas admin, form grid responsivo
- Polish: AppTopbar com breadcrumb, dark mode correto via CSS vars, chart resize pós-sidebar toggle

Tech debt ativo:
- LinkedIn/Facebook OAuth requer configuracao no Supabase Dashboard (manual)
- Leaderboard mostra "Vendedor" para nao-current users (JOIN a auth.users pendente)
- Nyquist validation incompleta: 4 fases com `nyquist_compliant: false`
- 11 itens de human verification visual pendentes (media queries, dark mode, chart resize em browser real)

## Current Milestone: v1.2 Export, Connectivity & PWA

**Goal:** Tornar o app mais confiavel e acionavel durante e apos o evento com exportacao de leads, visibilidade de conectividade/sync, identidade correta no leaderboard e instalacao como app.

**Target features:**
- Exportacao de leads em formato compativel com CSV/Excel
- Indicador visual de conectividade e estado de sync
- Leaderboard mostra nome real de todos os vendedores
- PWA instalavel com prompt de instalacao no mobile

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

### Validated — v1.1

- ✓ Sidebar navigation com shadcn/ui Sidebar (route groups, SidebarProvider unico) — v1.1
- ✓ Drawer/Sheet no mobile (hamburger, auto-close apos navegacao, 100svh iOS) — v1.1
- ✓ Sidebar unica vendedor+admin (secao "Admin" collapsible por role) — v1.1
- ✓ Remocao do topbar (Header + AdminSidebar deletados, AppTopbar com breadcrumb) — v1.1
- ✓ 100% responsividade em todas as rotas (320px sem overflow horizontal) — v1.1
- ✓ Tabelas admin responsivas (card layout mobile com DropdownMenu de acoes) — v1.1
- ✓ Formularios otimizados para mobile (grid-cols-1 mobile / grid-cols-2 md+) — v1.1
- ✓ Touch targets adequados (min 44x44px em todos os elementos interativos) — v1.1
- ✓ Polish visual: dark mode correto via CSS vars, chart resize pós-sidebar, FAB keyboard-aware — v1.1

### Active — v1.2

- [ ] Exportacao de leads em formato compativel com CSV/Excel (ENH-01)
- [ ] Indicador visual de conectividade e estado de sync (ENH-02)
- [ ] Leaderboard mostra nome real de todos os vendedores (ENH-06)
- [ ] PWA instalavel com manifest e prompt de instalacao no mobile (PWA-01, PWA-02)

### Backlog

- [ ] Autocomplete no campo segmento (ENH-03)
- [ ] Alerta visual de lead duplicado (mesmo telefone) (ENH-04)
- [ ] Supabase Realtime para leaderboard sub-5s (ENH-05)

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
- **Codebase:** ~14.5k LOC TypeScript/TSX, 79 arquivos modificados em v1.1, 74 testes automatizados
- **Auth:** Supabase Auth com getClaims() para role detection, Next.js middleware para session refresh
- **Layout:** Route groups (public)/(app) com SidebarProvider unico em (app)/layout.tsx; sidebar sempre expandida no desktop (decisao D-01)

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
| Route groups (public)/(app) | Separacao limpa de layouts; zero renderizacao condicional no root layout | ✓ Bom — zero layout flash, auth guard centralizado |
| SidebarProvider unico em (app)/layout.tsx | Evita nested providers (pitfall principal do shadcn Sidebar) | ✓ Bom — sidebar funciona em todas as rotas autenticadas |
| D-01: sidebar sempre expandida (sem icon-only) | Simplificacao — MOBILE-05 cancelado; sidebar collapsible em mobile ja suficiente | ✓ Bom — UX mais simples, sem estado cookie de collapse |
| 100svh em vez de 100dvh no Sheet mobile | Evita gap inferior no iOS Safari (bug Safari 26 com dvh) | ✓ Bom — Sheet sem gap em Safari mobile |
| CSS visibility switching (md:hidden/hidden md:block) | Evita hydration mismatch vs renderizacao condicional | ✓ Bom — tabelas admin responsive sem erro de hidratacao |
| ChartConfig theme: {light, dark} em vez de color | dark mode correto via CSS variables injetadas pelo ChartContainer | ✓ Bom — charts respondem ao theme toggle |
| Chart key vinculado a useSidebar().open | Forca remount do Recharts canvas apos sidebar toggle (ResizeObserver nao reage) | ✓ Bom — charts redimensionam corretamente |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-28 after starting v1.2 milestone*
