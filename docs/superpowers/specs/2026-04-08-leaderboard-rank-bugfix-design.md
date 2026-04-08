# Bugfix: Leaderboard nao renderiza — ROW_NUMBER() retorna string

**Data**: 2026-04-08
**Tipo**: Bugfix + cleanup

## Contexto

Apos o rewrite do dashboard gamificado (commit `6216b6c`, 7 de abril), o componente Podium nao renderiza no dashboard. A `PersonalStatsBar` aparece normalmente, mas o podium com os top 3 e a lista de ranking abaixo ficam vazios.

O problema e causado por um bug de tipo: `ROW_NUMBER()` retorna `bigint` no Postgres, que o node-postgres converte para `string` em JavaScript. O campo `rank` chega como `"1"` (string) em vez de `1` (number), causando falha em comparacoes com strict equality (`===`).

## Root Cause

### Cadeia causal completa

1. **SQL** (`packages/api/src/routers/leaderboard.ts:27`): `ROW_NUMBER() OVER (...)` retorna `bigint`
2. **node-postgres**: converte `bigint` para `string` (comportamento padrao do driver)
3. **Backend** (`leaderboard.ts:44`): `result.rows as Array<{ rank: number }>` e type assertion, nao converte o valor real
4. **Frontend** (`podium.tsx:137`): `top3.find((e) => e.rank === 1)` falha — `"1" === 1` e `false`
5. **Resultado**: `first` e `undefined`, Podium retorna `null` (linha 140)

### Por que PersonalStatsBar funciona

A `PersonalStatsBar` exibe `rank` como texto interpolado (`#{rank}`), sem comparacao numerica. String `"1"` renderiza como `#1` normalmente.

### Por que nao foi detectado antes

O `leaderboard-tab.tsx` antigo usava `i + 1` (index) para rank na UI, nao o valor do servidor. O rewrite passou a usar `r.rank` direto, expondo o bug de tipo.

## Solucao

### Fix 1 — Cast `ROW_NUMBER()` para `int` no SQL

**Arquivo**: `packages/api/src/routers/leaderboard.ts:27`

```sql
-- Antes:
ROW_NUMBER() OVER (...)  AS rank

-- Depois:
ROW_NUMBER() OVER (...)::int AS rank
```

Alinha com o padrao existente na mesma query: `COUNT(*)::int` e `SUM(...)::int`.

### Fix 2 — Sync engine: usar `r.rank` em vez de `i + 1`

**Arquivo**: `apps/web/src/lib/sync/engine.ts:220`

```ts
// Antes:
rank: i + 1,

// Depois:
rank: r.rank,
```

Esse bug ja foi corrigido no `leaderboard-tab.tsx` (commit `6233b79`) mas nunca foi propagado para o sync engine. Com o Fix 1, `r.rank` chegara como `number`.

### Fix 3 — Remover arquivos mortos pos-rewrite

Arquivos nao importados em nenhum lugar apos o rewrite `6216b6c`:

- `apps/web/src/app/(app)/dashboard/leaderboard-tab.tsx`
- `apps/web/src/app/(app)/dashboard/period-filter.tsx`
- `apps/web/src/components/leaderboard-entry.tsx`

## Arquivos impactados

| Arquivo | Mudanca |
|---------|---------|
| `packages/api/src/routers/leaderboard.ts` | Adicionar `::int` ao `ROW_NUMBER()` |
| `apps/web/src/lib/sync/engine.ts` | Trocar `i + 1` por `r.rank` |
| `apps/web/src/app/(app)/dashboard/leaderboard-tab.tsx` | Deletar |
| `apps/web/src/app/(app)/dashboard/period-filter.tsx` | Deletar |
| `apps/web/src/components/leaderboard-entry.tsx` | Deletar |

## Verificacao

1. `bun run check-types` — nenhum import quebrado
2. `bun run dev:web` — Podium renderiza top 3, RankingList mostra rank 4+
3. Verificar que `PersonalStatsBar` mostra posicao correta
4. Testar offline: com server data indisponivel, verificar que cache Dexie renderiza ranking corretamente
5. Verificar que sync engine popula `leaderboardCache` com rank correto (nao index-based)
