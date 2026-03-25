# Phase 6: Admin Panel - Research

**Researched:** 2026-03-25
**Domain:** Admin panel com gerenciamento de leads, usuarios e stats globais
**Confidence:** HIGH

## Summary

Phase 6 implementa o painel administrativo em `/admin/*` com layout e sidebar dedicados. O admin gerencia leads de todos vendedores (CRUD completo), gerencia usuarios (listar, editar role, desativar via Supabase Admin API), e visualiza stats globais com filtros avancados. O admin tambem pode acessar `/dashboard` com um seletor de vendedor para ver o dashboard de qualquer vendedor.

A infraestrutura de autorizacao (`adminProcedure` middleware) ja esta pronta desde Phase 1. O trabalho principal e: (1) criar routers tRPC admin com queries sem filtro de `userId`, (2) criar o layout admin com sidebar, (3) criar paginas server-only para leads por vendedor, usuarios e stats globais, (4) adicionar `SUPABASE_SERVICE_ROLE_KEY` para operacoes admin de usuarios.

**Primary recommendation:** Criar um `adminRouter` no tRPC com sub-routers para leads, users e stats. Usar `adminProcedure` para todas as rotas. Admin opera server-only -- sem Dexie, sem sync engine. Reutilizar componentes existentes (LeadCard, StatCard, LeaderboardEntry) onde possivel.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Painel admin em rota separada `/admin/*` com layout e sidebar dedicados
- **D-02:** Admin tambem acessa `/dashboard` e `/leads` como vendedor normal (pode coletar leads)
- **D-03:** No `/dashboard`, admin ve um seletor de vendedor ao lado das tabs para visualizar o dashboard de outro vendedor
- **D-04:** Link "Admin" visivel no header apenas para usuarios com role admin
- **D-05:** Tela por vendedor -- admin seleciona um vendedor primeiro, depois ve os leads dele com stats do vendedor
- **D-06:** Reutilizar LeadForm existente para edicao de leads (mesmo formulario que o vendedor usa)
- **D-07:** Admin opera server-only (tRPC direto via adminProcedure) -- sem Dexie, sem sync engine
- **D-08:** Admin pode editar e excluir qualquer lead de qualquer vendedor
- **D-09:** Cadastro aberto -- qualquer pessoa com acesso ao site pode criar conta via Google login
- **D-10:** Admin gerencia usuarios existentes: listar, ver stats, editar nome/role, desativar
- **D-11:** Desativacao usa flag no banco (user_roles) + bloquear via Supabase Admin API (dupla protecao)
- **D-12:** Roles disponiveis: admin e vendedor (enum existente em user_roles)
- **D-13:** Tela nova em `/admin/stats` com metricas agregadas da equipe (nao reutiliza dashboard do vendedor)
- **D-14:** Metricas: total de leads, breakdown por tag, ranking de vendedores, leads por periodo (grafico temporal)
- **D-15:** Filtros avancados: vendedor + periodo + tag + segmento

### Claude's Discretion
- Layout exato da sidebar admin (itens, icones, ordenacao)
- Design dos graficos de stats globais (tipo de chart, cores)
- Granularidade do seletor de periodo (dia/semana/mes ou date picker)
- Paginacao ou infinite scroll na lista de leads do admin

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADMN-01 | Admin pode ver lista de todos os leads de todos vendedores | Admin leads router com query sem filtro userId + UI com Table/LeadCard |
| ADMN-02 | Admin pode filtrar leads por vendedor | Vendedor selector (Select component) + query parametrizada por userId |
| ADMN-03 | Admin pode editar qualquer lead (mesmo de outro vendedor) | Reutilizar LeadForm com adaptacao para server-side (tRPC direto, sem Dexie) |
| ADMN-04 | Admin pode excluir qualquer lead (soft-delete) | adminProcedure + soft-delete (set deletedAt) sem restricao de userId |
| ADMN-05 | Admin pode gerenciar usuarios (CRUD de vendedores) | Supabase Admin API (service_role) + user_roles table + tRPC admin router |
| ADMN-06 | Admin tem tela de stats globais com filtros avancados | Nova tela `/admin/stats` com queries agregadas + Recharts (BarChart, LineChart) |
| ADMN-07 | Admin tem acesso a todas as telas de vendedor (com filtro por vendedor) | Vendedor selector no `/dashboard` + admin sidebar com links condicionais |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Monorepo Turborepo**: Toda logica de API em `packages/api`, UI em `apps/web`
- **tRPC 11**: Procedures com Zod input validation, `adminProcedure` para rotas admin
- **Drizzle ORM**: Queries parametrizadas, schema em `packages/db`
- **Supabase Auth**: JWT claims com `user_role`, `getClaims()` para auth
- **shadcn/ui**: Compound patterns, `cn()` para className, imports path-based
- **Biome**: Tabs, double quotes, imports organizados automaticamente
- **Vitest**: Framework de testes, workspace config
- **Conventional Commits em Portugues**
- **Sem barrel files em hot paths**
- **Funcoes < 50 linhas, arquivos max 800 linhas, nesting < 4 niveis**

## Architecture Patterns

### Recommended Project Structure

```
packages/api/src/routers/
  admin/
    leads.ts           # CRUD de leads para admin (sem filtro userId)
    users.ts           # Gerenciamento de usuarios (list, update role, deactivate)
    stats.ts           # Stats globais agregadas com filtros
    index.ts           # adminRouter composto

apps/web/src/app/
  admin/
    layout.tsx         # Admin layout com sidebar (Server Component + auth guard)
    page.tsx           # Redirect para /admin/leads ou dashboard
    leads/
      page.tsx         # Lista de leads por vendedor (Server Component)
      leads-panel.tsx  # Client Component com seletor + lista
      [id]/
        page.tsx       # Edicao de lead individual
    users/
      page.tsx         # Lista de usuarios
      users-panel.tsx  # Client Component com tabela
    stats/
      page.tsx         # Stats globais
      stats-panel.tsx  # Client Component com graficos + filtros
  dashboard/
    dashboard.tsx      # Modificar para aceitar vendedor selector (quando admin)
```

### Pattern 1: Admin Layout com Sidebar

**What:** Layout dedicado para `/admin/*` com sidebar fixa e auth guard server-side.
**When to use:** Todas as paginas admin.

```typescript
// apps/web/src/app/admin/layout.tsx (Server Component)
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verificar role via claims
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as Record<string, unknown> | null;
  if (claims?.user_role !== "admin") redirect("/dashboard");

  return (
    <div className="flex min-h-[calc(100svh-49px)]">
      <AdminSidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
```

### Pattern 2: Admin tRPC Router

**What:** Router separado usando `adminProcedure` para todas as operacoes admin.
**When to use:** Todas as queries/mutations admin.

```typescript
// packages/api/src/routers/admin/leads.ts
import { adminProcedure, router } from "../../index";
import { db } from "@dashboard-leads-profills/db";
import { leads } from "@dashboard-leads-profills/db/schema/leads";
import { and, eq, isNull, sql } from "drizzle-orm";
import z from "zod";

export const adminLeadsRouter = router({
  listByUser: adminProcedure
    .input(z.object({
      userId: z.uuid(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      return db.select().from(leads)
        .where(and(eq(leads.userId, input.userId), isNull(leads.deletedAt)))
        .limit(input.limit)
        .offset(input.offset)
        .orderBy(leads.createdAt);
    }),

  update: adminProcedure
    .input(z.object({
      leadId: z.string(),
      data: z.object({ /* lead fields */ }),
    }))
    .mutation(async ({ input }) => {
      // Update sem restricao de userId
    }),

  delete: adminProcedure
    .input(z.object({ leadId: z.string() }))
    .mutation(async ({ input }) => {
      // Soft-delete sem restricao de userId
    }),
});
```

### Pattern 3: Supabase Admin Client (Service Role)

**What:** Cliente Supabase separado com service_role key para operacoes admin de usuarios.
**When to use:** Listar usuarios, ban/unban, update user metadata.

```typescript
// packages/api/src/lib/supabase-admin.ts
import { createClient } from "@supabase/supabase-js";
import { env } from "@dashboard-leads-profills/env/server";

// Singleton admin client -- NUNCA expor no client
export const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
```

### Pattern 4: LeadForm Adaptado para Admin

**What:** Reutilizar LeadForm existente mas com save/update via tRPC direto (sem Dexie).
**When to use:** Admin editando lead de qualquer vendedor.

O LeadForm atual usa `saveLead()` e `updateLead()` que escrevem no Dexie. Para admin, passar callbacks customizados:

```typescript
// Opcao: criar AdminLeadForm wrapper que usa tRPC mutations
// em vez de Dexie, reutilizando a UI do LeadForm
```

**Nota critica:** O LeadForm atual depende de Dexie internamente via `saveLead`/`updateLead`. Para admin (D-07: server-only), sera necessario:
1. Extrair a UI do formulario em componente puro (inputs, validacao, layout)
2. Criar wrapper admin que usa tRPC mutations para save/update
3. OU refatorar LeadForm para aceitar `onSave` callback generico

### Anti-Patterns to Avoid
- **Admin acessando Dexie**: Admin opera server-only (D-07). Nunca usar Dexie/sync engine nas telas admin.
- **Queries sem paginacao**: Lista de leads pode crescer. Sempre usar limit/offset no admin.
- **Service role key no client**: NUNCA expor `SUPABASE_SERVICE_ROLE_KEY` no client-side. Manter exclusivamente no server (tRPC procedures).
- **Soft-delete inconsistente**: Admin delete deve usar mesmo padrao de soft-delete (set `deletedAt`) que sync router usa.

## Standard Stack

### Core (ja instalado)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tRPC | 11.13.4 | Admin API routes | Ja configurado com adminProcedure |
| Drizzle ORM | 0.45.1 | Queries admin (leads, stats) | Ja configurado com PostgreSQL |
| @supabase/supabase-js | (instalado) | Admin API (service_role client) | Necessario para user management |
| Recharts | (instalado) | Graficos de stats globais | Ja usado no dashboard (Phase 5) |
| shadcn/ui Sidebar | (instalado) | Admin sidebar navigation | Componente disponivel em packages/ui |
| shadcn/ui Table | (instalado) | Tabelas de leads e usuarios | Componente disponivel em packages/ui |
| shadcn/ui Select | (instalado) | Seletores de vendedor e filtros | Componente disponivel em packages/ui |

### Nao instalar nada novo

Toda a stack necessaria ja esta instalada. A unica mudanca de infra e adicionar `SUPABASE_SERVICE_ROLE_KEY` nas env vars.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sidebar navigation | Custom div+links | shadcn Sidebar component | Responsivo, acessivel, tem collapso mobile |
| Data tables | Custom table com sort | shadcn Table + paginacao manual | Consistente com design system |
| User ban/unban | Flag manual no banco | Supabase `auth.admin.updateUserById({ ban_duration })` | Invalida sessions automaticamente |
| Date range picker | Input type=date raw | shadcn Calendar + Popover | UX superior, mobile-friendly |
| Role check no client | Custom hook | Ler claims do JWT via `getClaims()` | Pattern ja estabelecido no projeto |

## Common Pitfalls

### Pitfall 1: Service Role Key Exposure

**What goes wrong:** `SUPABASE_SERVICE_ROLE_KEY` chega ao client-side via bundle.
**Why it happens:** Usar a key em Server Components ou importar o modulo errado.
**How to avoid:** Criar `supabaseAdmin` em `packages/api/src/lib/` e usar APENAS em tRPC procedures (server-side). Nunca importar de `apps/web/src/`.
**Warning signs:** Build warning sobre env var no client bundle; `NEXT_PUBLIC_` prefix na key (nunca fazer isso).

### Pitfall 2: LeadForm Acoplado ao Dexie

**What goes wrong:** Tentar reutilizar LeadForm no admin mas ele chama `saveLead()`/`updateLead()` que escrevem no Dexie.
**Why it happens:** LeadForm foi construido para vendedor offline-first.
**How to avoid:** Refatorar LeadForm para aceitar `onSave` e `onUpdate` callbacks, ou criar `AdminLeadForm` wrapper que bypassa Dexie e usa tRPC mutations.
**Warning signs:** Erros de Dexie no contexto admin; dados salvos localmente sem ir ao servidor.

### Pitfall 3: N+1 Queries no Admin

**What goes wrong:** Listar leads de todos vendedores com lookup individual de nomes.
**Why it happens:** Tabela `leads` tem `user_id` mas nao tem nome do vendedor.
**How to avoid:** Usar JOIN com `auth.users` (mesmo pattern do leaderboard) ou buscar lista de usuarios uma vez e fazer join no application layer.
**Warning signs:** Paginas admin lentas; muitas queries no console.

### Pitfall 4: Stats Queries Sem Indice

**What goes wrong:** Queries de stats globais com filtro por periodo ficam lentas.
**Why it happens:** Tabela `leads` ja tem indice em `updated_at` mas filtros combinados (vendedor + periodo + tag) podem nao usar indices eficientemente.
**How to avoid:** Queries simples com filtros que usam indices existentes (`user_id_idx`, `interest_tag_idx`, `updated_at_idx`). Para graficos temporais, agrupar por DATE(created_at) usando indices existentes.
**Warning signs:** Query timeout no Supabase; dashboard admin lento.

### Pitfall 5: Proxy.ts Nao Protege /admin

**What goes wrong:** `proxy.ts` redireciona nao-autenticados mas nao checa role admin.
**Why it happens:** Proxy so verifica se usuario esta logado, nao se e admin.
**How to avoid:** Auth guard no admin layout.tsx (Server Component) que verifica `user_role === "admin"` e redireciona. Proxy continua como esta (apenas auth check). Dupla protecao: layout + adminProcedure no tRPC.
**Warning signs:** Vendedor acessando `/admin` e vendo pagina (mesmo que tRPC bloqueie os dados).

### Pitfall 6: Ban Sem Dupla Protecao

**What goes wrong:** Admin desativa usuario no banco mas Supabase Auth continua permitindo login.
**Why it happens:** Supabase Auth nao consulta `user_roles` automaticamente.
**How to avoid:** Ao desativar: (1) setar flag no `user_roles` E (2) chamar `supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: "876000h" })` para bloquear no Supabase Auth. Ao reativar: reverter ambos.
**Warning signs:** Usuario "desativado" ainda consegue logar.

## Code Examples

### Supabase Admin User Management

```typescript
// Listar usuarios (requer service_role key)
const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
  page: 1,
  perPage: 50,
});

// Banir usuario (ban_duration: duracoes Go-style)
await supabaseAdmin.auth.admin.updateUserById(userId, {
  ban_duration: "876000h", // ~100 anos = ban permanente
});

// Desbanir usuario
await supabaseAdmin.auth.admin.updateUserById(userId, {
  ban_duration: "none",
});

// Atualizar metadata
await supabaseAdmin.auth.admin.updateUserById(userId, {
  user_metadata: { full_name: "Novo Nome" },
});
```
Source: [Supabase JS Admin API docs](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid)

### Admin Stats Query com Filtros

```typescript
// Stats agregadas com filtros dinamicos
const conditions = [isNull(leads.deletedAt)];

if (input.userId) conditions.push(eq(leads.userId, input.userId));
if (input.tag) conditions.push(eq(leads.interestTag, input.tag));
if (input.startDate) conditions.push(gte(leads.createdAt, new Date(input.startDate)));
if (input.endDate) conditions.push(lte(leads.createdAt, new Date(input.endDate)));

const result = await db.select({
  total: sql<number>`count(*)::int`,
  quente: sql<number>`count(*) filter (where interest_tag = 'quente')::int`,
  morno: sql<number>`count(*) filter (where interest_tag = 'morno')::int`,
  frio: sql<number>`count(*) filter (where interest_tag = 'frio')::int`,
  score: sql<number>`sum(case when interest_tag = 'quente' then 3 when interest_tag = 'morno' then 2 else 1 end)::int`,
}).from(leads).where(and(...conditions));
```

### Leads por Periodo (grafico temporal)

```typescript
// Agrupar leads por dia para grafico de linha
const timeline = await db.execute(sql`
  SELECT
    DATE(created_at AT TIME ZONE 'America/Sao_Paulo') as "date",
    COUNT(*)::int as "count"
  FROM leads
  WHERE deleted_at IS NULL
    AND created_at >= ${startDate}
    AND created_at <= ${endDate}
  GROUP BY DATE(created_at AT TIME ZONE 'America/Sao_Paulo')
  ORDER BY "date" ASC
`);
```

### Admin Conditional Link no Header

```typescript
// apps/web/src/components/header.tsx
// Ler user_role dos JWT claims via getClaims() no Server Component pai
// e passar como prop, OU verificar client-side via Supabase client

// Opcao server-side (preferivel):
// No page.tsx pai, buscar claims e passar role como prop
// Header recebe { isAdmin: boolean } e renderiza link condicional
```

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL (Supabase) | Queries admin | OK | Hosted | -- |
| Supabase Auth Admin API | User management (D-10, D-11) | OK | Hosted | -- |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin user operations | NAO CONFIGURADO | -- | Adicionar em env vars |
| shadcn Sidebar | Admin layout | OK | Instalado | -- |
| shadcn Table | Listas admin | OK | Instalado | -- |
| shadcn Select | Filtros | OK | Instalado | -- |
| Recharts | Stats graficos | OK | Instalado | -- |

**Missing dependencies with no fallback:**
- `SUPABASE_SERVICE_ROLE_KEY` precisa ser adicionado em `packages/env/src/server.ts` e no `.env` do desenvolvedor. Sem ele, operacoes de ban/unban de usuarios nao funcionam.

**Missing dependencies with fallback:**
- Nenhum.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.1 |
| Config file | `vitest.workspace.ts` (root), `packages/api/vitest.config.ts` |
| Quick run command | `bun run test` |
| Full suite command | `bun run test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADMN-01 | Admin lista leads de todos vendedores | unit | `bun vitest run packages/api/src/__tests__/admin-leads.test.ts -t "list all"` | Wave 0 |
| ADMN-02 | Admin filtra leads por vendedor | unit | `bun vitest run packages/api/src/__tests__/admin-leads.test.ts -t "filter by user"` | Wave 0 |
| ADMN-03 | Admin edita qualquer lead | unit | `bun vitest run packages/api/src/__tests__/admin-leads.test.ts -t "update"` | Wave 0 |
| ADMN-04 | Admin exclui qualquer lead (soft-delete) | unit | `bun vitest run packages/api/src/__tests__/admin-leads.test.ts -t "delete"` | Wave 0 |
| ADMN-05 | Admin gerencia usuarios | unit | `bun vitest run packages/api/src/__tests__/admin-users.test.ts` | Wave 0 |
| ADMN-06 | Stats globais com filtros | unit | `bun vitest run packages/api/src/__tests__/admin-stats.test.ts` | Wave 0 |
| ADMN-07 | Admin acessa dashboard com seletor | manual-only | Verificacao visual -- UI com seletor de vendedor | -- |

### Sampling Rate
- **Per task commit:** `bun run test`
- **Per wave merge:** `bun run test && bun run check-types`
- **Phase gate:** Full suite green + type check

### Wave 0 Gaps
- [ ] `packages/api/src/__tests__/admin-leads.test.ts` -- covers ADMN-01, ADMN-02, ADMN-03, ADMN-04
- [ ] `packages/api/src/__tests__/admin-users.test.ts` -- covers ADMN-05
- [ ] `packages/api/src/__tests__/admin-stats.test.ts` -- covers ADMN-06
- [ ] Testes precisam mockar contexto tRPC com `userRole: "admin"` e db

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| middleware.ts para auth guard | proxy.ts (Next.js 16) | Phase 01 | Admin layout usa mesmo pattern de auth guard server-side |
| getUser() para auth | getClaims() (JWT, sem network call) | Phase 01 | Admin verifica role via claims sem round-trip |
| Better-Auth user management | Supabase Auth Admin API | Phase 01 | User ban/unban via `auth.admin.updateUserById` |

## Open Questions

1. **Header condicional para admin link**
   - What we know: Header e um Client Component. Precisa saber o role do usuario para mostrar/ocultar link "Admin".
   - What's unclear: Melhor forma de passar role para Client Component -- prop drilling do Server Component pai ou client-side check.
   - Recommendation: Usar client-side check via `supabase.auth.getUser()` no Header (ja faz isso para UserMenu). Extrair claims do JWT para verificar role. Alternativa: converter Header para receber props do layout.

2. **LeadForm refactoring strategy**
   - What we know: LeadForm atual chama `saveLead()`/`updateLead()` que usam Dexie. Admin precisa server-only.
   - What's unclear: Melhor abordagem -- refatorar LeadForm com callbacks ou criar AdminLeadForm separado.
   - Recommendation: Refatorar LeadForm para aceitar `onSave`/`onUpdate` callbacks opcionais. Se passados, usar eles; senao, fallback para Dexie. Mantem retrocompatibilidade e permite reuso no admin.

3. **Granularidade do date picker para stats**
   - What we know: shadcn Calendar disponivel. Decisao e do Claude.
   - Recommendation: Date range picker simples com Calendar + Popover. Presets rapidos: "Hoje", "Ultimos 7 dias", "Ultimos 30 dias", "Todo periodo".

## Sources

### Primary (HIGH confidence)
- Codebase atual -- todos os arquivos canonicos listados no CONTEXT.md lidos e analisados
- `packages/api/src/index.ts` -- `adminProcedure` ja configurado e funcional
- `packages/db/src/schema/leads.ts` -- schema com indices em user_id, interest_tag, updated_at
- `packages/db/src/schema/auth.ts` -- `user_roles` table com `app_role` enum (admin, vendedor)

### Secondary (MEDIUM confidence)
- [Supabase Auth Admin API](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid) -- `updateUserById` com `ban_duration` para desativacao
- [Supabase Auth Admin listUsers](https://supabase.com/docs/reference/javascript/admin-api) -- Paginacao de usuarios

### Tertiary (LOW confidence)
- Nenhum.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- tudo ja instalado, apenas adicionar env var
- Architecture: HIGH -- patterns existentes (layout + guard + tRPC) replicaveis
- Pitfalls: HIGH -- baseado em analise direta do codigo existente e decisoes do CONTEXT.md

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stack estavel, nenhuma lib em fast-moving)
