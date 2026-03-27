# Phase 9: Sidebar Content + Mobile UX - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Sidebar totalmente funcional com navegação por role, drawer mobile que fecha sozinho após navegação, e user menu no footer. Refinamento do AppSidebar criado na Phase 8 — adiciona user menu, auto-close mobile, touch targets 44px, e active state refinado para rotas aninhadas.

**Nota:** Success criteria #6 do roadmap (collapse icon-only com Ctrl+B) foi CANCELADO — usuario manteve decisao Phase 8 D-07/D-09 de sidebar sempre expandida no desktop.

</domain>

<decisions>
## Implementation Decisions

### Desktop collapse mode
- **D-01:** Sidebar desktop MANTÉM sempre expandida — sem modo icon-only, sem Ctrl+B, sem cookie persistence. Decisão Phase 8 (D-07/D-09) prevalece. Success criteria #6 do roadmap removido do escopo.
- **D-02:** `collapsible="offcanvas"` mantido — permite Sheet mobile mas sem collapse desktop.

### User menu no footer
- **D-03:** SidebarFooter exibe avatar + nome + role badge + ModeToggle (Sun/Moon) + botão "Sair" inline (sem DropdownMenu). 1 clique para logout.
- **D-04:** Avatar via Gravatar usando hash SHA-256 do email do usuário (`crypto.subtle.digest("SHA-256", ...)`). Fallback para iniciais do nome quando Gravatar não existe. (Atualizado de MD5 para SHA-256 — recomendação atual do Gravatar.)
- **D-05:** Nome e role vêm de server props — `(app)/layout.tsx` já faz `getUser()`, passa `userName`, `userEmail` e `userRole` como props adicionais ao AppSidebar. Zero client-side fetch.
- **D-06:** Role badge exibe "Admin" ou "Vendedor" como texto simples ao lado do nome.

### Mobile drawer auto-close
- **D-07:** `useEffect` monitora `pathname` changes via `usePathname()` + chama `setOpenMobile(false)` do `useSidebar()` hook. Fecha imediatamente após navegação — sem delay.
- **D-08:** iOS Safari viewport height: Claude's Discretion (baseado nos pitfalls documentados — 100svh vs 100dvh).

### Touch targets
- **D-09:** Touch targets 44px aplicados SOMENTE nos nav items — `SidebarMenuButton` recebe `className="min-h-11"`. Collapsible trigger, logout button e outros mantêm sizing padrão shadcn.
- **D-10:** Touch target scope é apenas sidebar nav — tabelas, formulários e outros componentes ficam para Phases 10-11.

### Claude's Discretion
- iOS Safari viewport unit (100svh vs 100dvh) para Sheet height
- Cor do background do avatar de iniciais (fallback Gravatar)
- Estilo exato do role badge (texto, chip, etc.)
- Animação de transição do drawer mobile

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Sidebar (componentes existentes)
- `apps/web/src/components/app-sidebar.tsx` — AppSidebar atual (Phase 8) — base para modificações
- `apps/web/src/app/(app)/layout.tsx` — Layout com auth guard + SidebarProvider; precisa passar user data como props
- `packages/ui/src/components/sidebar.tsx` — Sidebar suite completo (useSidebar hook com setOpenMobile)

### Pesquisa de milestone
- `.planning/research/PITFALLS.md` — Pitfall #3 (drawer auto-close via usePathname), Pitfall #5 (iOS Safari viewport)
- `.planning/research/ARCHITECTURE.md` — Component architecture, sidebar integration points

### Auth e user data
- `apps/web/src/lib/supabase/server.ts` — createClient server-side (getUser em layout)
- `packages/api/src/context.ts` — tRPC context com user/claims extraction pattern

### Phase 8 context (decisões carry-forward)
- `.planning/phases/08-layout-foundation/08-CONTEXT.md` — D-07/D-09 (always expanded), D-08 (offcanvas), D-11 (isAdmin prop)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AppSidebar` (`app-sidebar.tsx`): Já tem nav groups, isAdmin prop, usePathname, SidebarFooter vazio
- `useSidebar()` hook em `sidebar.tsx`: Expõe `setOpenMobile(false)` para auto-close
- `useIsMobile()` hook em `use-mobile.ts`: Breakpoint 768px já configurado
- Supabase `getUser()` em `(app)/layout.tsx`: Já retorna user data — expandir para extrair nome/email
- `mode-toggle.tsx`: Componente existente usando `useTheme()` de `next-themes` — adaptar para icon button simples no SidebarFooter

### Established Patterns
- Server Component → Client Component via props: `(app)/layout.tsx` (Server) → `AppSidebar` (Client)
- `render` prop em SidebarMenuButton: `render={<Link href={...} />}` — padrão base-ui, não asChild
- Role detection: `getClaims()` no layout → `isAdmin` prop → conditional rendering

### Integration Points
- `(app)/layout.tsx`: Precisa expandir para passar userName, userEmail, userRole ao AppSidebar
- `app-sidebar.tsx`: Recebe novas props, adiciona SidebarFooter com user menu + ModeToggle, adiciona useEffect auto-close
- CSS: `min-h-11` nos SidebarMenuButton para touch targets 44px

</code_context>

<specifics>
## Specific Ideas

- Logout direto com botão inline — sem dropdown, 1 clique para sair
- Gravatar como fonte primária de avatar — hash SHA-256 do email, fallback iniciais
- ModeToggle como icon button (Sun/Moon) no SidebarFooter ao lado do logout — completa LAYOUT-08

</specifics>

<deferred>
## Deferred Ideas

- Desktop collapse icon-only com Ctrl+B — cancelado, sidebar sempre expandida
- Cookie persistence do estado da sidebar — não aplicável sem collapse
- Touch targets 44px em tabelas e formulários — Phase 10

</deferred>

---

*Phase: 09-sidebar-content-mobile-ux*
*Context gathered: 2026-03-26*
