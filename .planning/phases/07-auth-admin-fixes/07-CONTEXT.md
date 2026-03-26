---
phase: 7
name: Auth & Admin Fixes
status: context_captured
gray_areas_discussed: 0
---

# Phase 7 Context: Auth & Admin Fixes

## Phase Goal

Fechar os 2 gaps críticos identificados pelo audit v1.0:
1. **AUTH-05**: `proxy.ts` não é carregado pelo Next.js — renomear para `middleware.ts` no lugar certo
2. **ADMN-07**: Admin vê zeros ao selecionar outro vendedor — Dexie só tem dados do próprio usuário

Mais 2 gaps de consistência (não-bloqueadores, mas incluídos por serem no mesmo escopo):
- `isAdmin` usa `app_metadata` em vez de `getClaims()` — inconsistente com admin layout
- `/leads/new` sem auth guard server-side — inconsistente com todas as outras rotas protegidas

## Gray Areas

**Nenhuma.** Esta fase é puramente correção de bugs com caminhos técnicos claros. Todas as decisões foram determinadas por análise do codebase.

## Decisions

### Task 1 — Renomear proxy.ts → middleware.ts (AUTH-05)

**Problema:** `apps/web/proxy.ts` está na raiz do app (não em `src/`) e exporta uma função chamada `proxy`. Next.js ignora completamente esse arquivo. O middleware manifest fica vazio.

**Fix:**
- Criar `apps/web/src/middleware.ts` com `export default async function middleware()` (Next.js requer default export com nome `middleware`)
- `updateSession` em `apps/web/src/lib/supabase/proxy.ts` — manter o arquivo, apenas mudar o import no novo middleware
- Deletar `apps/web/proxy.ts` (raiz)
- O `config.matcher` existente está correto — copiar para o novo arquivo

**Canonical ref do fix:** `apps/web/src/app/admin/layout.tsx` (padrão de `createServerClient` + `supabase.auth.getUser()` já funcional)

### Task 2 — Corrigir isAdmin para usar getClaims() (não-bloqueador)

**Problema:** `apps/web/src/app/dashboard/page.tsx` usa:
```typescript
const userRole =
  (user.app_metadata as Record<string, unknown>)?.user_role ??
  (user.user_metadata as Record<string, unknown>)?.user_role;
const isAdmin = userRole === "admin";
```

**Fix:** Copiar o padrão exato de `apps/web/src/app/admin/layout.tsx`:
```typescript
const { data: claimsData } = await supabase.auth.getClaims();
const userRole = (claimsData?.claims as Record<string, unknown>)?.user_role;
const isAdmin = userRole === "admin";
```

**Canonical ref:** `apps/web/src/app/admin/layout.tsx:17-19` (padrão correto a copiar)

### Task 3 — Auth guard server-side em /leads/new (não-bloqueador)

**Problema:** `apps/web/src/app/leads/new/page.tsx` renderiza o componente sem verificar autenticação:
```typescript
export default function NewLeadPage() {
  return <LeadForm />;
}
```

**Fix:** Adicionar verificação server-side (mesmo padrão de `/leads/page.tsx`):
```typescript
export default async function NewLeadPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect("/login"); }
  return <LeadForm />;
}
```

**Canonical ref:** `apps/web/src/app/leads/page.tsx` (padrão correto a copiar)

### Task 4 — ADMN-07: Admin vendor stats via tRPC

**Problema:** `Dashboard` passa `effectiveUserId = selectedVendor ?? userId` para `PersonalDashboard`, que usa `useLiveQuery(() => getPersonalStats(userId))` — consulta o Dexie local, que só tem os leads do usuário autenticado. Quando admin seleciona outro vendedor, sempre mostra zeros.

**Fix:** Adicionar prop `overrideStats` opcional ao `PersonalDashboard`. Quando fornecida, pular o `useLiveQuery` e usar os dados passados diretamente.

Em `Dashboard`, quando `isAdmin && selectedVendor`:
- Chamar `trpc.admin.stats.getGlobalStats({ userId: selectedVendor })` via `useQuery`
- Mapear o resultado para o formato de stats (`hoje: result.today`)
- Passar como `overrideStats` para `PersonalDashboard`

**Mapeamento de campos:**
- `adminStats.total` → `stats.total`
- `adminStats.today` → `stats.hoje`
- `adminStats.quente` → `stats.quente`
- `adminStats.morno` → `stats.morno`
- `adminStats.frio` → `stats.frio`
- `adminStats.score` → `stats.score`

**tRPC procedure disponível:** `packages/api/src/routers/admin/stats.ts` — `getGlobalStats` aceita `userId?: string` como filtro opcional. Já está em `adminStatsRouter`.

**Canonical refs:**
- `packages/api/src/routers/admin/stats.ts` — procedure `getGlobalStats` (aceita `userId` filter)
- `apps/web/src/app/dashboard/dashboard.tsx` — onde adicionar o `useQuery` condicional
- `apps/web/src/app/dashboard/personal-dashboard.tsx` — onde adicionar `overrideStats` prop
- `apps/web/src/lib/lead/stats.ts` — tipo de retorno de `getPersonalStats` (referência para tipagem do override)

## Canonical Refs

| File | Purpose |
|------|---------|
| `apps/web/proxy.ts` | Arquivo a deletar (middleware mal posicionado) |
| `apps/web/src/lib/supabase/proxy.ts` | Contém `updateSession` — manter, apenas mudar o import |
| `apps/web/src/app/admin/layout.tsx` | Padrão correto de `getClaims()` e auth guard |
| `apps/web/src/app/leads/page.tsx` | Padrão correto de auth guard server-side |
| `apps/web/src/app/leads/new/page.tsx` | Target do fix de auth guard |
| `apps/web/src/app/dashboard/page.tsx` | Target do fix de isAdmin |
| `apps/web/src/app/dashboard/dashboard.tsx` | Target do fix ADMN-07 (adicionar useQuery condicional) |
| `apps/web/src/app/dashboard/personal-dashboard.tsx` | Target do fix ADMN-07 (adicionar overrideStats prop) |
| `packages/api/src/routers/admin/stats.ts` | Procedure `getGlobalStats` já pronta com filtro `userId` |
| `apps/web/src/lib/lead/stats.ts` | Tipo de retorno de `getPersonalStats` (referência para tipagem) |

## Deferred Ideas

- Leaderboard mostra "Vendedor" para todos os não-current users (JOIN a auth.users faltando em `packages/api/src/routers/leaderboard.ts`) — audit classifica como Low severity, não está no escopo do Phase 7
- Configuração do LinkedIn/Facebook OAuth no Supabase Dashboard (tech debt documentado no audit)
