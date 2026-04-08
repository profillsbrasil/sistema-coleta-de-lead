# Design: Atualizacao otimista do ranking do leaderboard

**Data**: 2026-04-08
**Tipo**: Feature (bugfix de UX)
**Revisao**: v2 — redesign apos review adversarial do Codex

## Contexto

Quando um vendedor cria um lead e volta ao dashboard, o ranking nao reflete o novo lead. Quatro gaps encadeados:

1. `saveLead()` salva apenas no Dexie local, sem disparar sync
2. O dashboard faz `useQuery` imediato, mas o lead ainda nao esta no servidor
3. O sync so roda a cada 60 segundos
4. Mesmo apos o sync, nada invalida o cache do TanStack Query

Alem disso, o dashboard atual tem **dois owners concorrentes** para o estado do leaderboard: `serverData` (React Query) e `cachedEntries` (Dexie via sync engine). Isso cria race conditions e fetch duplicado.

## Principio de design

**Dexie como unico owner local do ranking.** Isso e coerente com a arquitetura offline-first do app (leads, syncQueue, syncMeta — tudo e Dexie-first). O sync engine e o unico responsavel por buscar ranking do servidor e escrever no Dexie.

## Solucao

### Mudanca 1 — Dashboard usa apenas Dexie para ranking

**Arquivo**: `apps/web/src/app/(app)/dashboard/dashboard.tsx`

- Remover `useQuery(trpc.leaderboard.getRanking.queryOptions())` e o import de `useQuery` / `trpc`
- Remover o `useEffect` que espelha `serverData` no Dexie (linhas 45-65)
- Remover o `useEffect` que le `lastSyncAt` do cache (linhas 67-71)
- Remover o state `lastSyncAt` (linha 29)
- `displayEntries` passa a ser diretamente `cachedEntries ?? []`
- Loading state: `cachedEntries === undefined` (Dexie ainda carregando) → skeleton
- Empty state: `cachedEntries.length === 0` → mensagem "Conecte-se..."

O `useLiveQuery` existente em `db.leaderboardCache` ja e reativo — qualquer escrita no Dexie (otimista ou do sync engine) dispara re-render automaticamente.

### Mudanca 2 — Optimistic update em `saveLead()`

**Arquivo**: `apps/web/src/lib/lead/save-lead.ts`

Apos a transacao Dexie existente (leads + syncQueue), `saveLead()` faz:

1. Le `db.leaderboardCache.toArray()`
2. Encontra a entry do `userId` atual
3. Se encontrada: incrementa `totalLeads` +1, `score` + scoreMap[interestTag], atualiza `lastSyncAt`
4. Se nao encontrada: cria nova entry com `totalLeads: 1`, score baseado no interestTag, `name` do lead como fallback
5. Reordena por `score DESC, totalLeads DESC`
6. Recomputa `rank` (index + 1) para todas as entries
7. Escreve de volta com `db.leaderboardCache.clear()` + `db.leaderboardCache.bulkPut()`
8. Dispara `window.dispatchEvent(new Event("lead-saved"))`

Score map: `{ quente: 3, morno: 2, frio: 1 }` — identico ao `CASE` SQL do backend.

**`saveLead()` continua puro em termos de camada de dados** — nao importa `queryClient`, nao depende de React Query, nao tem side effects de UI. Apenas Dexie + DOM event.

Se o cache estiver vazio (nunca sincronizou), o optimistic update e ignorado graciosamente.

### Mudanca 3 — `pendingResync` flag no sync engine

**Arquivo**: `apps/web/src/lib/sync/engine.ts`

Problema: `retry()` verifica `!isSyncing` e descarta silenciosamente se um sync esta em andamento. Com saves rapidos em evento, isso e provavel.

Solucao: adicionar flag `pendingResync`:

```
let pendingResync = false;

// No retry():
function retry() {
    if (!_detector.isOnline) return;
    if (isSyncing) {
        pendingResync = true;  // Marcar para ciclo extra
        return;
    }
    syncWithRetry(callbacks);
}

// No syncCycle(), no finally:
finally {
    isSyncing = false;
    if (pendingResync) {
        pendingResync = false;
        // Agendar ciclo extra imediato
        setTimeout(() => retry(), 0);
    }
}
```

Isso garante que leads salvos durante sync ativo sejam sincronizados logo apos o ciclo atual terminar.

### Mudanca 4 — SyncStatusProvider escuta "lead-saved"

**Arquivo**: `apps/web/src/components/sync-status-provider.tsx`

Dentro do `useEffect` de init, apos `startSync()`:

```ts
const handleLeadSaved = () => syncControl?.retry();
window.addEventListener("lead-saved", handleLeadSaved);

// No cleanup:
window.removeEventListener("lead-saved", handleLeadSaved);
```

O `retry()` agora e seguro contra sync em voo (gracas ao `pendingResync` da Mudanca 3).

## Fluxo completo

```
t=0s  Vendedor salva lead
        -> Dexie: leads.add() + syncQueue.add()          [existente]
        -> Dexie: leaderboardCache update otimista        [NOVO]
        -> window.dispatchEvent("lead-saved")             [NOVO]
        -> useLiveQuery reage -> Dashboard re-renderiza   [INSTANTANEO]

t=0s  SyncStatusProvider escuta "lead-saved"
        -> retry()
           -> Se sync idle: syncWithRetry() inicia       [NOVO]
           -> Se sync ativo: pendingResync = true         [NOVO]

t=1-3s  Sync cycle completa:
        -> pushChanges() envia lead ao servidor
        -> fetchLeaderboard() sobrescreve Dexie cache     [existente]
        -> useLiveQuery reage -> Dashboard atualiza       [automatico]
        -> Se pendingResync: ciclo extra roda             [NOVO]
```

## Arquivos impactados

| Arquivo | Mudanca |
|---------|---------|
| `apps/web/src/app/(app)/dashboard/dashboard.tsx` | Remover useQuery + useEffects, usar apenas useLiveQuery do Dexie |
| `apps/web/src/lib/lead/save-lead.ts` | Adicionar optimistic update em leaderboardCache + dispatch event |
| `apps/web/src/lib/sync/engine.ts` | Adicionar flag pendingResync no startSync/retry |
| `apps/web/src/components/sync-status-provider.tsx` | Adicionar listener "lead-saved" |

## Edge cases

| Cenario | Comportamento |
|---------|---------------|
| Offline | Optimistic update funciona (Dexie local). Sync nao roda. Quando voltar online, sync sobrescreve. |
| Cache Dexie vazio | Optimistic update ignorado. Dashboard mostra "Conecte-se..." ate primeiro sync popular o cache. |
| Vendedor nao esta no cache | `saveLead()` cria nova entry no cache com dados do lead. |
| Dois leads salvos rapidamente | Cada `saveLead()` incrementa o cache cumulativamente. |
| Sync ativo durante save | `pendingResync = true`. Ciclo extra roda apos o atual terminar. |
| Sync falha | Cache Dexie mantem dados otimistas ate proximo sync bem-sucedido. |
| Ranking de outros vendedores muda no servidor | Atualizado a cada 60s pelo sync engine periodic. |

## O que NAO faz parte deste escopo

- Optimistic update para edicao ou delecao de leads
- Mudanca no intervalo de sync periodico (60s)
- `invalidateQueries` no onSyncEnd (nao necessario — React Query removido do leaderboard)

## Verificacao

1. Logar como vendedor, criar lead, voltar ao dashboard → ranking atualizado instantaneamente
2. Verificar que apos 2-3s o ranking e reconciliado com dados do servidor
3. Testar offline: criar lead, ranking atualiza localmente
4. Testar vendedor com 0 leads: criar primeiro lead, deve aparecer no ranking
5. Testar save rapido durante sync ativo: `pendingResync` deve garantir ciclo extra
6. `bun run check-types` sem erros
