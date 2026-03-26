# Phase 2: Offline Infrastructure - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

O sistema persiste dados localmente via Dexie e sincroniza com Supabase automaticamente quando ha conexao, com conflict resolution server-wins. Inclui schema de leads (Drizzle + Dexie), sync engine, conflict resolution e connectivity detection.

</domain>

<decisions>
## Implementation Decisions

### Schema de leads
- **D-01:** Campos conforme REQUIREMENTS: nome (obrigatorio), telefone, email, empresa, cargo, segmento (texto livre), notas (multi-line), tag de interesse (quente/morno/frio), foto. Sem campos extras.
- **D-02:** Contato: pelo menos telefone OU email obrigatorio (nao ambos). Validacao client-side impede salvar sem nenhum dos dois.
- **D-03:** IDs: UUID v4 gerado no client (local_id via crypto.randomUUID()), bigserial auto-increment no server (server_id). Dexie usa local_id como primary key. Postgres usa bigserial como PK com coluna local_id UUID unique.
- **D-04:** Timestamps: created_at, updated_at (automaticos), deleted_at (soft-delete). Sync usa updated_at para conflict resolution.

### Sync strategy
- **D-05:** Trigger: sync imediato ao reconectar. Sem acao do usuario. Retry com exponential backoff se falhar.
- **D-06:** Direcao: push-then-pull. Envia mudancas locais primeiro, depois busca atualizacoes do servidor.
- **D-07:** Engine: singleton em `apps/web/src/lib/sync/engine.ts`, fora do React tree. Usa tRPC vanilla client. Inicializado via lazy import em um provider React que chama startSync().

### Conflict resolution
- **D-08:** Granularidade: row-level. Se server tem updated_at mais recente, a row inteira do server vence. Para 10 vendedores editando seus proprios leads, conflitos reais sao raros.
- **D-09:** Notificacao: toast discreto quando server overwrite acontecer. Nao bloqueia, apenas informa ("X leads atualizados pelo servidor").

### Connectivity detection
- **D-10:** Deteccao: Navigator.onLine + polling fallback a cada 30 segundos para Safari mobile.
- **D-11:** Sem indicador visual de conectividade nesta fase. O detector e interno, usado pelo sync engine. Indicador visual de online/offline nao sera implementado.

### Claude's Discretion
- Dexie schema design — como estruturar indices, quais campos indexar para queries performaticas
- Sync queue implementation — estrutura da fila de operacoes pendentes no Dexie (syncQueue table)
- tRPC procedures para sync — quais procedures criar (pushChanges, pullChanges) e seus input schemas
- Error handling e retry strategy — detalhes do exponential backoff, max retries, timeout
- Foto handling no Dexie — como armazenar blob/base64 comprimido localmente (detalhes de implementacao, nao UX)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project requirements
- `.planning/REQUIREMENTS.md` — OFFL-01 through OFFL-06 define os requisitos de offline infrastructure
- `.planning/ROADMAP.md` §Phase 2 — Goal, success criteria e depends on

### Prior phase (auth foundation)
- `apps/web/src/lib/supabase/client.ts` — Supabase browser client (reutilizar para sync)
- `apps/web/src/lib/supabase/server.ts` — Supabase server client
- `packages/api/src/context.ts` — tRPC context com Supabase JWT claims
- `packages/api/src/index.ts` — publicProcedure, protectedProcedure, adminProcedure

### Existing Dexie setup
- `apps/web/package.json` — Dexie 4.3.0 e dexie-react-hooks 4.2.0 ja instalados

### Database schema
- `packages/db/src/schema/auth.ts` — user_roles table (referencia para pattern de schema Drizzle)
- `packages/db/drizzle.config.ts` — Drizzle config (env path, schema location)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `dexie 4.3.0` e `dexie-react-hooks 4.2.0`: ja instalados em `apps/web/package.json`, sem uso ainda. Pronto para configurar.
- `@supabase/supabase-js`: client browser em `apps/web/src/lib/supabase/client.ts` — reutilizar para auth context no sync engine
- tRPC vanilla client: pode ser instanciado fora do React tree para o sync engine
- `packages/db/src/schema/`: padrao Drizzle existente com pgTable, pgEnum, indices — seguir mesmo padrao para leads table

### Established Patterns
- tRPC context le JWT claims do Supabase (user_id, user_role) — sync procedures podem reutilizar protectedProcedure
- Drizzle ORM com PostgreSQL via `pg` driver — schema definido em `packages/db/src/schema/`
- T3 Env para env vars — novas vars (se necessario) seguem mesmo padrao
- Sonner para toasts — usar para notificacao de conflict resolution

### Integration Points
- `packages/api/src/routers/` — novos sync routers (pushChanges, pullChanges) aqui
- `packages/db/src/schema/` — nova leads table aqui
- `apps/web/src/lib/sync/` — novo diretorio para sync engine, connectivity detector, Dexie config
- `apps/web/src/components/providers.tsx` — inicializar sync engine via lazy import

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-offline-infrastructure*
*Context gathered: 2026-03-24*
