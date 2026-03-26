# Requirements: Dashboard Leads Profills v1.1

**Defined:** 2026-03-26
**Core Value:** Vendedores coletam leads de forma rapida e confiavel mesmo sem internet, com sync automatico quando a conexao voltar.
**Milestone:** v1.1 UI Refactor & Mobile UX

---

## v1.1 Requirements

### Layout — Sidebar Navigation

- [ ] **LAYOUT-01**: App possui sidebar de navegacao (shadcn Sidebar) substituindo o topbar `Header` em todas as rotas autenticadas
- [x] **LAYOUT-02**: Route groups `(public)` e `(app)` separam paginas sem sidebar (login, home) de paginas com sidebar — zero condicional no root layout
- [ ] **LAYOUT-03**: `SidebarProvider` unico em `(app)/layout.tsx` — nenhum `SidebarProvider` aninhado (admin layout nao tem provider proprio)
- [ ] **LAYOUT-04**: `AppSidebar` unificado com dois grupos: "Vendedor" (sempre visivel) e "Admin" (collapsible, visivel apenas para role admin)
- [ ] **LAYOUT-05**: `Header` topbar removido — sem referencia a `header.tsx` no codebase apos migracao
- [ ] **LAYOUT-06**: `AdminSidebar` e `admin/layout.tsx` removidos — admin layout simplificado para guard de role apenas
- [ ] **LAYOUT-07**: Auth guard centralizado em `(app)/layout.tsx` como Server Component — paginas individuais nao duplicam `getUser()` + `redirect()`
- [ ] **LAYOUT-08**: `UserMenu` e `ModeToggle` migrados para `SidebarFooter` — removidos do topbar

### Mobile — Drawer & Navigation

- [ ] **MOBILE-01**: No mobile (< 768px), sidebar renderiza como Sheet drawer a partir da esquerda com botao hamburguer
- [ ] **MOBILE-02**: Drawer fecha automaticamente apos navegacao (click em link) no mobile — sem fechar manualmente
- [x] **MOBILE-03**: Sidebar nao aparece nas paginas de login e home — layout publico sem sidebar
- [ ] **MOBILE-04**: Sheet mobile nao exibe gap na parte inferior no iOS Safari (usa `100svh` ou `inset: 0`, nao `100dvh`)
- [ ] **MOBILE-05**: Sidebar em desktop e collapsible para modo icon-only (Ctrl+B) com estado persistido via cookie

### Responsividade — Todas as Paginas

- [ ] **RESP-01**: Admin leads table renderiza como card layout em mobile (< 768px) com acoes acessiveis via DropdownMenu
- [ ] **RESP-02**: Admin users table renderiza como card layout em mobile (< 768px) com acoes acessiveis via DropdownMenu
- [ ] **RESP-03**: Formulario de captura de lead (`lead-form.tsx`) usa `grid-cols-1` em mobile e `grid-cols-2` em `md`+
- [ ] **RESP-04**: Dashboard stat cards usam grid responsivo (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`)
- [ ] **RESP-05**: Charts do dashboard (Recharts) redimensionam corretamente com `ResponsiveContainer` — sem overflow apos sidebar toggle
- [ ] **RESP-06**: Lead list com infinite scroll funciona corretamente dentro do layout com sidebar (IntersectionObserver com `root` correto)
- [ ] **RESP-07**: Todas as rotas autenticadas (/dashboard, /leads, /leads/new, /leads/[id], /admin/*) renderizam corretamente em 320px sem overflow horizontal

### Touch & Acessibilidade

- [ ] **TOUCH-01**: Todos os elementos interativos da sidebar (nav items, botoes) tem touch target minimo de 44x44px
- [ ] **TOUCH-02**: Acoes nas tabelas admin (editar, excluir, trocar role) acessiveis via DropdownMenu no mobile (sem botoes minusculos)
- [ ] **TOUCH-03**: FAB "Novo Lead" nao sobrepoe sidebar trigger no mobile; nao salta quando teclado virtual abre no iOS
- [ ] **TOUCH-04**: Active state da sidebar indica rota atual corretamente (incluindo rotas aninhadas como `/admin/leads/[id]`)

### Polish Visual

- [ ] **POLISH-01**: AppTopbar dentro de `SidebarInset` exibe SidebarTrigger + breadcrumb mostrando localizacao atual
- [ ] **POLISH-02**: SidebarFooter exibe avatar + nome + role do usuario logado
- [ ] **POLISH-03**: Leaderboard exibe na horizontal com scroll no mobile (manter comparabilidade — rank + nome + score visiveis)
- [ ] **POLISH-04**: Sidebar funciona corretamente em dark mode e light mode
- [ ] **POLISH-05**: Polish visual com impeccable skills: espacamento, tipografia, hierarquia visual consistentes em todas as paginas

---

## v1.2 Requirements (Deferred)

### PWA

- **PWA-01**: App tem manifest PWA configurado para instalacao em homescreen
- **PWA-02**: Prompt de instalacao aparece na home para usuarios mobile

### Backlog Original

- **ENH-01**: Exportacao de leads para CSV/Excel
- **ENH-02**: Indicador visual de conectividade
- **ENH-03**: Autocomplete no campo segmento
- **ENH-04**: Alerta visual de lead duplicado (mesmo telefone)
- **ENH-05**: Supabase Realtime para leaderboard sub-5s
- **ENH-06**: Leaderboard mostra nome real de todos os vendedores (JOIN a auth.users)

---

## Out of Scope (v1.1)

| Feature | Reason |
|---------|--------|
| Bottom tab navigation | Conflita com sidebar drawer; dois paradigmas de nav confundem; FAB overlap |
| Sidebar com largura customizavel (drag resize) | Complexidade de pointer events, quebra assumptions de layout; shadcn defaults sao battle-tested |
| Nested sidebar menus | App tem apenas ~8 rotas; aninhamento adiciona cognitive load sem valor |
| Skeleton loading para nav items | Items sao estaticos/hardcoded — loading state seria visual falso |
| Swipe left/right para abrir sidebar | Conflita com swipe horizontal em tabelas e leaderboard |
| Features de produto novas | Foco exclusivo em refatoracao de layout e UX mobile |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LAYOUT-01 | Phase 8 | Pending |
| LAYOUT-02 | Phase 8 | Complete |
| LAYOUT-03 | Phase 8 | Pending |
| LAYOUT-04 | Phase 9 | Pending |
| LAYOUT-05 | Phase 8 | Pending |
| LAYOUT-06 | Phase 8 | Pending |
| LAYOUT-07 | Phase 8 | Pending |
| LAYOUT-08 | Phase 9 | Pending |
| MOBILE-01 | Phase 9 | Pending |
| MOBILE-02 | Phase 9 | Pending |
| MOBILE-03 | Phase 8 | Complete |
| MOBILE-04 | Phase 9 | Pending |
| MOBILE-05 | Phase 9 | Pending |
| RESP-01 | Phase 10 | Pending |
| RESP-02 | Phase 10 | Pending |
| RESP-03 | Phase 10 | Pending |
| RESP-04 | Phase 11 | Pending |
| RESP-05 | Phase 11 | Pending |
| RESP-06 | Phase 10 | Pending |
| RESP-07 | Phase 10 | Pending |
| TOUCH-01 | Phase 9 | Pending |
| TOUCH-02 | Phase 10 | Pending |
| TOUCH-03 | Phase 10 | Pending |
| TOUCH-04 | Phase 9 | Pending |
| POLISH-01 | Phase 11 | Pending |
| POLISH-02 | Phase 9 | Pending |
| POLISH-03 | Phase 11 | Pending |
| POLISH-04 | Phase 11 | Pending |
| POLISH-05 | Phase 11 | Pending |

**Coverage:**
- v1.1 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-26*
*Last updated: 2026-03-26 after initial definition*
