# Phase 10: Responsive Pages - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Todas as rotas autenticadas usaveis em 320px — tabelas admin viram card layout no mobile, formulario de lead usa grid responsivo, FAB sem conflito com teclado virtual no iOS, IntersectionObserver do infinite scroll funciona com sidebar presente. Nao inclui charts/dashboard (Phase 11) nem polish visual (Phase 11).

</domain>

<decisions>
## Implementation Decisions

### Table → Card mobile layout
- **D-01:** Admin leads table e admin users table transformam de `<Table>` para card layout em mobile (< 768px). Breakpoint via Tailwind `md:` — cards no default, tabela em `md:` e acima.
- **D-02:** Cards mostram info resumida sem expansao — clicar no card abre DropdownMenu de acoes. Sem accordion/expansao.
- **D-03:** Admin leads card mostra: Nome + Tag (badge quente/morno/frio), Vendedor (quem coletou), Telefone ou Email. Campos como Segmento, Data de criacao, Empresa ficam ocultos no mobile.
- **D-04:** Admin users card mostra: Nome + Role (badge Admin/Vendedor), Contagem de leads, Status (ativo/banido). Email fica oculto no mobile.

### Acoes nas tabelas mobile
- **D-05:** Acoes (editar, excluir, trocar role) acessiveis via DropdownMenu 3-pontos (icone ⋮) no canto do card. Touch target minimo 44px no trigger do DropdownMenu.
- **D-06:** Touch targets 44px (WCAG) em todos os elementos interativos das tabelas mobile — mesmo padrao da sidebar nav (Phase 9). Consistencia em todo o app.

### FAB "Novo Lead"
- **D-07:** FAB esconde quando teclado virtual esta ativo (via `visualViewport` API). Reaparece ao fechar teclado. Evita conflito visual e saltos no iOS.
- **D-08:** FAB aparece apenas em `/leads` e `/dashboard` — nao aparece em rotas admin, `/leads/new`, ou `/leads/[id]`.

### Lead form grid responsivo
- **D-09:** Converter lead-form.tsx de flex-col para CSS grid responsivo: `grid-cols-1` no mobile, `grid-cols-2` em `md`+. Campos obrigatorios (nome, telefone, email) ficam em coluna unica. Campos opcionais no collapsible (empresa, cargo, segmento, notas) usam 2 colunas no desktop.

### Claude's Discretion
- Estrategia de hide/show colunas no breakpoint (hidden class vs conditional render)
- Exact card design (padding, spacing, border radius) — seguir padrao shadcn Card
- IntersectionObserver root adjustment para funcionar com sidebar SidebarInset scroll container
- Animacao de transicao entre table e card layout (se houver)
- `visualViewport` API implementation details para FAB hide

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Admin tables (componentes atuais)
- `apps/web/src/app/(app)/admin/leads/leads-panel.tsx` — Admin leads table atual com Table + scroll horizontal
- `apps/web/src/app/(app)/admin/users/users-panel.tsx` — Admin users table atual com Table + acoes inline
- `packages/ui/src/components/table.tsx` — Table component base shadcn
- `packages/ui/src/components/dropdown-menu.tsx` — DropdownMenu para acoes mobile

### Lead form e list
- `apps/web/src/components/lead-form.tsx` — Form atual com flex-col + max-w-[480px]
- `apps/web/src/app/(app)/leads/lead-list.tsx` — Lead list com IntersectionObserver + infinite scroll
- `apps/web/src/components/fab.tsx` — FAB "Novo Lead" fixed bottom-right

### Layout (sidebar context)
- `apps/web/src/app/(app)/layout.tsx` — Layout com SidebarProvider + SidebarInset (scroll container)
- `apps/web/src/components/app-sidebar.tsx` — Sidebar com auto-close mobile (Phase 9)

### Pesquisa de milestone
- `.planning/research/PITFALLS.md` — Pitfall #4 (IntersectionObserver root com sidebar), Pitfall #5 (iOS Safari viewport)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Card`, `CardHeader`, `CardContent` do shadcn — usar para card layout mobile
- `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` — ja instalados
- `Badge` component — ja usado para tags (quente/morno/frio) e roles
- `useIsMobile()` hook (`use-mobile.ts`) — breakpoint 768px ja configurado
- `LeadCard` component (`lead-card.tsx`) — referencia de card layout para leads individuais

### Established Patterns
- Responsive grid: `grid-cols-2 gap-4 lg:grid-cols-4` usado em stat cards — expandir padrao
- Mobile-first: `max-w-[480px]` + `mx-auto` em forms e listas — manter constraint
- Hidden elements: `md:hidden` ja usado para sidebar trigger mobile
- Tailwind responsive: default = mobile, `md:` = tablet+, `lg:` = desktop

### Integration Points
- `leads-panel.tsx`: Substituir `<Table>` por conditional render: `<MobileLeadCards>` (default) / `<Table>` (`md:block`)
- `users-panel.tsx`: Mesmo padrao de conditional render
- `lead-form.tsx`: Substituir `flex flex-col gap-4` por `grid grid-cols-1 md:grid-cols-2 gap-4`
- `fab.tsx`: Adicionar `visualViewport` resize listener para hide durante keyboard
- `lead-list.tsx`: Verificar se IntersectionObserver `root` precisa ser ajustado para SidebarInset

</code_context>

<specifics>
## Specific Ideas

- Cards admin devem ser simples — info resumida, sem expansao, acoes via DropdownMenu 3-pontos
- Consistencia de touch targets 44px entre sidebar (Phase 9) e tabelas (Phase 10)
- FAB esconde durante keyboard open — nao reposiciona, nao muda de sticky

</specifics>

<deferred>
## Deferred Ideas

- Charts responsivos (Recharts ResponsiveContainer) — Phase 11
- Breadcrumb contextual (AppTopbar) — Phase 11
- Dark mode audit — Phase 11
- Polish visual final (spacing, typography) — Phase 11
- Leaderboard scroll horizontal mobile — Phase 11

</deferred>

---

*Phase: 10-responsive-pages*
*Context gathered: 2026-03-27*
