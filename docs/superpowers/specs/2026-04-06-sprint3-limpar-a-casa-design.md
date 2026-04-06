# Sprint 3 — "Limpar a Casa": Design Spec

**Data:** 2026-04-06  
**Status:** Aprovado (pós Codex review adversarial)  
**Branch:** `sprint-3-cleanup`  
**PR alvo:** `main`

---

## Contexto

As Sprints 1 e 2 entregaram um sync engine resiliente — retry, ACK parcial, fail-fast, foto upload, UI de status completo. 205 testes passando. A auditoria do sync engine (`docs/superpowers/specs/2026-04-06-auditoria-sync-engine-design.md`) catalogou problemas remanescentes em P2 (segurança, código morto, integridade) e P3 (nice-to-have).

A Sprint 3 foca em todos os P2 + P3-3 (testes de falha) como stretch goal. O objetivo é "limpar a casa" antes de iniciar novas features.

---

## Escopo da Sprint

| Item | Tipo | Descrição |
|------|------|-----------|
| **P2-5** | fix(security) | Substituir `sql.raw()` com interpolação manual por `inArray()`/`isNull()` |
| **P2-1** | chore | Remover `todoRouter` (publicProcedure sem auth) — Fase 1, sem DROP TABLE |
| **P2-2** | chore | Remover `packages/auth` morto (zero imports runtime) |
| **P2-4** | refactor | Extrair `emptyToNull()` duplicada para módulo compartilhado |
| **P2-6** | refactor | Converter queries SQL raw builder-safe para Drizzle |
| **P2-7** | fix(sync) | Tombstone contract: `deletedAt IS NULL` no sync UPDATE + transações em admin routes |
| **P3-3** | test | 6 cenários de falha no sync engine, incluindo rowcount/tombstone (stretch) |

---

## Ordem de Execução e Justificativa

```
P2-5 → P2-1 → P2-2 → P2-4 → P2-6 → P2-7 → P3-3
```

1. **P2-5 primeiro** — SQL injection em produção, urgência máxima, mudança cirúrgica (2 linhas)
2. **P2-1** — publicProcedure sem auth, segundo em urgência de segurança
3. **P2-2** — código morto que pode confundir, baixo risco
4. **P2-4** — trivial, estabelece convenção de helpers
5. **P2-6** — narrowed scope, mesmos arquivos que P2-5, depois de limpeza
6. **P2-7** — o mais complexo, precisa dos arquivos limpos de sql.raw; tombstone contract exige cuidado
7. **P3-3** — stretch, valida P2-7 com testes de rowcount/tombstone

Um commit por item, branch única `sprint-3-cleanup`.

---

## Detalhamento Técnico

### P2-5: sql.raw() → inArray() + isNull()

**Arquivo:** `packages/api/src/routers/admin/users.ts`

**Problema:** Duas ocorrências de `sql.raw(ARRAY['${userIds.join("','")}']::uuid[])` interpolam `userIds` diretamente em SQL sem parametrização. Mesmo que os IDs venham de `supabaseAdmin.auth.admin.listUsers()`, o padrão é intrinsecamente inseguro e viola as garantias do Drizzle ORM.

**Mudança linha 41:**
```typescript
// antes
sql`${userRoles.userId} = ANY(${sql.raw(`ARRAY['${userIds.join("','")}']::uuid[]`)})`

// depois
inArray(userRoles.userId, userIds)
```

**Mudança linha 53:**
```typescript
// antes
and(
    sql`${leads.userId} = ANY(${sql.raw(`ARRAY['${userIds.join("','")}']::uuid[]`)})`,
    sql`${leads.deletedAt} IS NULL`
)

// depois
and(inArray(leads.userId, userIds), isNull(leads.deletedAt))
```

**Semântica:** `IN (...)` e `= ANY(ARRAY[...])` são equivalentes no PostgreSQL. Sem mudança de comportamento.

**Imports a adicionar:** `inArray, isNull` de `drizzle-orm`.

**Impacto em testes:** `admin-users.test.ts` mocka `drizzle-orm` — adicionar `inArray` e `isNull` ao mock.

---

### P2-1: Remover todoRouter (Fase 1)

**Problema:** `todoRouter` expõe 4 procedures (getAll, create, toggle, delete) usando `publicProcedure` — sem qualquer middleware de autenticação. Qualquer pessoa com acesso à URL pode CRUD todos os todos.

**Nesta sprint:**

- **Deletar:** `packages/api/src/routers/todo.ts`
- **Editar:** `packages/api/src/routers/index.ts` — remover import e entry `todo: todoRouter`

**Não fazer nesta sprint (decisão pós Codex review):**
- NÃO deletar `packages/db/src/schema/todo.ts`
- NÃO gerar migration DROP TABLE

**Justificativa:** O risco urgente é a rota pública, não a tabela vazia. Acoplar remoção de router com DROP TABLE cria risco de deploy (migration aplicada antes do código novo estar servindo). DROP TABLE será feito numa fase posterior após confirmar zero uso em deploys ativos.

---

### P2-2: Remover packages/auth morto

**Problema:** `packages/auth` é um wrapper fino de `@supabase/ssr` que não é importado por nenhum código runtime. `apps/web/package.json` declara a dependência `"@dashboard-leads-profills/auth": "workspace:*"` mas zero arquivos `.ts/.tsx` em `apps/web/src/` a importam.

**Mudanças:**
- **Deletar:** diretório `packages/auth/` inteiro (6 arquivos: package.json, tsconfig.json, .gitignore, src/index.ts, src/client.ts, src/server.ts)
- **Editar:** `apps/web/package.json` — remover linha `"@dashboard-leads-profills/auth": "workspace:*"`
- **Pós:** `bun install` para atualizar lockfile

**Verificação prévia:** `turbo.json` e `vitest.workspace.ts` não referenciam `packages/auth` — confirmado.

---

### P2-4: Extrair emptyToNull duplicada

**Problema:** Função idêntica definida localmente em dois arquivos:
- `apps/web/src/lib/lead/save-lead.ts:5-7`
- `apps/web/src/lib/lead/update-lead.ts:5-7`

**Mudanças:**
- **Criar:** `apps/web/src/lib/lead/helpers.ts`
  ```typescript
  export function emptyToNull(value: string | undefined): string | null {
      return !value || value === "" ? null : value;
  }
  ```
- **Editar:** `save-lead.ts` — remover função local, adicionar `import { emptyToNull } from "./helpers"`
- **Editar:** `update-lead.ts` — mesmo ajuste

**Impacto em testes:** Zero — a função é interna, o comportamento não muda.

---

### P2-6: SQL raw → Drizzle builder (narrowed scope)

**Escopo narrowed após Codex review:** Converter apenas queries genuinamente builder-safe. `buildWhereConditions` em `admin/stats.ts` foi **deferido** — filtros de data com `::timestamptz` adicionam churn sem eliminar a complexidade subjacente.

**Converter:**

**`admin/leads.ts`:**
- Linhas 27, 49: `orderBy(sql`${leads.createdAt} DESC`)` → `orderBy(desc(leads.createdAt))`
- Linha 31: `sql<number>`count(*)::int`` → `count(leads.id)`

**`admin/stats.ts`:**
- Linha 152 (`getDistinctSegments`): raw query completa → `db.selectDistinct({ segment: leads.segment }).from(leads).where(and(isNotNull(leads.segment), isNull(leads.deletedAt))).orderBy(asc(leads.segment))`

**Permanecem raw (6 queries):**
- `leaderboard.ts`: CTE + `ROW_NUMBER() OVER` + JOIN `auth.users`
- `admin/leads.ts:123`: `listVendors` JOIN `auth.users` + `SPLIT_PART`
- `admin/stats.ts:22-34`: `buildWhereConditions` (deferido — `::timestamptz`)
- `admin/stats.ts:50-58`: `FILTER (WHERE ...)` + `CASE WHEN` nos aggregates
- `admin/stats.ts:99-109`: `DATE() AT TIME ZONE` + GROUP BY em expressão
- `admin/stats.ts:120-138`: JOIN `auth.users` + agregação com CASE

**Imports a adicionar/ajustar:** `desc, count, selectDistinct, isNotNull, asc` de `drizzle-orm`.

---

### P2-7: Tombstone Contract + Validação de Rowcount

**Problema original:** Sync UPDATE e DELETE fazem ACK incondicional sem verificar se alguma linha foi afetada.

**Problema descoberto pelo Codex review:** O sync UPDATE filtra apenas por `localId + userId`, sem `deletedAt IS NULL`. Se um admin soft-deletou o lead, o UPDATE vai **ressuscitar o lead morto** (atualizar campos de uma row com `deletedAt` definido). O rowcount=0 nunca acontece nesse cenário porque a row existe.

#### sync.ts UPDATE — Tombstone Contract

**Mudança:** Adicionar `isNull(leads.deletedAt)` ao WHERE.

**Comportamento quando rowcount=0:**
- ACK silencioso (não `failedOperation`)
- **Justificativa:** O lead foi tombstoned ou nunca existiu — o cliente não pode resolver isso. Retornar `failedOperation` criaria um poison pill: o engine incrementa `retryCount` mas a operação permanece na `syncQueue`, bloqueando ciclos futuros indefinidamente. ACK silencioso descarta a operação stale sem bloquear o pipeline.

```typescript
case "update": {
    const fields = sanitizePayload(op.payload);
    const result = await db
        .update(leads)
        .set({ ...fields, updatedAt: new Date() })
        .where(
            and(
                eq(leads.localId, op.localId),
                eq(leads.userId, userId),
                isNull(leads.deletedAt)
            )
        )
        .returning({ localId: leads.localId });
    // ACK regardless — if rowcount=0, lead is tombstoned or missing.
    // Client cannot resolve this; discarding prevents poison pill.
    acknowledged.push({
        localId: op.localId,
        queueId: op.clientTimestamp,
    });
    break;
}
```

#### sync.ts DELETE — Sem Mudança

DELETE permanece ACK incondicional. Soft-delete é idempotente por natureza: "já deletado" = objetivo atingido.

#### admin/leads.ts delete (linhas 113-119)

Adicionar `.returning()` e verificar length. Padrão do `admin/leads.ts update` (linha 94-108) já implementa isso corretamente — seguir o mesmo modelo:

```typescript
const deleted = await db
    .update(leads)
    .set({ deletedAt: new Date() })
    .where(eq(leads.localId, input.localId))
    .returning({ localId: leads.localId });

if (deleted.length === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
}
```

#### admin/users.ts updateRole e deactivate

Envolver delete+insert em `db.transaction()`. O padrão atual faz `delete` seguido de `insert` sem transação — se o `insert` falhar, o role anterior foi deletado e o usuário fica sem role.

```typescript
await db.transaction(async (tx) => {
    await tx.delete(userRoles).where(eq(userRoles.userId, input.userId));
    await tx.insert(userRoles).values({ userId: input.userId, role: input.role });
});
```

**Impacto em testes:** `packages/api/src/__tests__/sync.test.ts` — mock de `update` precisa retornar array ao invés de void (para `.returning()`).

---

### P3-3: Testes de Cenários de Falha (Stretch)

**Arquivo:** `apps/web/src/lib/sync/engine.test.ts`

6 cenários priorizados (2 novos do Codex review + 4 do backlog original):

1. **UPDATE em lead tombstoned** — sync update com `deletedAt IS NULL` no WHERE; mock retorna `[]` do `.returning()`; validar que o engine faz ACK silencioso e continua ciclo normalmente
2. **DELETE em lead inexistente** — sync delete em lead com localId inválido; validar ACK idempotente
3. **Payload corrompido na syncQueue** — `JSON.parse(op.payload)` falha; validar que o ciclo retorna `failedOperation` e não bloqueia operações anteriores já ACKadas
4. **Timeout real (AbortError)** — mock de `fetchWithTimeout` resolve com `AbortError`; validar que o sync engine chama o mecanismo de retry normalmente
5. **Pull falha após push bem-sucedido** — push completa com ACKs aplicados; pull falha com erro de rede; validar que `lastSyncTimestamp` não é atualizado e ACKs não são revertidos
6. **Conflito timestamps iguais** — lead local e servidor com `updatedAt` idênticos e `syncStatus === "pending"`; validar que server-wins ocorre (comparação `>` é `false` no empate)

**Cenários removidos após Codex review:**
- ACK duplicado — Dexie `bulkDelete` é silencioso com IDs duplicados, sem consequência prática
- serverId null/undefined — edge case improvável dado garantias do Supabase Auth

---

## Impacto em Testes Existentes

| Arquivo | Mudança necessária |
|---------|-------------------|
| `packages/api/src/__tests__/sync.test.ts` | Mock de `update` precisa retornar array para `.returning()` |
| `packages/api/src/__tests__/admin-users.test.ts` | Adicionar `inArray`, `isNull` ao mock de `drizzle-orm` |
| `packages/api/src/__tests__/admin-leads.test.ts` | Adicionar `desc` ao mock de `drizzle-orm` |
| `packages/api/src/__tests__/admin-stats.test.ts` | Ajustar se `getDistinctSegments` mudar de `db.execute(sql)` para query builder |

Nenhum teste existente deve ser deletado.

---

## Assumptions to Validate

- Admin lead deletion é soft delete only — não existe hard-delete path para `leads`
- Não há quarantine/recovery path para `failedOperation` persistentes além de incrementar `retryCount`
- `startDate` e `endDate` em stats permanecem strings — boundary de input não muda nesta sprint

---

## Riscos e Mitigações

| Risco | Mitigação |
|-------|----------|
| P2-5 muda semântica (ANY vs IN) | Equivalentes no PostgreSQL — comportamento idêntico |
| P2-7 ACK silencioso descarta update legítimo | Improvável: create deveria vir antes do update na fila. Se ocorrer, dado era inconsistente |
| bun install quebra lockfile após remover auth | Rodar `bun install` e verificar resolução antes de commitar |
| Tabela `todo` órfã após remover router | Baixo risco — tabela vazia sem FKs. DROP TABLE em fase posterior |

---

## Verificação

1. `bun run check-types` — zero erros TypeScript
2. `bun run test` — ≥205 testes passando (incluindo P3-3 novos)
3. `bun run check` — lint/format OK
4. `grep -r "publicProcedure" packages/api/src/routers/` retorna apenas `healthCheck`
5. `grep -r "sql\.raw" packages/api/` retorna 0 matches
6. `grep -r "@dashboard-leads-profills/auth"` retorna 0 matches
7. Sync UPDATE em `sync.ts` inclui `isNull(leads.deletedAt)` no WHERE
8. `db.transaction()` envolve updateRole e deactivate em `admin/users.ts`
