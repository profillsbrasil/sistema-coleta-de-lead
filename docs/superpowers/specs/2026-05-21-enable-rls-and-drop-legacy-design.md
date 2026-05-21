# Habilitar RLS no Postgres e dropar tabelas legado

- **Issue:** #20 (RLS) + tech-debt item #24 (legado `todo` / `user_roles` / enum `app_role`)
- **Branch:** `feat/enable-rls-and-drop-legacy`
- **Data:** 2026-05-21
- **Severidade do risco endereçado:** alta

## Contexto e validação do issue

O issue #20 descreve a ausência de RLS como risco porque o isolamento entre usuários
depende apenas do filtro `eq(leads.userId, userId)` nas queries Drizzle. A validação
confirma o fato, mas o framing do issue **subestima o vetor real**.

### O que foi verificado
- `packages/db/src/migrations/*.sql` — nenhum `ENABLE ROW LEVEL SECURITY`, nenhuma policy.
- `packages/api/src/routers/**` — todas as leituras de leads dependem de
  `eq(leads.userId, userId)`. Um filtro esquecido vazaria dados de outros usuários.
- `apps/web/src/lib/storage/client.ts` — Supabase JS é instanciado no browser com
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Esta chave é pública por design.

### Vetor real (não nomeado pelo issue)
Todo projeto Supabase expõe automaticamente PostgREST em `/rest/v1/<tabela>` aceitando a
anon key. Sem RLS habilitada, qualquer visitante do site pode chamar:

```http
GET  https://<proj>.supabase.co/rest/v1/leads
POST https://<proj>.supabase.co/rest/v1/leads
```

com a anon key extraída do bundle do browser e ler/gravar dados de **todos** os usuários.
O mesmo vale para as tabelas do Better Auth (`user`, `session`, `account`, `verification`)
— `session.token` em texto puro permitiria session hijacking.

A `SUPABASE_SERVICE_ROLE_KEY` citada no tech-debt foi removida no item #6 e não é mais
um vetor.

### Por que a fix é simples
A app conecta via `node-postgres` + `DATABASE_URL`, como role dona das tabelas
(`postgres`). Owners têm bypass implícito de RLS no Postgres — só `FORCE ROW LEVEL
SECURITY` muda isso. Logo, basta `ENABLE ROW LEVEL SECURITY` em cada tabela, sem
nenhuma policy:

- App Drizzle continua funcionando idêntico (bypass de owner).
- PostgREST (roles `anon` / `authenticated`) passa a ser bloqueado por default-deny.

Policies por `userId` só seriam necessárias se a app fosse migrada para usar
`supabase-js` + JWT como cliente de dados. Não é o caso e não há plano para isso.

## Decisões

| Decisão | Escolha | Motivo |
| --- | --- | --- |
| Estratégia de RLS | `ENABLE ROW LEVEL SECURITY` sem policies | Mínimo de mudança, fecha o vetor PostgREST/anon, app continua via bypass de owner. |
| `FORCE ROW LEVEL SECURITY`? | Não | Quebraria toda a camada Drizzle e exigiria refactor de acesso a dados. Não traz ganho extra dado o modelo atual. |
| Drop do legado junto | Sim | Reduz superfície de tabelas a proteger e zera o tech-debt #24 no mesmo PR. Drop afeta tabelas com zero leitura/escrita no código. |
| Granularidade do PR | Um único PR | Mudança coesa: ambos os itens tocam `packages/db/src/migrations` e ambos endereçam superfície exposta. |

## Mudanças

### 1. Nova migration SQL: `packages/db/src/migrations/0004_enable_rls_drop_legacy.sql`

```sql
-- Drop legado de scaffolding (item #24)
DROP TABLE IF EXISTS public.todo;
DROP TABLE IF EXISTS public.user_roles;
DROP TYPE  IF EXISTS public.app_role;

-- RLS default-deny via PostgREST/anon. Owner (postgres) tem bypass implícito.
ALTER TABLE public.leads                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user"                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signup_invite_rate_limit ENABLE ROW LEVEL SECURITY;
```

### 2. Remover `todo` do schema Drizzle
- Deletar `packages/db/src/schema/todo.ts`.
- Em `packages/db/src/schema/index.ts`: remover `export * from "./todo"`.
- Em `packages/db/src/index.ts`: remover `todo` do import e do objeto `schema` passado
  para `drizzle()`.

### 3. Metadados Drizzle
A migration é manuscrita (drizzle-kit não gera `ENABLE RLS`). Procedimento:

1. Remover `todo` do schema TS (passo 2 acima).
2. Rodar `bun run db:generate` para que o drizzle-kit produza o snapshot e o entry no
   `_journal.json` referentes ao drop de `todo`. Aceitar o nome gerado.
3. Editar o `.sql` resultante para incluir também o `DROP TABLE public.user_roles`,
   `DROP TYPE public.app_role` e os `ENABLE ROW LEVEL SECURITY`.
4. Garantir que o nome do arquivo seja `0004_enable_rls_drop_legacy.sql` (renomear no
   journal se necessário).

> Alternativa: hand-crafted total (sem `db:generate`) — possível, mas exige editar
> `_journal.json` e `meta/<NNNN>_snapshot.json` à mão. A rota acima é mais segura.

### 4. Atualizar `docs/tech-debt.md`
Marcar item #2 e item #24 como **resolvido em 2026-05-21**, citando este spec/PR.

## Verificação

1. `bun run check-types` — verde (sem referências dangling a `todo` / `app_role`).
2. `bun run test` — verde.
3. **Smoke local da app:** `bun run dev:web`, login com usuário comum, criar lead,
   editar lead, listar leads, abrir leaderboard, sync online/offline. Tudo deve
   comportar-se exatamente como antes.
4. **Smoke do fechamento do buraco** (executar contra Supabase de dev, com a anon
   key real do `.env`):
   ```bash
   curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/leads?select=id&limit=1" \
     -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
     -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY"
   ```
   - **Antes da migration:** retorna linhas ou JSON com dados.
   - **Depois da migration:** retorna `[]` ou erro de permissão. Repetir para
     `user`, `session`, `account`, `verification`, `signup_invite_rate_limit`.
5. Confirmar que upload de foto continua funcionando (Storage tem RLS separada em
   `storage.objects` e não é afetada por esta migration).

## Risco e rollback

- **Risco da habilitação de RLS:** baixo. Reversível com
  `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`. O app não muda de comportamento.
- **Risco do drop de legado:** baixo na prática, mas irreversível em produção. Antes
  de rodar `db:migrate` em prod:
  - `SELECT count(*) FROM public.todo;`
  - `SELECT count(*) FROM public.user_roles;`
  - Se houver linhas inesperadas, parar e investigar antes do drop. Caso contrário,
    fazer `pg_dump -t public.todo -t public.user_roles` como backup defensivo.
- **Ordem segura:** rodar migration em staging primeiro, executar o smoke do passo 4
  para confirmar que PostgREST está bloqueado, depois prod.

## Fora de escopo

- Policies de RLS baseadas em `userId` (não há cliente que precise delas hoje).
- `FORCE ROW LEVEL SECURITY` (exigiria refactor da camada de acesso).
- Auditoria das policies de Storage em `storage.objects` (tema separado, fora deste PR).
- Itens #25–#28 do tech-debt.
