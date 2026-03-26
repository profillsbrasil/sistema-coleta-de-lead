# Project Research Summary

**Project:** Dashboard Leads Profills — v1.1 UI Refactor & Mobile UX
**Domain:** Sidebar navigation + full mobile responsiveness for Next.js App Router dashboard
**Researched:** 2026-03-26
**Confidence:** HIGH

## Executive Summary

O v1.1 e uma refatoracao de layout e UX mobile — sem novas features de produto. A pesquisa confirma que **zero novas dependencias sao necessarias**: todos os componentes shadcn/ui (Sidebar suite 20KB, Sheet, Collapsible, Card, Table, Avatar, DropdownMenu), hooks (`useIsMobile`), e icones Lucide ja estao instalados. A `AdminSidebar` com `SidebarProvider` ja funciona em producao no layout admin — o trabalho e promover esse pattern para toda a app.

A mudanca mais importante e arquitetural: criar route groups `(public)` e `(app)` para separar paginas sem sidebar (login, home) de paginas com sidebar (todas as rotas autenticadas). Isso elimina rendering condicional, layout flash, e o problema de dois `SidebarProvider` aninhados. O `Header` topbar e deletado completamente — a navegacao migra para `AppSidebar` unificado com secao "Admin" expandivel por role.

Os 7 pitfalls criticos estao todos mapeados a fases especificas: o problema mais comum (drawer mobile nao fecha apos navegacao, GitHub #5561/#6265) tem fix trivial de 5 linhas; o risco maior e a troca atomica root layout `grid->flex` que deve acontecer na mesma fase que a criacao do route groups.

---

## Key Findings

### Stack — Zero Novas Dependencias

**Todos os componentes necessarios ja estao em `packages/ui/src/components/`:**
- `sidebar.tsx` (20KB) — SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarTrigger, SidebarInset, SidebarRail
- `sheet.tsx` — usado internamente pelo Sidebar no mobile (Sheet overlay automatico)
- `collapsible.tsx` — secao Admin expandivel
- `card.tsx`, `badge.tsx` — card layout mobile para tabelas
- `avatar.tsx`, `dropdown-menu.tsx` — user info no footer
- `breadcrumb.tsx` — navegacao contextual mobile

**Hook `useIsMobile`** ja existe em `packages/ui/src/hooks/use-mobile.ts` (768px, alinhado com breakpoint `md`).

**Sidebar mobile behavior e built-in:** o componente ja renderiza Sheet overlay no mobile automaticamente quando `useIsMobile()` retorna `true`. Hamburguer, swipe, e state management ja sao gerenciados.

### Architecture — Route Groups + Sidebar Unificada

**Layout atual (ANTES):**
- Root layout tem `<Header />` topbar + `grid-rows-[auto_1fr]`
- Admin tem layout proprio com `SidebarProvider` + `AdminSidebar`
- Vendedor usa Header topbar (client-side role check via `useEffect`)
- Auth guard duplicado em cada pagina individualmente

**Layout recomendado (DEPOIS):**
```
app/
├── (public)/layout.tsx    — sem sidebar (login, home)
├── (app)/layout.tsx       — auth guard + SidebarProvider + AppSidebar + SidebarInset
│   ├── dashboard/
│   ├── leads/
│   └── admin/             — sem admin/layout.tsx (removido)
└── layout.tsx             — apenas html/body/Providers
```

**Novos componentes a criar (4):**
- `app-sidebar.tsx` — sidebar unificada com grupos Vendedor + Admin (collapsible, role-gated)
- `sidebar-user-menu.tsx` — avatar + nome + dropdown logout no footer
- `app-topbar.tsx` — SidebarTrigger + breadcrumb no topo do SidebarInset
- `app/(public)/layout.tsx` e `app/(app)/layout.tsx`

**Componentes a deletar (3):**
- `components/header.tsx` — substituido pelo AppSidebar
- `components/admin-sidebar.tsx` — absorcao no AppSidebar unificado
- `app/admin/layout.tsx` — substituido pelo `(app)/layout.tsx`

### Features — Prioridades

**P1 (deve shipar no v1.1):**
1. AppSidebar unificada substituindo Header (LAYOUT)
2. Route groups (public)/(app) atomicamente (LAYOUT)
3. Mobile drawer com hamburguer (LAYOUT — ja built-in no shadcn Sidebar)
4. Secao Admin collapsible na sidebar por role (LAYOUT)
5. UserMenu + ModeToggle para sidebar footer (LAYOUT)
6. Responsive admin leads table — card layout mobile (RESP)
7. Responsive admin users table — card layout mobile (RESP)
8. Lead form full-width mobile (RESP)
9. Touch targets 44x44px em todos elementos interativos (MOBILE)
10. Drawer fecha ao navegar no mobile — `usePathname` fix (MOBILE)

**P2 (polish — adicionar apos estrutura estavel):**
- Dashboard stat cards grid responsivo (1→2→4 cols)
- Charts responsivos (ResponsiveContainer + resize apos sidebar toggle)
- Breadcrumb no content header
- User info (avatar + nome) no sidebar footer
- Polish visual com impeccable skills

### Critical Pitfalls

| Pitfall | Fase | Fix |
|---------|------|-----|
| Nested SidebarProvider conflita admin layout | Fase 8 | Single SidebarProvider em (app)/layout, remover do admin layout |
| Root layout grid→flex causa CLS | Fase 8 | Swap atomico — route groups + remove Header na mesma fase |
| Drawer mobile nao fecha apos navigacao | Fase 9 | `useEffect` com `usePathname()` + `setOpenMobile(false)` |
| iOS Safari 100dvh gap no Sheet | Fase 9 | Usar `100svh` ou `inset: 0` no Sheet |
| iOS Safari `fixed` + virtual keyboard | Fase 10 | FAB: `sticky` em vez de `fixed`; testar no iPhone fisico |
| Recharts nao redimensiona apos sidebar toggle | Fase 11 | `ResponsiveContainer` + listener `transitionend` |
| Table→card: action buttons perdidos | Fase 10 | `DropdownMenu` 3-pontos para acoes no mobile; `e.stopPropagation()` |

---

## Implications for Roadmap

### Fase 8: Layout Foundation (route groups + sidebar shell)
**Atomico e nao-negociavel.** Cria route groups, move paginas publicas para `(public)`, cria `(app)/layout.tsx` com `SidebarProvider` + `AppSidebar` + `SidebarInset`, deleta `Header` e `AdminSidebar`, remove `SidebarProvider` do admin layout.

**Pitfalls endereçados:** Nested SidebarProvider, root layout grid→flex CLS.
**Deliverable:** App funcional com sidebar em todas as rotas autenticadas; login sem sidebar.

### Fase 9: Sidebar Content + Mobile
**Conteudo da sidebar.** Nav items com icones e active state, secao Admin collapsible por role, UserMenu no footer, fix do drawer-nao-fecha, verificacao Safari 100dvh.

**Pitfalls endereçados:** Drawer nao fecha, Safari 100dvh gap.
**Deliverable:** Sidebar totalmente funcional com navegacao, roles, mobile drawer correto.

### Fase 10: Responsive Pages
**Tabelas, formularios, touch targets.** Admin leads table → card mobile, admin users table → card mobile, lead form full-width mobile, touch targets 44px audit, FAB reposicionamento, IntersectionObserver com novo scroll container.

**Pitfalls endereçados:** iOS fixed positioning, table→card actions, IntersectionObserver sentinel.
**Deliverable:** Todas as paginas 100% usaveis em 320px.

### Fase 11: Dashboard + Visual Polish
**Charts + polish.** ResponsiveContainer em todos os charts, resize apos sidebar toggle, breadcrumb, user footer, stat cards grid responsivo, polish com impeccable skills (arrange, adapt, polish).

**Pitfalls endereçados:** Recharts resize.
**Deliverable:** Dashboard responsivo, visual polish completo, dark mode verificado.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack (zero deps) | HIGH | Verificado diretamente nos arquivos do projeto |
| Architecture (route groups) | HIGH | Pattern Next.js padrão, already working in admin |
| Features (prioridades) | HIGH | Baseado em componentes existentes e complexidade verificada |
| Pitfalls | HIGH | Verificado contra codebase real, GitHub issues, iOS Safari docs |
| Build order | HIGH | Dependências rastreadas no código |

### Open Questions

- `/todos` page: mover para `(public)` ou `(app)`? (Atualmente sem auth guard)
- `/auth/callback`: verificar que a rota funciona após reorganização dos route groups
- Leaderboard no mobile: horizontal scroll (comparativo) vs card-por-linha — recomendado: horizontal scroll com colunas essenciais

---

## Sources

- Codebase: `packages/ui/src/components/sidebar.tsx`, `admin/layout.tsx`, `components/header.tsx`, `components/admin-sidebar.tsx`, `packages/ui/package.json`
- shadcn/ui GitHub issues: #5561, #6265, #5545, #7808 (sidebar mobile bugs)
- iOS 26 Safari viewport/dvh: Apple Developer Forums thread #803987
- WCAG 2.5.5: Target size requirements (44x44px minimum)
- Next.js route groups: official docs pattern

---
*Research completed: 2026-03-26*
*Ready for requirements: yes*
