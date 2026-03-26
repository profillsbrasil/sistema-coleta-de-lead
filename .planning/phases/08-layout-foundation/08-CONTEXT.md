# Phase 8: Layout Foundation - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Trocar o layout inteiro de topbar (`Header`) para sidebar navigation (shadcn `Sidebar`). Criar route groups `(public)` e `(app)` para separar login das paginas autenticadas. Remover Header, AdminSidebar e admin/layout.tsx. Auth guard centralizado em `(app)/layout.tsx`.

Isso e mudanca ESTRUTURAL — o conteudo da sidebar (nav items, user menu, polish) e refinado nas Fases 9-11, mas nav items basicos ja sao incluidos nesta fase para que a sidebar seja funcional desde o inicio.

</domain>

<decisions>
## Implementation Decisions

### Rotas e Route Groups
- **D-01:** Unica pagina publica e `/login` — fica em `app/(public)/login/page.tsx` com layout sem sidebar
- **D-02:** `/` (home) redireciona para `/dashboard` se logado, `/login` se nao logado — nao e mais uma pagina com conteudo
- **D-03:** Paginas `/todos` e `page.tsx` (home) sao DELETADAS — nao tem utilidade no produto
- **D-04:** `/auth/callback` fica na raiz (`app/auth/callback/`) fora dos route groups — callback nao precisa de layout
- **D-05:** Todas as outras paginas (/dashboard, /leads, /leads/new, /leads/[id], /admin/*) ficam em `app/(app)/`

### Sidebar Shell (AppSidebar)
- **D-06:** AppSidebar ja inclui nav items basicos na Phase 8: Dashboard, Leads, Novo Lead + secao Admin (collapsible, role-gated)
- **D-07:** Sidebar no desktop e SEMPRE EXPANDIDA — sem modo icon-only, sem Ctrl+B para colapsar. `collapsible="none"` ou equivalente
- **D-08:** Sidebar no mobile (< 768px) usa Sheet drawer built-in do shadcn Sidebar — hamburguer abre, conteudo ocupa tela
- **D-09:** Sidebar no desktop e fixa e nao colapsa — labels completos sempre visiveis

### Auth Guard e Roles
- **D-10:** `(app)/layout.tsx` usa `getUser()` para auth check + `getClaims()` para role detection — mesmo padrao do admin/layout.tsx atual
- **D-11:** `isAdmin` e passado como prop ao `AppSidebar` — sem client-side role fetch
- **D-12:** Paginas admin dentro de `(app)/admin/` MANTÊM role guard server-side proprio — sidebar esconder links nao e seguranca, e UX only

### Cleanup e Execucao
- **D-13:** Execucao sequencial em 3 plans: Plan 1 (route groups + mover paginas) → Plan 2 ((app)/layout + AppSidebar shell) → Plan 3 (remover Header, AdminSidebar, admin/layout, limpar root layout)
- **D-14:** `Header` (`components/header.tsx`) e DELETADO completamente — sem referencias restantes
- **D-15:** `AdminSidebar` (`components/admin-sidebar.tsx`) e DELETADO — funcionalidade absorvida pelo AppSidebar
- **D-16:** `admin/layout.tsx` e DELETADO — auth guard vai para `(app)/layout.tsx`, role guard fica inline nas admin pages
- **D-17:** Root `layout.tsx` perde `<Header />` e o `grid min-h-svh grid-rows-[auto_1fr]` — fica apenas Providers + `{children}`

### Claude's Discretion
- Brand/logo no SidebarHeader — Claude decide melhor approach (texto, icone+texto, etc.)
- Estilo e espacamento do sidebar shell
- Tratamento de loading state durante auth check no layout

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Layout atual (arquivos a modificar/deletar)
- `apps/web/src/app/layout.tsx` — Root layout com Header + grid; precisa remover Header e grid
- `apps/web/src/components/header.tsx` — Topbar a ser deletado; referencia para nav links existentes
- `apps/web/src/components/admin-sidebar.tsx` — Admin sidebar a ser absorvido; referencia para padrao shadcn Sidebar ja funcional
- `apps/web/src/app/admin/layout.tsx` — Admin layout com SidebarProvider + auth/role guard; padrao a ser promovido

### Componentes shadcn (ja instalados)
- `packages/ui/src/components/sidebar.tsx` — Sidebar suite completo (Provider, Content, Group, Menu, Footer, etc.)
- `packages/ui/src/hooks/use-mobile.ts` — Hook useIsMobile (768px breakpoint)

### Pesquisa de milestone
- `.planning/research/ARCHITECTURE.md` — Route groups pattern, component create/modify/delete list, build order
- `.planning/research/PITFALLS.md` — Pitfall 1 (nested SidebarProvider) e Pitfall 2 (grid→flex CLS)
- `.planning/research/STACK.md` — Zero novas dependencias, todos componentes ja instalados

### Auth
- `apps/web/src/lib/supabase/server.ts` — createClient server-side (usado no admin/layout.tsx)
- `apps/web/src/lib/supabase/client.ts` — createClient browser (usado no Header — sera removido)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AdminSidebar` pattern: `SidebarContent > SidebarGroup > SidebarGroupLabel > SidebarMenu > SidebarMenuItem > SidebarMenuButton` — reutilizar no AppSidebar
- `pathname.startsWith(href)` para active state — ja funciona corretamente no AdminSidebar
- `SidebarMenuButton` com `render={<Link href={...} />}` — padrao de renderizacao ja validado
- `UserMenu` component (`components/user-menu.tsx`) — pode ser migrado para SidebarFooter
- `ModeToggle` component (`components/mode-toggle.tsx`) — pode ser migrado para SidebarFooter
- Lucide icons ja usados: `ClipboardList`, `LayoutDashboard`, `Users`

### Established Patterns
- Admin layout usa `async function` Server Component com `supabase.auth.getUser()` + `getClaims()` — exatamente o padrao a ser promovido para `(app)/layout.tsx`
- `redirect("/login")` para nao autenticados, `redirect("/dashboard")` para nao-admin
- `as unknown as "/"` type casts para typedRoutes em links — tech debt existente que sera mantido por ora

### Integration Points
- `SyncInitializer` em `Providers` — deve continuar funcionando com novo layout (nao depende de Header)
- `middleware.ts` em `apps/web/src/middleware.ts` — session refresh via updateSession; precisa verificar compatibilidade com route groups
- `FAB` component (`components/fab.tsx`) — botao flutuante "Novo Lead"; posicao pode precisar de ajuste com sidebar

</code_context>

<specifics>
## Specific Ideas

- Unica pagina publica e login — TUDO o resto e autenticado com sidebar
- Home page (/) deve redirecionar, nao ter conteudo proprio
- /todos era demo do v1.0, pode ser deletada
- Sidebar NUNCA colapsa no desktop — sempre expandida com labels completos
- No mobile, comportamento Sheet/drawer built-in do shadcn e suficiente

</specifics>

<deferred>
## Deferred Ideas

- UserMenu completo no SidebarFooter (avatar, nome, role, logout) — Phase 9
- Touch targets 44px nos nav items — Phase 9
- Drawer fecha ao navegar no mobile (usePathname fix) — Phase 9
- Breadcrumb no AppTopbar — Phase 11

</deferred>

---

*Phase: 08-layout-foundation*
*Context gathered: 2026-03-26*
