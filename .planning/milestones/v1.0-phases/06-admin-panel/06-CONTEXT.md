# Phase 6: Admin Panel - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin consegue visualizar e gerenciar todos os leads de todos os vendedores, filtrar por vendedor, editar ou excluir qualquer lead, gerenciar usuarios, e ver stats globais da equipe com filtros avancados. Tudo via rotas /admin/* com layout e sidebar proprios.

</domain>

<decisions>
## Implementation Decisions

### Navegacao e acesso
- **D-01:** Painel admin em rota separada `/admin/*` com layout e sidebar dedicados
- **D-02:** Admin tambem acessa `/dashboard` e `/leads` como vendedor normal (pode coletar leads)
- **D-03:** No `/dashboard`, admin ve um seletor de vendedor ao lado das tabs para visualizar o dashboard de outro vendedor
- **D-04:** Link "Admin" visivel no header apenas para usuarios com role admin

### Gerenciamento de leads
- **D-05:** Tela por vendedor -- admin seleciona um vendedor primeiro, depois ve os leads dele com stats do vendedor
- **D-06:** Reutilizar LeadForm existente para edicao de leads (mesmo formulario que o vendedor usa)
- **D-07:** Admin opera server-only (tRPC direto via adminProcedure) -- sem Dexie, sem sync engine
- **D-08:** Admin pode editar e excluir qualquer lead de qualquer vendedor

### Gerenciamento de usuarios
- **D-09:** Cadastro aberto -- qualquer pessoa com acesso ao site pode criar conta via Google login
- **D-10:** Admin gerencia usuarios existentes: listar, ver stats, editar nome/role, desativar
- **D-11:** Desativacao usa flag no banco (user_roles) + bloquear via Supabase Admin API (dupla protecao)
- **D-12:** Roles disponiveis: admin e vendedor (enum existente em user_roles)

### Stats globais
- **D-13:** Tela nova em `/admin/stats` com metricas agregadas da equipe (nao reutiliza dashboard do vendedor)
- **D-14:** Metricas: total de leads, breakdown por tag, ranking de vendedores, leads por periodo (grafico temporal)
- **D-15:** Filtros avancados: vendedor + periodo + tag + segmento

### Claude's Discretion
- Layout exato da sidebar admin (itens, icones, ordenacao)
- Design dos graficos de stats globais (tipo de chart, cores)
- Granularidade do seletor de periodo (dia/semana/mes ou date picker)
- Paginacao ou infinite scroll na lista de leads do admin

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auth e roles
- `packages/api/src/index.ts` -- adminProcedure middleware (role check via JWT claims)
- `packages/api/src/context.ts` -- Supabase client no tRPC context (supabase, user, userRole)
- `packages/db/src/schema/auth.ts` -- user_roles table com app_role enum (admin, vendedor)

### Leads
- `packages/db/src/schema/leads.ts` -- Schema da tabela leads (campos, indices)
- `packages/api/src/routers/sync.ts` -- CRUD de leads via tRPC (reference para admin routes)
- `apps/web/src/components/lead-form.tsx` -- LeadForm component (reutilizar para admin edit)

### Dashboard (reutilizar patterns)
- `apps/web/src/app/dashboard/dashboard.tsx` -- Tabs component (admin precisa de seletor de vendedor)
- `apps/web/src/app/dashboard/personal-dashboard.tsx` -- PersonalDashboard (stats + chart)
- `packages/api/src/routers/leaderboard.ts` -- Leaderboard query (reutilizar para ranking admin)

### UI components
- `packages/ui/src/components/` -- shadcn components disponiveis (Card, Table, Badge, Tabs, Chart, etc.)
- `CLAUDE.md` secao "UI Components" -- regras de uso de shadcn (compound patterns, cn(), Empty)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `adminProcedure` em `packages/api/src/index.ts` -- middleware pronto para rotas admin
- `LeadForm` em `apps/web/src/components/lead-form.tsx` -- reutilizar para edicao admin
- `StatCard`, `LeaderboardEntry` -- componentes de dashboard ja existentes
- `ChartContainer`/`ChartTooltip` do shadcn -- para graficos de stats globais
- `Table` component do shadcn -- para listas de leads e usuarios admin
- `Skeleton` component -- para loading states

### Established Patterns
- tRPC procedures com Zod input validation
- Server Components para auth guard + Client Components para interatividade
- shadcn compound patterns (CardHeader/CardContent, etc.)
- `cn()` para composicao de className

### Integration Points
- Header existente -- adicionar link "Admin" condicional ao role
- Proxy/auth guard -- redirecionar admin para /admin ou permitir acesso dual
- Supabase Admin API -- necessaria para ban/unban de usuarios (requer service role key)

</code_context>

<specifics>
## Specific Ideas

- Admin pode selecionar vendedor no /dashboard (ao lado das tabs) para ver o dashboard de outro vendedor
- Tela de leads por vendedor mostra stats do vendedor selecionado junto com a lista
- Stats globais com graficos de tendencia temporal (leads por periodo)
- Filtros avancados incluem vendedor + periodo + tag + segmento

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 06-admin-panel*
*Context gathered: 2026-03-25*
