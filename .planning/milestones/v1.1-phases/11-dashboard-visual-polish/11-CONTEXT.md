# Phase 11: Dashboard + Visual Polish - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Dashboard responsivo com charts que redimensionam após sidebar toggle, breadcrumb contextual em todas as páginas autenticadas, e polish visual consistente (Impeccable formal) em toda a aplicação. Não inclui novas funcionalidades — apenas responsividade do dashboard, topbar permanente com breadcrumb, e qualidade visual.

</domain>

<decisions>
## Implementation Decisions

### AppTopbar + Breadcrumb
- **D-01:** Criar componente `AppTopbar` com breadcrumb dinâmico baseado na rota atual via `usePathname()`. Mapeamento rota → rótulo implementado no componente (ex: `/dashboard` → "Dashboard", `/admin/leads` → "Admin > Leads").
- **D-02:** `SidebarTrigger` aparece apenas em mobile (< 768px, `md:hidden`). No desktop, sidebar sempre expandida (Phase 8 D-07/D-09) — sem trigger sem função.
- **D-03:** AppTopbar aparece em TODAS as páginas autenticadas dentro de `(app)/layout.tsx` — substituindo o `<header className="md:hidden">` atual.
- **D-04:** Componente `Breadcrumb` do `packages/ui/breadcrumb.tsx` já instalado — usar `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator`.

### Dashboard Layout
- **D-05:** Remover `max-w-[480px]` do `dashboard/page.tsx` — o dashboard passa a ocupar toda a largura disponível dentro do `SidebarInset`.
- **D-06:** Stat cards usam grid responsivo: `grid-cols-1` (mobile) → `sm:grid-cols-2` → `lg:grid-cols-4`. Mesmo padrão já usado em `admin/stats/stats-panel.tsx`.
- **D-07:** Charts já usam `ChartContainer` (ResponsiveContainer) — validar que redimensionam corretamente após sidebar toggle. Se necessário, forçar re-render via `ResizeObserver` ou key reset na mudança do estado da sidebar.

### Leaderboard Mobile
- **D-08:** Leaderboard mantém layout de cards verticais — já legível em 320px com rank + nome + score visíveis. Sem conversão para tabela horizontal. Validar que não há overflow em 320px.

### Polish Visual (Impeccable Formal)
- **D-09:** Impeccable formal em todas as páginas autenticadas: `/dashboard`, `/leads`, `/leads/new`, `/leads/[id]`, `/admin/leads`, `/admin/users`, `/admin/stats`. Skills aplicadas: `arrange` (layout/spacing), `adapt` (responsividade), `polish` (micro-details), `typeset` (tipografia).
- **D-10:** Dark mode audit incluído no polish — verificar todas as páginas em light e dark mode. Corrigir qualquer cor hardcoded ou elemento sem classe `dark:`.

### Claude's Discretion
- Mapeamento completo rota → rótulo para o breadcrumb (quais segmentos capitalizar, como tratar `[id]` dinâmico)
- Estratégia de resize dos charts após sidebar toggle (CSS transition vs ResizeObserver vs key reset)
- Sequência de aplicação do Impeccable (página por página ou por skill globalmente)
- Altura do AppTopbar (sugestão: `h-14` consistente com header atual)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Layout atual (modificar)
- `apps/web/src/app/(app)/layout.tsx` — SidebarProvider + SidebarInset + header atual `md:hidden`; substituir header por AppTopbar
- `apps/web/src/app/(app)/dashboard/page.tsx` — `max-w-[480px]` a ser removido
- `apps/web/src/app/(app)/dashboard/personal-dashboard.tsx` — stat cards com grid fixo a ser tornado responsivo

### Dashboard e charts
- `apps/web/src/components/stat-card.tsx` — StatCard component
- `apps/web/src/app/(app)/dashboard/dashboard.tsx` — Tabs + layout geral do dashboard
- `apps/web/src/app/(app)/dashboard/leaderboard-tab.tsx` — Leaderboard list
- `apps/web/src/components/leaderboard-entry.tsx` — LeaderboardEntry card component
- `apps/web/src/app/(app)/admin/stats/stats-panel.tsx` — Padrão `grid-cols-2 lg:grid-cols-4` a replicar
- `apps/web/src/app/(app)/admin/stats/stats-charts.tsx` — Exemplo de ChartContainer em uso

### UI Components (já instalados)
- `packages/ui/src/components/breadcrumb.tsx` — Breadcrumb suite completo (já instalado, sem uso ainda)
- `packages/ui/src/components/chart.tsx` — ChartContainer com ResponsiveContainer
- `packages/ui/src/components/sidebar.tsx` — useSidebar() hook com estado open/openMobile

### Phase context anterior (carry-forward decisions)
- `.planning/phases/08-layout-foundation/08-CONTEXT.md` — D-07/D-09 (sidebar sempre expandida desktop)
- `.planning/phases/10-responsive-pages/10-CONTEXT.md` — padrões de responsividade mobile-first

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useSidebar()` hook (`sidebar.tsx`): expõe `open` (desktop) e `openMobile` — usar para detectar toggle e forçar chart resize
- `ChartContainer` (`chart.tsx`): wrapper com `ResponsiveContainer` — não hardcodar width, usar `className="h-[Xpx] w-full"`
- `Breadcrumb*` components (`breadcrumb.tsx`): suite completo, zero config adicional
- `useIsMobile()` hook (`use-mobile.ts`): breakpoint 768px já configurado

### Established Patterns
- Responsive grid: `grid-cols-2 gap-4 lg:grid-cols-4` em `admin/stats/stats-panel.tsx` — replicar para dashboard
- Mobile-first Tailwind: default = mobile, `sm:` = 640px+, `md:` = 768px+, `lg:` = 1024px+
- `cn()` de `@dashboard-leads-profills/ui/lib/utils` para composição de className
- Dark mode: `dark:` prefixes em oklch colors para stat cards — padrão já validado

### Integration Points
- `(app)/layout.tsx`: Substituir `<header className="flex h-14 items-center gap-2 border-b px-4 md:hidden">` pelo `<AppTopbar>` permanente
- `dashboard/page.tsx`: Remover `max-w-[480px]` do container wrapper
- `personal-dashboard.tsx`: Atualizar `grid-cols-2` e `grid-cols-3` para breakpoints responsivos
- Charts em `personal-dashboard.tsx` e `stats-charts.tsx`: Verificar resize após sidebar toggle

</code_context>

<specifics>
## Specific Ideas

- Breadcrumb dinâmico: `/dashboard` → "Dashboard", `/leads` → "Leads", `/leads/new` → "Leads > Novo Lead", `/admin/leads` → "Admin > Leads", etc.
- Dashboard sem max-width — ocupa toda a área do SidebarInset como todas as outras páginas
- Leaderboard permanece em cards verticais — já funciona, não precisa de refactor

</specifics>

<deferred>
## Deferred Ideas

- Nenhuma ideia fora do escopo surgiu durante a discussão

</deferred>

---

*Phase: 11-dashboard-visual-polish*
*Context gathered: 2026-03-27*
