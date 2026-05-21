# ADR 0001 — RLS sem policies, via bypass de owner

- **Data:** 2026-05-21
- **Status:** Aceita
- **PR:** #38
- **Spec:** `docs/superpowers/specs/2026-05-21-enable-rls-and-drop-legacy-design.md`

## Contexto

A app expõe `NEXT_PUBLIC_SUPABASE_ANON_KEY` no browser (usado para o Storage de fotos
de leads). Todo projeto Supabase publica automaticamente PostgREST em
`/rest/v1/<tabela>` aceitando essa anon key.

Sem RLS habilitada nas tabelas `public.*`, qualquer visitante poderia chamar
`GET /rest/v1/leads`, `/rest/v1/user`, `/rest/v1/session` etc. e ler dados de todos
os usuários. `session.token` em texto puro → session hijack.

A app não usa `supabase-js` para dados — só para Storage. Toda escrita/leitura de
negócio passa por Drizzle ORM via `node-postgres`, conectando como o role
**owner** das tabelas (`postgres`).

## Decisão

Habilitar `ROW LEVEL SECURITY` em todas as tabelas `public.*` da app **sem criar
nenhuma policy**.

Aplicado pela migration `0004_enable_rls_drop_legacy`:

```sql
ALTER TABLE "public"."leads"                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user"                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."session"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."account"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."verification"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."signup_invite_rate_limit" ENABLE ROW LEVEL SECURITY;
```

## Como isso funciona

Postgres aplica RLS de forma **assimétrica**:

| Role | Comportamento com RLS habilitada sem policies |
| --- | --- |
| Owner da tabela (`postgres`) | Bypass implícito. Lê e escreve normalmente. |
| `anon` (PostgREST público) | Default-deny. Toda query retorna `[]` ou erro. |
| `authenticated` (PostgREST com JWT) | Default-deny. Igual ao anon. |

Como a app conecta como owner, o Drizzle continua funcionando idêntico ao
pré-migration. PostgREST/anon, que era o vetor exposto, fica bloqueado por
default-deny.

> Importante: `ENABLE ROW LEVEL SECURITY` ≠ `FORCE ROW LEVEL SECURITY`.
> A primeira respeita o bypass de owner; a segunda não. Esta ADR fala da primeira.

## Consequências

### Positivas

- Fecha o vetor de exposição via anon key + PostgREST com a mudança mínima
  possível (uma linha de SQL por tabela, sem código de app).
- Não exige refactor da camada de acesso a dados.
- Mantém um único caminho de autorização (Drizzle + checagens em tRPC), evitando
  ter que duplicar regras em policies SQL.

### Negativas

- Se algum dia a app passar a usar `supabase-js` como cliente de dados
  (autenticado via JWT), nada vai funcionar até que policies sejam escritas.
  Essa migração teria que ser **gateada por uma nova ADR** que substitua esta.
- "Sem policies" significa que a única defesa contra "filtro `userId` esquecido
  num router tRPC" continua sendo code review + testes. RLS não funciona como
  rede de segurança para owners.
- Adicionar uma nova tabela `public.*` exige lembrar de habilitar RLS na mesma
  migration. Convenção documentada em `packages/db/CLAUDE.md`.

## Alternativas consideradas

### A. Policies por `userId` (rejeitada)

Criar policies do tipo
`USING (user_id = (current_setting('request.jwt.claims')::jsonb->>'sub')::uuid)`.

- Só faz sentido se a app passar a usar `supabase-js` + JWT.
- Hoje o JWT do Better Auth não é o JWT que o Supabase espera, então as policies
  não teriam variáveis de contexto para checar.
- Trabalho considerável, ganho zero no modelo atual.

### B. `FORCE ROW LEVEL SECURITY` (rejeitada)

Forçar RLS até para o owner. Quebraria toda a camada Drizzle, exigindo
`SET LOCAL ROLE` + injetar `userId` por request — refactor grande sem ganho
adicional dado que a app é o único caminho de escrita conhecido hoje.

### C. Revogar permissões do role `anon` no PostgREST (rejeitada)

Tecnicamente equivalente em segurança, mas Supabase regenera grants em algumas
operações administrativas e o resultado é menos auditável que `ENABLE RLS` por
tabela.

## Não está no escopo

- Policies do bucket Storage `lead-photos` (continuam administradas em
  `storage.objects`, separadamente).
- Migração futura para `supabase-js` como cliente de dados (será tratada em
  ADR própria se acontecer).
