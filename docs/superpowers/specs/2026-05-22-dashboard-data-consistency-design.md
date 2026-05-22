# Consistência de dados do `/dashboard`

- **Data:** 2026-05-22
- **Status:** Aprovado — pronto para `writing-plans`

## Contexto

O `/dashboard` do vendedor combina duas fontes de dados distintas, e a divergência
entre elas não é comunicada ao usuário:

- **"Seus números"** (`PersonalDashboard`) — lê o IndexedDB local (Dexie) via
  `getPersonalStats(userId)`. Conta apenas leads do próprio vendedor.
- **"Ranking"** (Podium + lista + `YourPosition`) — lê `leaderboardCache` (Dexie),
  preenchido pelo servidor (`leaderboard.getRanking`) ao fim de cada ciclo de sync.

Três defeitos foram confirmados durante a investigação:

1. **Falha silenciosa do ranking.** `fetchLeaderboard` em `engine.ts` tem `catch {}`
   que descarta toda falha. Se a query do ranking falhar, a UI mostra cache velho
   ou vazio sem nenhum aviso.
2. **Frescor invisível.** O ranking só atualiza ao fim de um ciclo de sync completo.
   Com sync travado, o cache fica obsoleto silenciosamente. O `leaderboardCache` já
   guarda `lastSyncAt` por entrada, mas a UI nunca usa esse dado.
3. **Divergência de contagem.** O `delete` no push (`routers/sync.ts`) faz
   `.set({ deletedAt })` mas **não atualiza `updatedAt`**; e o `pullChanges` filtra
   `isNull(deletedAt)`. Resultado: uma deleção remota nunca retorna no pull, o lead
   nunca é removido do Dexie local, e `getPersonalStats` conta um lead que já não
   existe — inflando a contagem local em relação ao ranking do servidor.

> Nota: o relato original ("vendedor com 8 leads não aparece") foi diagnosticado
> como ordenação por **score** (`quente×3 + morno×2 + frio×1`), não por contagem
> de leads — comportamento correto, fora do escopo desta spec.

## Objetivo

Tornar a desatualização e a divergência de dados do dashboard **visíveis e
corretas**: comunicar falha/frescor do ranking e corrigir a causa raiz da
inflação de contagem local.

Fora de escopo: mudar a regra de score do ranking; tornar o app uma PWA completa;
redesenhar a UI do dashboard.

## Decisões de design

- Item 3 — **causa raiz + aviso**: propagar deleções remotas no pull (tombstones)
  *e* exibir aviso quando o local divergir do servidor.
- Avisos na UI — **texto discreto inline**, consistente com o tom atual do
  dashboard (sem banner nem toast).

## Parte A — Falha e frescor do ranking (itens 1 + 2)

| Mudança | Arquivo |
|---|---|
| `fetchLeaderboard()` retorna `boolean` (sucesso/falha). O `catch` retorna `false` — continua **não lançando**, preservando o invariante "falha de ranking não quebra o sync de leads". | `apps/web/src/lib/sync/engine.ts` |
| `syncCycle()` retorna `{ authExpired, leaderboardFailed }`. `leaderboardFailed` é propagado por `syncWithRetry` até `onSyncEnd`. | `apps/web/src/lib/sync/engine.ts` |
| `SyncEngineCallbacks.onSyncEnd` recebe `leaderboardFailed?: boolean`. | `apps/web/src/lib/sync/engine.ts` |
| `SyncStatus` e o estado interno ganham `leaderboardFailed: boolean`. | `apps/web/src/components/sync-status-provider.tsx` |
| Texto inline na seção Ranking: estado normal → "atualizado há X" (derivado do `lastSyncAt` mais recente do `leaderboardCache`); estado de falha → "pode estar desatualizado · tentar de novo" (o link aciona `manualRetry`). | `apps/web/src/app/(app)/dashboard/dashboard.tsx` + novo `ranking-freshness.tsx` |

O texto de frescor cobre o caso em que o ciclo nunca completa (`lastSyncAt` antigo);
`leaderboardFailed` cobre o caso em que o ciclo completa mas o fetch do ranking
falha especificamente. Ambos resolvem para o mesmo texto inline.

## Parte B — Divergência de contagem (item 3)

| Mudança | Arquivo |
|---|---|
| O `delete` no `pushChanges` passa a setar `deletedAt` **e** `updatedAt`, para que a deleção seja capturável por `updatedAt > since`. | `packages/api/src/routers/sync.ts` |
| `pullChanges` remove o filtro `isNull(leads.deletedAt)` — passa a retornar também tombstones (leads deletados com `updatedAt > since`). | `packages/api/src/routers/sync.ts` |
| `pullChanges` do cliente: ao receber um lead com `deletedAt != null`, executa `db.leads.delete(localId)` em vez de `put` (server-wins, conforme regra do projeto). | `apps/web/src/lib/sync/engine.ts` |
| Cross-check de divergência: comparar `getPersonalStats().total` (local) com o `totalLeads` do próprio usuário no `leaderboardCache` (servidor). A divergência só é sinalizada em **estado estável** (`pendingCount === 0 && !isSyncing`) — caso contrário a diferença é esperada. Texto inline: "seus números podem estar incompletos". | `apps/web/src/app/(app)/dashboard/dashboard.tsx` / `personal-dashboard.tsx` |

### Interação com o pull existente

O `pullChanges` do cliente já trata conflito ("skip if local is newer and pending").
A deleção recebida do servidor é aplicada como server-wins: se houver update local
pendente para o mesmo lead, o servidor vence e o lead é removido localmente — coerente
com a regra "server-wins para dados do servidor durante o pull".

## Plano de testes (TDD, Vitest)

- `routers/sync.ts` — lead deletado após `since` é retornado pelo `pullChanges` com
  `deletedAt` preenchido; `delete` no push grava `updatedAt`.
- `engine.ts` — pull que recebe lead com `deletedAt` chama `db.leads.delete`;
  `fetchLeaderboard` com falha faz `syncCycle` retornar `leaderboardFailed: true`
  sem lançar.
- `sync-status-provider` — `onSyncEnd({ leaderboardFailed: true })` reflete no
  contexto.
- Helpers puros — formatação de tempo relativo ("há X min"); cross-check de
  divergência (local vs cache, considerando estado estável).

## Arquivos afetados

- `packages/api/src/routers/sync.ts`
- `apps/web/src/lib/sync/engine.ts`
- `apps/web/src/components/sync-status-provider.tsx`
- `apps/web/src/app/(app)/dashboard/dashboard.tsx`
- `apps/web/src/app/(app)/dashboard/personal-dashboard.tsx`
- `apps/web/src/app/(app)/dashboard/ranking-freshness.tsx` (novo)
- Helper(s) de tempo relativo / cross-check (novo)
- Testes correspondentes

## Verificação

- `bun run test` — suíte verde, incluindo os novos testes.
- `bun run check-types` e `bun run check` — sem regressões.
- Manual: simular falha do ranking (offline durante o fetch) → texto inline de
  desatualização aparece; deletar um lead em um device e sincronizar outro →
  contagem local reconcilia.
