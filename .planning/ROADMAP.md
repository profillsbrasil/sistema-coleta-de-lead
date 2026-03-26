# Roadmap: Dashboard Leads Profills

## Milestones

- ✅ **v1.0 MVP** — Phases 1-7 (shipped 2026-03-26) — [archive](.planning/milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 UI Refactor & Mobile UX** — Phases 8-11 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-7) — SHIPPED 2026-03-26</summary>

- [x] Phase 1: Auth Migration (4/4 plans)
- [x] Phase 2: Offline Infrastructure (3/3 plans)
- [x] Phase 3: Lead Capture (4/4 plans) — completed 2026-03-25
- [x] Phase 4: Lead Management (3/3 plans)
- [x] Phase 5: Dashboard & Leaderboard (3/3 plans)
- [x] Phase 6: Admin Panel (5/5 plans)
- [x] Phase 7: Auth & Admin Fixes (1/1 plan) — completed 2026-03-26

</details>

---

## v1.1 UI Refactor & Mobile UX (Phases 8-11)

**Milestone Goal:** Substituir o topbar por sidebar navigation (shadcn Sidebar) com drawer mobile, garantir 100% de responsividade em todas as rotas, e elevar a qualidade visual da aplicacao.

- [ ] **Phase 8: Layout Foundation** - Route groups + sidebar shell atomico
- [ ] **Phase 9: Sidebar Content + Mobile UX** - Nav items, roles, drawer mobile correto
- [ ] **Phase 10: Responsive Pages** - Tabelas, formularios e touch targets em 320px
- [ ] **Phase 11: Dashboard + Visual Polish** - Charts responsivos e polish final

## Phase Details

### Phase 8: Layout Foundation
**Goal**: App funciona com sidebar em todas as rotas autenticadas e sem sidebar nas paginas publicas — zero flash de layout, zero SidebarProvider aninhado
**Depends on**: Phase 7 (v1.0 complete)
**Requirements**: LAYOUT-01, LAYOUT-02, LAYOUT-03, LAYOUT-05, LAYOUT-06, LAYOUT-07, MOBILE-03
**Success Criteria** (what must be TRUE):
  1. Usuario autenticado acessa /dashboard e ve sidebar lateral — sem topbar Header
  2. Usuario nao autenticado acessa /login e ve pagina sem sidebar
  3. Existe exatamente um SidebarProvider no codebase (grep retorna 1 resultado)
  4. Header.tsx e AdminSidebar.tsx foram deletados — nenhuma referencia restante no codebase
  5. Auth guard centralizado em (app)/layout.tsx — paginas individuais nao duplicam getUser() + redirect()
**Plans**: 3 plans
**UI hint**: yes

Plans:
- [x] 08-01: Criar route groups (public) e (app) — mover paginas publicas para (public), criar layouts
- [x] 08-02: Criar (app)/layout.tsx com auth guard + SidebarProvider + AppSidebar shell + SidebarInset
- [ ] 08-03: Remover Header do root layout, deletar header.tsx + admin-sidebar.tsx + admin/layout.tsx, limpar root layout

### Phase 9: Sidebar Content + Mobile UX
**Goal**: Sidebar totalmente funcional com navegacao por role, drawer mobile que fecha sozinho apos navegacao, e user menu no footer
**Depends on**: Phase 8
**Requirements**: LAYOUT-04, LAYOUT-08, MOBILE-01, MOBILE-02, MOBILE-04, MOBILE-05, TOUCH-01, TOUCH-04, POLISH-02
**Success Criteria** (what must be TRUE):
  1. Vendedor logado ve grupo "Vendedor" na sidebar (Dashboard, Leads, Novo Lead) e nao ve grupo "Admin"
  2. Admin logado ve ambos os grupos: "Vendedor" e "Admin" (collapsible) com itens corretos
  3. No mobile, abrir sidebar exibe drawer a partir da esquerda; clicar em qualquer nav link fecha o drawer automaticamente
  4. Footer da sidebar exibe avatar + nome + role do usuario logado com opcao de logout
  5. Nav item da rota atual aparece highlighted — incluindo rotas aninhadas como /admin/leads/123
  6. Sidebar em desktop colapsa para modo icon-only (Ctrl+B) com estado persistido via cookie
**Plans**: 3 plans
**UI hint**: yes

Plans:
- [ ] 09-01: Construir AppSidebar com grupos Vendedor + Admin (collapsible, role-gated), active state, touch targets 44px
- [ ] 09-02: Criar SidebarUserMenu (avatar + nome + role + logout) e integrar no SidebarFooter
- [ ] 09-03: Fix drawer mobile — useEffect pathname + setOpenMobile(false); verificar 100svh no Sheet do iOS Safari

### Phase 10: Responsive Pages
**Goal**: Todas as rotas autenticadas sao usaveis em 320px — tabelas como cards, formularios full-width, FAB sem conflito com teclado virtual
**Depends on**: Phase 9
**Requirements**: RESP-01, RESP-02, RESP-03, RESP-06, RESP-07, TOUCH-02, TOUCH-03
**Success Criteria** (what must be TRUE):
  1. Admin acessa /admin/leads em 320px e ve card layout com acoes acessiveis via DropdownMenu (3-pontos)
  2. Admin acessa /admin/users em 320px e ve card layout com acoes acessiveis via DropdownMenu
  3. Vendedor preenche formulario de lead em 320px — campos empilhados em coluna unica, sem overflow horizontal
  4. Scroll infinito na lista de leads funciona com sidebar presente — IntersectionObserver usa root correto
  5. FAB "Novo Lead" nao sobrepoe sidebar trigger e nao salta quando teclado virtual abre no iOS
  6. Todas as rotas autenticadas renderizam em 320px sem scrollbar horizontal
**Plans**: 3 plans
**UI hint**: yes

Plans:
- [ ] 10-01: Admin leads table — card layout mobile com DropdownMenu de acoes; touch targets 44px
- [ ] 10-02: Admin users table — card layout mobile com DropdownMenu de acoes; touch targets 44px
- [ ] 10-03: Lead form grid responsivo (cols-1 mobile / cols-2 md+); FAB repositioning (sticky); IntersectionObserver root fix

### Phase 11: Dashboard + Visual Polish
**Goal**: Dashboard responsivo com charts que redimensionam apos sidebar toggle, breadcrumb contextual, e polish visual consistente em toda a aplicacao
**Depends on**: Phase 10
**Requirements**: RESP-04, RESP-05, POLISH-01, POLISH-03, POLISH-04, POLISH-05
**Success Criteria** (what must be TRUE):
  1. Stat cards do dashboard exibem grid responsivo: 1 coluna (mobile) -> 2 colunas (sm) -> 4 colunas (lg)
  2. Charts do dashboard redimensionam corretamente apos sidebar ser aberta/fechada — sem overflow
  3. Leaderboard e legivel em 320px com scroll horizontal — rank + nome + score visiveis sem truncamento
  4. AppTopbar exibe SidebarTrigger + breadcrumb indicando localizacao atual em todas as paginas
  5. Sidebar e paginas funcionam corretamente em dark mode e light mode
  6. Espacamento, tipografia e hierarquia visual sao consistentes em todas as paginas
**Plans**: 3 plans
**UI hint**: yes

Plans:
- [ ] 11-01: AppTopbar com SidebarTrigger + breadcrumb dinamico; dark mode audit em todas as paginas
- [ ] 11-02: Dashboard stat cards grid responsivo; Recharts ResponsiveContainer + resize apos sidebar toggle
- [ ] 11-03: Leaderboard scroll horizontal mobile; polish visual final (arrange, adapt, polish, typeset)

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
| 8. Layout Foundation | v1.1 | 0/3 | Not started | - |
| 9. Sidebar Content + Mobile UX | v1.1 | 0/3 | Not started | - |
| 10. Responsive Pages | v1.1 | 0/3 | Not started | - |
| 11. Dashboard + Visual Polish | v1.1 | 0/3 | Not started | - |
