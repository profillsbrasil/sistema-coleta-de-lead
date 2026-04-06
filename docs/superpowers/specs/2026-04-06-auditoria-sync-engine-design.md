# Auditoria: Sync Engine & Arquitetura Backend

**Data**: 2026-04-06
**Status**: Diagnóstico completo — aguardando implementação
**Revisado por**: Codex (2 rounds de review adversarial)

---

## Resumo Executivo

O sistema de coleta de leads offline-first tem uma arquitetura funcional (Dexie → syncQueue → tRPC → Drizzle → PostgreSQL), mas o sync engine — coração do produto — contém **2 bugs P0 determinísticos** e **13 bugs P1** (5 originais reclassificados de P0 + 5 de integridade + 3 novos do Codex) que impedem uso confiável em evento real. O problema reportado ("sync nunca completa") é reproduzível por pelo menos 2 caminhos determinísticos (P0-1 e P0-2), ambos confirmados por leitura direta do código.

Além dos bugs de sync, há código morto (`packages/auth`, `todoRouter`), anti-patterns de segurança (`sql.raw()`, `publicProcedure` sem auth), SQL raw desnecessário em ~36% das queries do backend, e gaps no modelo de dados local (ausência de `photoUrl` no tipo Dexie).

**O que funciona bem**: tRPC está ativo com 6 routers type-safe; Drizzle faz ~64% das queries corretamente; a validação de env com zod (`packages/env`) é sólida; o schema Dexie e os tipos estão corretos; a UI de sync status (`sync-status-icon.tsx`) tem lógica sólida de derivação de estado (mostra "pending" quando `pendingCount > 0`, não "synced").

---

## P0 — Bugs Determinísticos (Reproduzíveis por Leitura Estática)

Estes 2 bugs são caminhos determinísticos para "sync nunca completa" — não dependem de timing, crash, ou condição de rede.

### P0-1: Sync para permanentemente após 5 retries

**Arquivos**: `apps/web/src/lib/sync/engine.ts:209-256`, `apps/web/src/lib/sync/connectivity.ts:21-28`

**Causa raiz**: `syncWithRetry()` tenta até `maxRetries=5` com backoff exponencial. Se todas falham, a função termina e nunca re-agenda. `startSync()` registra listener em `connectivity.subscribe()` que só dispara em TRANSIÇÕES de estado (online↔offline). Se o usuário permanece online, nenhum evento é emitido. Resultado: sync para para sempre até reload da página ou perda+recuperação de rede.

**Evidência**:
```typescript
// engine.ts:246-248 — só dispara em mudança de estado
const unsubscribe = _detector.subscribe((online) => {
  if (online) { syncWithRetry(callbacks); }
});

// connectivity.ts:21-24 — suprime se estado não mudou
function notify(newState: boolean): void {
  if (newState === online) { return; } // ← nunca notifica se já está online
}
```

**Risco**: Em evento com Wi-Fi instável, vendedor perde leads silenciosamente.

**Solução**: Adicionar timer periódico (ex: 60s) em `startSync()` como safety net, independente de eventos de connectivity. NÃO substituir o listener — complementar.

**Complexidade**: S

**Failure mode se mal implementado**: Pode gerar request storm se disparar `syncWithRetry()` a cada tick sem single-flight no nível de `syncWithRetry()`. Precisa de guarda: se já tem sync em andamento ou agendada, ignorar.

---

### P0-2: ACK por localId causa fila presa [Codex]

**Arquivo**: `apps/web/src/lib/sync/engine.ts:69-74`

**Causa raiz**: `pushChanges()` usa `pendingOps.find((p) => p.localId === a.localId)` para mapear ACKs do servidor para itens da syncQueue. Se há múltiplas operações para o mesmo lead (ex: `create` e depois `update`), o `find` retorna sempre o PRIMEIRO item. O segundo ACK encontra o mesmo item (que já foi deletado ou está no array de deleção), e a segunda operação fica presa na fila para sempre.

**Evidência**:
```typescript
// engine.ts:69-74
const ackIds = result.acknowledged
  .map((a) => {
    const queueItem = pendingOps.find((p) => p.localId === a.localId); // ← sempre acha o primeiro
    return queueItem?.id;
  })
  .filter((id): id is number => id != null);
```

**Cenário**: Vendedor cria lead (create na fila) → edita rápido (update na fila) → push envia ambos → servidor ACKa ambos com mesmo localId → `find` retorna o `create` duas vezes → `update` nunca deletado → fila acumula → sync "nunca completa".

**Risco**: **Este é o candidato mais provável para o bug reportado pelo usuário.** A syncQueue cresce monotonicamente, e `pendingCount` na UI nunca chega a zero.

**Solução**: Mudar correlação para usar o `id` auto-incremento da syncQueue (que é único), não `localId`. Alternativa: usar `queueId` (que já é retornado pelo servidor como `clientTimestamp`) para match exato: `find(p => p.localId === a.localId && p.timestamp === a.queueId)`.

**Complexidade**: S

---

## P1 — Bugs de Alta Gravidade (Dependem de Condição de Rede/Timing)

Estes bugs são reais e verificados, mas dependem de condições específicas (timeout de rede, crash de app, expiração de token) para se manifestar. Reclassificados de P0 após review adversarial do Codex.

### P1-1: Requests HTTP sem timeout

**Arquivos**: `apps/web/src/lib/sync/engine.ts:17-29`, `apps/web/src/lib/sync/photo-upload.ts:22-27`

**Causa raiz**: O tRPC client do sync engine faz `fetch()` sem `signal` de `AbortController`. `supabase.storage.upload()` em photo-upload.ts também não usa timeout. Em redes congestionadas de evento, um request pode ficar pendurado por minutos, mantendo `isSyncing=true` e bloqueando todos os próximos ciclos.

**Risco**: UI mostra "sincronizando..." indefinidamente. Não é deterministicamente reproduzível — depende de comportamento de rede/browser.

**Solução**: Criar `AbortController` com timeout configurável (30s para push/pull, 60s para photo). Configurar via `SYNC_CONFIG`.

**Complexidade**: M

**Failure mode se mal implementado**: Se o servidor processou a mutação mas a resposta foi abortada, o cliente pode re-enviar. `create` é idempotente por `localId` (`onConflictDoUpdate`), mas `update`/`delete` não validam linhas afetadas.

**Dependência**: Deve ser implementado ANTES de P0-1 (retry periódico), senão retries batem em request preso.

---

### P1-2: 401 tratado como sucesso (parcial)

**Arquivos**: `apps/web/src/lib/sync/engine.ts:220-224`, `apps/web/src/components/sync-status-icon.tsx:42-43`

**Causa raiz**: Quando `isUnauthorizedError(error)` retorna true em `syncWithRetry()`, a função chama `onSyncEnd({ lastSync, error: null })`. **Correção do Codex**: A UI NÃO mostra "synced" se `pendingCount > 0` — `sync-status-icon.tsx:42` verifica `pendingCount` antes e mostra "pending". Portanto o bug é de **auth/engine** (sync para silenciosamente), mas o impacto visual é atenuado pela lógica do ícone.

**Risco**: Token Supabase expira (~1h). Sync para sem aviso explícito, mas UI mostra "pending" (não "synced") se houver itens na fila. O vendedor pode não entender que precisa re-logar.

**Solução**: (1) Tentar `supabase.auth.refreshSession()` antes de desistir. (2) Se refresh falhou, notificar via callback com flag `authExpired: true`. (3) UI mostra banner explícito pedindo re-login. **Nota do Codex**: o proxy (`proxy.ts:4`) ignora `/api/*` e o context tRPC (`context.ts:13`) não grava cookies — `refreshSession()` sozinho não basta; precisa estado `authExpired` explícito + reauth.

**Complexidade**: M

---

### P1-3: Lead + syncQueue sem transação Dexie

**Arquivos**: `apps/web/src/lib/lead/save-lead.ts:16-50`, `apps/web/src/lib/lead/update-lead.ts:32-49`, `apps/web/src/lib/lead/delete-lead.ts:6-18`

**Causa raiz**: Nenhum dos 3 arquivos usa `db.transaction()`. Cada um faz `db.leads.add/update()` seguido de `db.syncQueue.add()` como operações separadas. Grep por `db.transaction` no app retorna zero resultados.

**Risco**: Crash entre as duas operações = lead órfão que nunca sincroniza. Baixa probabilidade por operação, mas acumulativa.

**Solução**: Envolver em `db.transaction('rw', db.leads, db.syncQueue, async () => { ... })` nos 3 arquivos + `photo-upload.ts`.

**Complexidade**: S

---

### P1-4: Pull sobrescreve blob de foto local [Codex]

**Arquivos**: `apps/web/src/lib/sync/engine.ts:104,153`

**Causa raiz**: `mapServerLeadToLocal()` hardcoda `photo: null` (linha 104). Quando `pullChanges()` faz `db.leads.put(mapped)` (linha 153), sobrescreve o blob pendente de upload. Perda irreversível da foto.

**Solução**: Preservar blob local fazendo merge: `{ ...mapped, photo: localLead?.photo ?? null }`. **Incompleto sem P1-7** (adicionar `photoUrl` ao tipo local).

**Complexidade**: S

---

### P1-5: photoUrl pendente após upload [Codex]

**Arquivos**: `apps/web/src/lib/sync/engine.ts:183-197`, `apps/web/src/lib/sync/photo-upload.ts:39-45`

**Causa raiz**: Upload cria `update` na syncQueue DEPOIS do push. Sem novo ciclo automático (bug P0-1), photoUrl pode nunca chegar ao servidor.

**Solução**: Fazer segundo `pushChanges()` após `uploadPendingPhotos()`, somente se ao menos 1 upload teve sucesso.

**Complexidade**: S

---

### P1-6: Conflito server-wins naive

**Arquivo**: `apps/web/src/lib/sync/engine.ts:140-146`

O pull sobrescreve dados locais SEMPRE que `syncStatus !== "pending"`. Se vendedor edita lead que já estava "synced" enquanto offline, o `syncStatus` muda para "pending" via `update-lead.ts`, mas se o servidor atualizou o mesmo lead (via admin) ANTES do push do vendedor, o pull sobrescreve. Sem notificação para nenhuma das partes.

**Solução curto prazo**: Quando pull detectar conflito (local pending + server newer), logar em tabela `conflictLog` no Dexie e notificar usuario via toast. **Longo prazo**: Merge field-level.

**Complexidade**: L | **Dependência**: P1-3

---

### P1-7: Tipo local não tem `photoUrl` [Codex — bug novo]

**Arquivos**: `apps/web/src/lib/db/types.ts:11-12`, `packages/db/src/schema/leads.ts:31`

**Causa raiz**: O backend tem `photoUrl: text("photo_url")` na tabela `leads`, mas o tipo Dexie local (`Lead` em `types.ts`) só tem `photo: Blob | null` — **não tem `photoUrl`**. Depois que `uploadPendingPhotos()` faz upload e limpa o blob (`photo: null`), a UI local não tem como exibir a foto remota. O `pullChanges()` traz `photoUrl` do servidor mas `mapServerLeadToLocal()` a descarta.

**Risco**: Após upload, lead fica sem foto visível na UI local até próximo reload.

**Solução**: Adicionar `photoUrl: string | null` ao tipo `Lead` no Dexie. Atualizar `mapServerLeadToLocal()` para incluir `photoUrl`. Atualizar schema Dexie (v6). Componentes de UI devem exibir `photoUrl` quando `photo === null`.

**Complexidade**: M

---

### P1-8: Remoção de foto não limpa `photoUrl` no servidor [Codex — bug novo]

**Arquivos**: `apps/web/src/lib/lead/update-lead.ts:37-46`

**Causa raiz**: Quando o vendedor remove a foto no formulário (`photo = null`), `updateLead()` persiste `photo: null` localmente, mas o payload enfileirado na syncQueue não inclui `photoUrl: null`. O servidor continua com a `photoUrl` antiga apontando para uma foto removida pelo usuário.

**Solução**: Quando `photo` for explicitamente `null` (remoção, não ausência), incluir `photoUrl: null` no payload do syncQueue.

**Complexidade**: S

---

### P1-9: Backend processa batch sem transação [Codex — bug novo]

**Arquivo**: `packages/api/src/routers/sync.ts:55-127`

**Causa raiz**: O loop `for (const op of input.operations)` processa cada operação sequencialmente sem transação SQL. Se uma operação no meio falha (ex: payload inválido), as anteriores já foram aplicadas mas o backend lança erro — nenhum ACK é retornado. O cliente faz retry e re-envia TODAS as operações, re-executando as que já foram aplicadas. `create` é idempotente por `onConflictDoUpdate`, mas `update` e `delete` não são.

**Risco**: Dados inconsistentes após retry de batch parcialmente aplicado.

**Solução curto prazo**: Retornar ACK parcial (operações processadas com sucesso antes do erro). **Longo prazo**: Envolver batch em transação SQL.

**Complexidade**: M

---

### P1-10: Photo upload sem retry inteligente

**Arquivo**: `apps/web/src/lib/sync/photo-upload.ts:17-48`

Loop `for (const lead of candidates)` tenta upload 1x por ciclo. Se policy do bucket Supabase estiver errada → loop infinito sem progresso. Sem contagem de retries, backoff, nem limite. Depois de P1-4 corrigido, o blob será preservado indefinidamente, acumulando tentativas inúteis.

**Solução**: Adicionar campo de retry separado (sync meta, não no domínio Lead — sugestão Codex). Após N falhas (ex: 10), marcar como `uploadFailed` e notificar usuário.

**Complexidade**: S | **Dependência**: P1-4

---

### P1-11: Monitoramento de espaço IndexedDB

**Arquivo**: `apps/web/src/lib/db/types.ts:12`

Fotos de câmera (3-5MB cada) acumulam como Blob no IndexedDB sem limite. Grep por `navigator.storage` retorna zero. Quota do IndexedDB é ~50% do disco (menos em iOS Safari).

**Solução**: Chamar `navigator.storage.estimate()` antes de salvar foto. Se uso > 80%, comprimir (canvas resize para ~800px, quality 0.7). Alertar se > 90%.

**Complexidade**: M

---

### P1-12: UI de sync status incompleta

**Arquivo**: `apps/web/src/components/sync-status-provider.tsx`

**Nota**: A lógica de `sync-status-icon.tsx` é sólida (mostra "pending" quando `pendingCount > 0`). O problema é que o engine emite sinais ambíguos: "syncing" eternamente após timeout (P1-1), e não distingue entre "sync completou com sucesso" e "sync parou de tentar" (P0-1).

**Solução**: Novos states: `idle`, `syncing`, `error`, `authExpired`, `retrying(n/5)`, `stalled`. Banner persistente quando sync falhou. Botão "tentar novamente" manual.

**Complexidade**: M | **Dependência**: P0-1, P1-2

---

### P1-13: lastSyncTimestamp em localStorage

**Arquivo**: `apps/web/src/lib/sync/engine.ts:122-123,156`

Limpar cache do browser reseta para `"1970-01-01T00:00:00Z"`. Próximo pull busca TODOS os leads desde 1970.

**Solução**: Mover para tabela `syncMeta` no Dexie (persiste independente de "limpar dados de navegação"). Adicionar paginação no `pullChanges` do servidor como proteção extra.

**Complexidade**: M

---

## P2 — Código Morto & AI Slop

### P2-1: `todoRouter` + schema `todo` — scaffold residual (SEGURANÇA)

`packages/api/src/routers/todo.ts` registrado no appRouter mas sem uso no frontend. Usa `publicProcedure` — **qualquer pessoa pode fazer CRUD na tabela todo sem autenticação**. Surface de ataque exposta.

**Ação**: Remover do appRouter, deletar `todo.ts`, deletar `schema/todo.ts`, limpar export em `schema/index.ts`.

**Complexidade**: S | **Subiu de prioridade por recomendação do Codex — publicProcedure é surface de ataque**

### P2-2: `packages/auth` — package morto

Zero importações em todo o monorepo. Duplica funcionalidade de `@supabase/ssr`. **Nota do Codex**: Ainda está listado como dependência em `apps/web/package.json:14` — remover de lá também, não é "zero risco" sem isso.

**Ação**: Remover de `apps/web/package.json`, deletar pasta `packages/auth`, limpar turbo config se necessário.

**Complexidade**: S

### P2-3: tRPC client duplicado

`engine.ts:17-29` cria cliente separado de `utils/trpc.ts`. Dificulta adicionar interceptors globais (ex: refresh de token, logging). **Avaliar** após P1-2 se unificar faz sentido.

**Complexidade**: M

### P2-4: `emptyToNull` duplicada

Definida identicamente em `save-lead.ts:4-6` e `update-lead.ts:4-6`. **Ação**: Extrair para `apps/web/src/lib/lead/helpers.ts`.

**Complexidade**: S

### P2-5: `sql.raw()` anti-pattern

`packages/api/src/routers/admin/users.ts` interpola UUIDs manualmente: `sql.raw(\`ARRAY['\${userIds.join("','")}']\`)`. IDs vêm de Supabase Auth (seguros), mas o pattern é perigoso.

**Ação**: Substituir por `inArray(userRoles.userId, userIds)` do Drizzle.

**Complexidade**: S

### P2-6: SQL raw desnecessário

5 queries usando `db.execute(sql\`...\`)` que poderiam ser Drizzle builder:
- `admin/stats.ts` — `getDistinctSegments` (trivial: `SELECT DISTINCT segment`)
- `admin/stats.ts` — `getTimeline` (groupBy por data)
- `admin/stats.ts` — `getRanking` (JOIN + agregação)
- `admin/leads.ts` — `listVendors` (JOIN + coalesce)
- `leaderboard.ts` — `getRanking` (CTE + window function — **aceitar SQL raw aqui**, é justificado)

**Complexidade**: M

### P2-7: Backend ACKa sem validar efeito

`packages/api/src/routers/sync.ts` — `update` e `delete` fazem `db.update(...).where(...)` mas não verificam se alguma linha foi afetada. Se o `localId` ou `userId` não existir, o backend retorna ACK mesmo assim. O cliente deleta da syncQueue achando que o servidor processou.

**Ação**: Verificar `.returning()` ou rowcount após update/delete. Se 0 linhas afetadas, não ACKar.

**Complexidade**: S

---

## P3 — Nice-to-have

### P3-1: Relations Drizzle + FK constraints

`leads.userId` e `userRoles.userId` são `uuid NOT NULL` sem `.references()`. Sem `relations()` do Drizzle. Impede `query.leads.findMany({ with: { user: true } })` e deixa banco sem integridade referencial.

**Complexidade**: M

### P3-2: Paginação no pullChanges

`pullChanges` retorna todos os leads do usuário de uma vez. Com 1000+ leads, pode causar timeout ou consumo excessivo de banda em 3G de evento.

**Complexidade**: M | **Dependência**: P1-13

### P3-3: Testes para cenários de falha

`engine.test.ts` não testa: retries esgotados sem re-agendamento, timeout de request, 401 silencioso, ACK duplicado por localId, pull que sobrescreve foto.

**Complexidade**: M | **Dependência**: P0-1, P0-2, P1-1, P1-2, P1-4

### P3-4: Observabilidade do sync

Nenhum logging estruturado no sync engine. Debug em produção é impossível. Adicionar logger com níveis, persistir últimos N eventos de sync no Dexie para diagnóstico in-app.

**Complexidade**: M

---

## Ordem de Execução

### Sprint 1 — "Sync que funciona" (5-7 dias)

Objetivo: eliminar os bugs determinísticos + os P1 mais graves do sync.

| Ordem | Item | Justificativa |
|-------|------|---------------|
| 1 | P1-1 (Timeout) | **Primeiro** — sem isso, retry periódico pode bater em request preso |
| 2 | P0-2 (ACK por localId) | Fix mais provável para o bug reportado pelo usuário |
| 3 | P0-1 (Retry periódico) | Safety net para recuperar de qualquer falha transiente. Usar `setTimeout` rearmado, não `setInterval` (sugestão Codex) |
| 4 | P1-3 (Transações Dexie) | Prevenir leads órfãos — mudança isolada em 3+1 arquivos |
| 5 | P1-7 (photoUrl no tipo local) | **Prerequisito** para P1-4 e P1-5 — sem isso, fix de foto é incompleto |
| 6 | P1-4 (Pull preservar foto) | Prevenir perda de foto — merge seletivo ao invés de put completo |
| 7 | P1-5 (Segundo push após foto) | Garantir photoUrl chega ao servidor. Só rodar se ao menos 1 upload teve sucesso (sugestão Codex) |
| 8 | P1-2 (Sessão expirada) | Requer integrar com Supabase auth refresh + estado `authExpired` explícito |

### Sprint 2 — "Confiança no campo" (4-5 dias)

Objetivo: UI confiável, fotos seguras, dados resilientes.

| Item | Dependência |
|------|-------------|
| P1-8 (Remoção de foto) | P1-7 |
| P1-9 (Backend batch parcial) | Nenhuma |
| P1-10 (Retry foto inteligente) | P1-4 |
| P1-12 (UI de status) | P0-1, P1-2 |
| P1-13 (syncMeta no Dexie) | Nenhuma |
| P1-11 (Espaço IndexedDB) | Nenhuma |

P1-6 (Conflitos server-wins) fica no backlog — L-size, precisa de feedback de evento real.

### Sprint 3 — "Limpar a casa" (2-3 dias)

Objetivo: remover slop, corrigir segurança, melhorar manutenibilidade.

| Ordem | Item | Justificativa |
|-------|------|---------------|
| 1 | P2-1 (todoRouter) | **Segurança**: publicProcedure sem auth — surface de ataque exposta |
| 2 | P2-2 (packages/auth) | Remover de package.json + deletar pasta |
| 3 | P2-5 (sql.raw) | Segurança |
| 4 | P2-7 (ACK sem validação) | Integridade — definir semântica de idempotência primeiro |
| 5 | P2-4 (emptyToNull) | Trivial |
| 6 | P2-3 (tRPC client) | Avaliar após P1-2 |
| 7 | P2-6 (SQL raw → Drizzle) | Melhoria contínua (exceto leaderboard CTE — manter SQL raw) |

---

## Grafo de Dependências

```
P1-1 (timeout) ──────────────┐
P0-2 (ACK localId) ──────────┤
                              ├──→ P0-1 (retry periódico) ──→ P1-12 (UI status)
P1-2 (sessão expirada) ──────┘                                    ↑
                                                                   │
P1-3 (transações Dexie) ──→ P1-6 (conflitos)                     │
                                                                   │
P1-7 (photoUrl tipo) ──→ P1-4 (pull preservar foto) ──→ P1-10 (retry foto)
                     └──→ P1-8 (remoção de foto)                  │
                                                                   │
P1-5 (segundo push foto) ──→ depende de P0-1 (retry) para não ficar pendente

P1-13 (syncMeta Dexie) ──→ P3-2 (paginação pull)

P0-1 + P0-2 + P1-1 + P1-2 + P1-4 ──→ P3-3 (testes de falha)
```

---

## Verificação Pós-Fix

| Sprint | Critério de sucesso |
|--------|---------------------|
| Sprint 1 | Sync completa 100% das vezes em teste de 8h com network throttling (3G/offline toggle). `pendingCount` chega a zero. Fotos não se perdem no pull. |
| Sprint 2 | Zero perda de fotos em teste com 50 leads com foto. UI mostra estado real do sync. Remoção de foto propaga ao servidor. |
| Sprint 3 | `grep -r "packages/auth" .` = 0 matches. `grep "publicProcedure" routers/` = apenas os procedures que devem ser públicos. Zero `sql.raw()` com interpolação. |

---

## Riscos Não Cobertos

- **Concorrência multi-tab**: `isSyncing` é per-module, não per-IndexedDB. Duas tabs podem rodar `syncCycle()` simultaneamente. Baixo risco no uso mobile-first.
- **Supabase Storage policies**: Não verificado se bucket `lead-photos` existe com RLS corretas. Se não → fotos nunca sobem.
- **Rate limiting**: Sem rate limit no endpoint de sync. Bug de loop no client pode gerar centenas de requests/minuto.
- **Clock skew** [Codex]: `updatedAt` local usa hora do dispositivo (`new Date().toISOString()` em `save-lead.ts:14`), servidor usa `new Date()` em `sync.ts:79`. Diferença entre relógios pode quebrar lógica de conflito em `engine.ts:142`. Mitigação: usar apenas timestamp do servidor para comparações.
- **Push sem limite de batch** [Codex]: O client envia a fila inteira em `engine.ts:52` e o backend aceita array sem cap em `sync.ts:16`. Push com centenas de operações pode causar timeout.
- **updateLead/deleteLead enfileiram sem verificar existência** [Codex]: `db.leads.update()` retorna sem erro se o lead não existe em `update-lead.ts:32` e `delete-lead.ts:6`, mas o syncQueue é adicionado de qualquer forma. Produz operação fantasma.
