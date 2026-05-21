# Habilitar RLS e dropar legado — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Habilitar Row-Level Security em todas as tabelas `public.*` e remover o legado de scaffolding (`todo`, `user_roles`, enum `app_role`), fechando o vetor de exposição via PostgREST/anon key.

**Architecture:** Migration SQL única consolidando DROP do legado + `ENABLE ROW LEVEL SECURITY`. Sem policies — confiamos no bypass implícito de RLS para o role owner (`postgres`) usado pelo Drizzle. PostgREST (roles `anon`/`authenticated`) passa a ser default-deny.

**Tech Stack:** PostgreSQL 15 (Supabase), Drizzle ORM + drizzle-kit, Bun, Better Auth, Next.js 16.

**Spec:** `docs/superpowers/specs/2026-05-21-enable-rls-and-drop-legacy-design.md`

**Branch:** `feat/enable-rls-and-drop-legacy`

---

## File Structure

Arquivos tocados no plano:

- **Modify** `packages/db/src/schema/index.ts` — remover re-export de `todo`.
- **Delete** `packages/db/src/schema/todo.ts` — schema Drizzle de tabela legado.
- **Modify** `packages/db/src/index.ts` — remover `todo` do import e do objeto `schema` passado ao `drizzle()`.
- **Create** `packages/db/src/migrations/0004_enable_rls_drop_legacy.sql` — migration manuscrita com DROPs + ENABLE RLS.
- **Modify** `packages/db/src/migrations/meta/_journal.json` — registrar entrada `0004_enable_rls_drop_legacy`.
- **Create** `packages/db/src/migrations/meta/0004_snapshot.json` — snapshot gerado pelo drizzle-kit.
- **Modify** `docs/tech-debt.md` — marcar itens #2 e #24 como resolvidos.

Não há mudança em código de aplicação (`apps/web/**`, `packages/api/**`). RLS sem policies é transparente para o Drizzle via owner bypass.

---

## Task 1: Remover `todo` do schema Drizzle

**Files:**
- Modify: `packages/db/src/schema/index.ts`
- Delete: `packages/db/src/schema/todo.ts`
- Modify: `packages/db/src/index.ts`

Objetivo: deixar o schema TS consistente com o estado final do banco (sem `todo`). Drizzle-kit detectará o drop na próxima geração.

- [ ] **Step 1: Verificar baseline de tipos e testes na branch**

Run:
```bash
bun run check-types
bun run test
```
Expected: ambos verdes. Se algum falhar antes da mudança, parar e investigar (não está no escopo deste plano).

- [ ] **Step 2: Remover re-export de `todo` no índice do schema**

Editar `packages/db/src/schema/index.ts` para ficar exatamente:

```ts
// biome-ignore lint/performance/noBarrelFile: indice de schema Drizzle, re-export intencional
export * from "./leads";
export * from "./signup-invite-rate-limit";
```

- [ ] **Step 3: Deletar arquivo do schema `todo`**

Run:
```bash
rm packages/db/src/schema/todo.ts
```

- [ ] **Step 4: Remover `todo` do client Drizzle**

Editar `packages/db/src/index.ts` para ficar exatamente:

```ts
import { env } from "@dashboard-leads-profills/env/server";
import { drizzle } from "drizzle-orm/node-postgres";

import { interestTagEnum, leads, signupInviteRateLimit } from "./schema";

export const db = drizzle(env.DATABASE_URL, {
	schema: { interestTagEnum, leads, signupInviteRateLimit },
});
```

- [ ] **Step 5: Validar que não restou referência a `todo` no código**

Run:
```bash
grep -rn "\btodo\b" packages/ apps/ --include="*.ts" --include="*.tsx" \
  | grep -v node_modules | grep -v "\.test\." | grep -iE "import|from"
```
Expected: zero linhas. (Comentários soltos com a palavra "todo" não importam — só imports/from.)

- [ ] **Step 6: Rodar check-types**

Run: `bun run check-types`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/db/src/schema/index.ts packages/db/src/schema/todo.ts packages/db/src/index.ts
git commit -m "refactor(db): remove schema legado todo"
```

---

## Task 2: Gerar snapshot e journal da migration via drizzle-kit

**Files:**
- Create: `packages/db/src/migrations/<auto>.sql` (será renomeado depois)
- Create: `packages/db/src/migrations/meta/0004_snapshot.json`
- Modify: `packages/db/src/migrations/meta/_journal.json`

Objetivo: deixar drizzle-kit produzir os metadados (snapshot + entrada no journal) correspondentes ao novo estado do schema (sem `todo`). Faremos o SQL manuscrito no próximo task.

- [ ] **Step 1: Gerar migration**

Run a partir da raiz do repo:
```bash
bun run db:generate
```
Expected: drizzle-kit cria um arquivo `0004_<nome-aleatório>.sql` em `packages/db/src/migrations/`, um `0004_snapshot.json` em `meta/`, e adiciona uma entrada `idx: 4` no `_journal.json`. O SQL gerado conterá pelo menos `DROP TABLE "todo";`.

- [ ] **Step 2: Renomear arquivos para o slug final**

Run (substituir `<auto>` pelo nome gerado pelo drizzle-kit):
```bash
mv packages/db/src/migrations/0004_<auto>.sql \
   packages/db/src/migrations/0004_enable_rls_drop_legacy.sql
```

E em `packages/db/src/migrations/meta/_journal.json`, alterar a `tag` da entrada `idx: 4` de `"0004_<auto>"` para `"0004_enable_rls_drop_legacy"` (manter `when`, `version`, `breakpoints` como o drizzle-kit gerou).

- [ ] **Step 3: Verificar que o snapshot ficou consistente**

Run:
```bash
grep -c '"todo"' packages/db/src/migrations/meta/0004_snapshot.json
```
Expected: `0` (snapshot já reflete a remoção da tabela). Caso retorne >0, repetir Step 1 garantindo que `packages/db/src/schema/todo.ts` realmente não existe.

- [ ] **Step 4: NÃO commitar ainda** — o SQL será editado no próximo task. Commit consolidado depois.

---

## Task 3: Escrever o SQL final da migration (drops + ENABLE RLS)

**Files:**
- Modify: `packages/db/src/migrations/0004_enable_rls_drop_legacy.sql`

Objetivo: substituir o conteúdo gerado pelo drizzle-kit pelo SQL completo, idempotente, que dropa `todo`/`user_roles`/`app_role` e habilita RLS nas 6 tabelas remanescentes.

- [ ] **Step 1: Substituir o conteúdo do arquivo da migration**

Editar `packages/db/src/migrations/0004_enable_rls_drop_legacy.sql` para conter exatamente:

```sql
-- Drop legado de scaffolding (tech-debt #24)
DROP TABLE IF EXISTS "public"."todo";--> statement-breakpoint
DROP TABLE IF EXISTS "public"."user_roles";--> statement-breakpoint
DROP TYPE  IF EXISTS "public"."app_role";--> statement-breakpoint

-- Habilitar RLS (issue #20). Sem policies: default-deny via PostgREST/anon.
-- O app Drizzle conecta como role owner e tem bypass implícito de RLS.
ALTER TABLE "public"."leads"                    ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."user"                     ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."session"                  ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."account"                  ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."verification"             ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."signup_invite_rate_limit" ENABLE ROW LEVEL SECURITY;
```

> Observação: drizzle-kit usa `--> statement-breakpoint` como delimitador. Mantenha-os ao final de cada statement exceto o último.

- [ ] **Step 2: Validar sintaxe SQL com psql (parse-only)**

Run (precisa de `DATABASE_URL` exportado ou usar o do `.env`):
```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "BEGIN; \
  $(cat packages/db/src/migrations/0004_enable_rls_drop_legacy.sql | sed 's|--> statement-breakpoint||g'); \
  ROLLBACK;"
```
Expected: termina com `ROLLBACK` sem erro. Se falhar, ler a mensagem e corrigir o `.sql`.

> Alternativa se `DATABASE_URL` não estiver disponível localmente: pular este step e confiar no Step 1 do Task 4.

- [ ] **Step 3: Commit consolidado dos arquivos de migration**

```bash
git add packages/db/src/migrations/0004_enable_rls_drop_legacy.sql \
        packages/db/src/migrations/meta/0004_snapshot.json \
        packages/db/src/migrations/meta/_journal.json
git commit -m "feat(db): habilita RLS e dropa legado todo/user_roles"
```

---

## Task 4: Aplicar migration localmente e validar comportamento da app

**Files:**
- (nenhum arquivo modificado neste task — só execução)

Objetivo: aplicar a migration contra o Postgres de dev e confirmar que (a) a app continua funcionando idêntica e (b) o PostgREST passou a bloquear acesso via anon key.

- [ ] **Step 1: Backup defensivo de tabelas legado (banco de dev)**

Run:
```bash
pg_dump "$DATABASE_URL" -t public.todo -t public.user_roles \
  --data-only --column-inserts > /tmp/legacy-backup-$(date +%Y%m%d).sql || true
```
Expected: arquivo criado (mesmo que vazio). Em prod o usuário fará o equivalente antes do release.

- [ ] **Step 2: Confirmar que tabelas legado estão vazias (ou aceitáveis)**

Run:
```bash
psql "$DATABASE_URL" -c "SELECT (SELECT count(*) FROM public.todo) AS todo_count, \
                               (SELECT count(*) FROM public.user_roles) AS user_roles_count;"
```
Expected: ambos `0`. Se algum valor > 0, parar, mostrar ao usuário e perguntar antes de prosseguir.

- [ ] **Step 3: Aplicar a migration**

Run:
```bash
bun run db:migrate
```
Expected: log do drizzle-kit reporta aplicação de `0004_enable_rls_drop_legacy`. Sem erro.

- [ ] **Step 4: Confirmar RLS habilitado em todas as 6 tabelas**

Run:
```bash
psql "$DATABASE_URL" -c "SELECT relname, relrowsecurity FROM pg_class \
  WHERE relname IN ('leads','user','session','account','verification','signup_invite_rate_limit') \
  AND relnamespace = 'public'::regnamespace ORDER BY relname;"
```
Expected: 6 linhas, todas com `relrowsecurity = t`.

- [ ] **Step 5: Confirmar drop do legado**

Run:
```bash
psql "$DATABASE_URL" -c "SELECT to_regclass('public.todo'), to_regclass('public.user_roles'), to_regtype('public.app_role');"
```
Expected: 3 colunas, todas `NULL`.

- [ ] **Step 6: Smoke da aplicação**

Run em terminal 1:
```bash
bun run dev:web
```

Em terminal 2 (ou no browser):
- Login com usuário comum.
- Criar 1 lead novo.
- Editar o lead criado.
- Listar leads (rota `/leads`).
- Abrir leaderboard / dashboard.
- Forçar offline (devtools) + criar lead → online → confirmar sync no provider de status.

Expected: comportamento idêntico ao pré-migration. Sem erro 500/permission em logs do terminal 1.

- [ ] **Step 7: Smoke do fechamento do buraco PostgREST**

Run (com env do `apps/web/.env` carregado):
```bash
source apps/web/.env 2>/dev/null || true
for t in leads user session account verification signup_invite_rate_limit; do
  echo "=== $t ==="
  curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/$t?select=*&limit=1" \
    -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY"
  echo
done
```
Expected: para cada tabela, resposta `[]` ou erro de permissão (`{"code":"42501",...}` ou similar). **Nunca** dados reais.

> Se algum endpoint retornar dados, a migration não pegou ou a tabela em questão ficou fora do `ENABLE RLS`. Investigar antes de prosseguir.

- [ ] **Step 8: Rodar suíte de testes do monorepo**

Run:
```bash
bun run check-types
bun run test
```
Expected: ambos verdes.

- [ ] **Step 9: (Sem commit neste task — execução pura.)**

---

## Task 5: Atualizar `docs/tech-debt.md`

**Files:**
- Modify: `docs/tech-debt.md`

Objetivo: marcar itens #2 (RLS) e #24 (legado) como resolvidos, com data e referência ao PR.

- [ ] **Step 1: Adicionar status em #2**

No bloco "### 2. Sem Row-Level Security no Postgres", abaixo da linha `- **Issue:** #20`, adicionar:

```markdown
- **Status:** resolvido em 2026-05-21 — migration `0004_enable_rls_drop_legacy`
  habilitou RLS em todas as tabelas `public.*`. Sem policies: confiamos no bypass
  de owner (role `postgres` do Drizzle) e bloqueamos PostgREST/anon por default-deny.
```

- [ ] **Step 2: Adicionar status em #24**

No bloco "### 24. Tabelas/enum de scaffolding não usados", abaixo da linha `- **Ação sugerida:** ...`, adicionar:

```markdown
- **Status:** resolvido em 2026-05-21 — `todo`, `user_roles` e o enum `app_role`
  dropados pela migration `0004_enable_rls_drop_legacy`; schema Drizzle limpo.
```

- [ ] **Step 3: Commit**

```bash
git add docs/tech-debt.md
git commit -m "docs(tech-debt): marca #2 (RLS) e #24 (legado) como resolvidos"
```

---

## Task 6: Push da branch e abertura de PR

**Files:**
- (nenhum)

Objetivo: publicar a branch e abrir PR. **Não fazer push nem criar PR sem confirmação explícita do usuário** (CLAUDE.md: rule `ask` em `git push`).

- [ ] **Step 1: Confirmar com o usuário antes de push**

Perguntar: "Pronto para push da branch `feat/enable-rls-and-drop-legacy` e abrir PR? Lembrete: em produção, executar Steps 1 e 2 do Task 4 (backup + count check) antes do `db:migrate`."

- [ ] **Step 2: Push (após OK explícito)**

Run:
```bash
git push -u origin feat/enable-rls-and-drop-legacy
```

- [ ] **Step 3: Abrir PR (após OK explícito)**

Run:
```bash
gh pr create --fill --base main \
  --title "feat(db): habilita RLS e remove legado (closes #20)" \
  --body "$(cat <<'EOF'
Closes #20. Resolve tech-debt #2 e #24.

## Resumo
- Migration `0004_enable_rls_drop_legacy`: drop de `public.todo`, `public.user_roles`, `public.app_role` + `ENABLE ROW LEVEL SECURITY` em `leads`, `user`, `session`, `account`, `verification`, `signup_invite_rate_limit`.
- Sem policies: app Drizzle conecta como owner (`postgres`) e tem bypass implícito; PostgREST/anon passa a ser default-deny.
- Schema Drizzle e client `packages/db/src/index.ts` limpos.
- `docs/tech-debt.md` atualizado.

## Spec / Plano
- `docs/superpowers/specs/2026-05-21-enable-rls-and-drop-legacy-design.md`
- `docs/superpowers/plans/2026-05-21-enable-rls-and-drop-legacy.md`

## Antes do deploy em prod
1. `SELECT count(*) FROM public.todo;` e `FROM public.user_roles;` — esperar 0.
2. `pg_dump -t public.todo -t public.user_roles ...` por garantia.
3. Aplicar migration.
4. Smoke do PostgREST: `curl .../rest/v1/leads -H "apikey: ..."` → deve retornar `[]` / erro de permissão.
EOF
)"
```

---

## Self-Review (executada pelo autor do plano)

**Spec coverage** — itens da seção "Mudanças" do spec ↔ tasks:
- Migration `0004_enable_rls_drop_legacy.sql` → Tasks 2, 3.
- Remover `todo` do schema TS (3 arquivos) → Task 1.
- Metadados drizzle (snapshot + journal) → Task 2.
- Atualizar `docs/tech-debt.md` → Task 5.
- Verificação 1 (check-types) → Task 1 Step 6, Task 4 Step 8.
- Verificação 2 (test) → Task 1 Step 1, Task 4 Step 8.
- Verificação 3 (smoke local) → Task 4 Step 6.
- Verificação 4 (smoke PostgREST) → Task 4 Step 7.
- Verificação 5 (upload de foto) → coberta pelo smoke do Task 4 Step 6 (fluxo de criar lead inclui foto opcional).
- Backup defensivo / count check → Task 4 Steps 1–2 (dev) e PR body (prod).

Sem gaps. Sem placeholders. Nomes de arquivos/tabelas consistentes entre tasks.

---

## Execution Handoff

Plano salvo em `docs/superpowers/plans/2026-05-21-enable-rls-and-drop-legacy.md`. Duas opções de execução:

1. **Subagent-Driven (recomendado)** — fresh subagent por task, review entre tasks, iteração rápida via `superpowers:subagent-driven-development`.
2. **Inline Execution** — executar tasks neste session via `superpowers:executing-plans`, batch com checkpoints.

Qual abordagem?
