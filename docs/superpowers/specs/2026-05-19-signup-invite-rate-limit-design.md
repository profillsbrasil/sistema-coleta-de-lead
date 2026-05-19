# Rate limit persistente para `/api/signup-invite`

> Spec — 2026-05-19. Origem: issue #27, item #9 de `docs/tech-debt.md`.

## Problema

`apps/web/src/app/api/signup-invite/route.ts:11` controla tentativas de invite code
com um `Map` em memória de processo. O deploy é serverless (Vercel): cada cold start
zera o `Map` e requests caem em instâncias distintas. Um atacante rotaciona instâncias
e contorna o limite de 5 tentativas / 60s, abrindo brute-force do `SIGNUP_INVITE_CODE`.

## Objetivo

Tornar o rate limit compartilhado entre instâncias, sem adicionar infra nova. O store
é o Postgres já existente (Drizzle). Comportamento observável preservado:
**5 tentativas por janela de 60s por IP**, resposta `429` ao exceder.

Fora de escopo: rate limit de outros endpoints, sliding window, troca da estratégia
de identificação por IP.

## Decisões

- **Store:** Postgres via Drizzle. Sem Redis, sem infra nova.
- **Algoritmo:** fixed window — preserva a semântica atual e cabe em um único
  statement atômico.
- **Cleanup:** oportunístico dentro do helper. Sem `pg_cron`.
- **Testes:** teste de integração contra Postgres real. **Padrão novo** — os testes
  atuais (`leaderboard.test.ts`, `sync.test.ts`) mockam o `db` inteiro; mockar aqui
  anularia a cobertura da atomicidade, que é o ponto da mudança.

## Arquitetura

### 1. Tabela `signup_invite_rate_limit`

Novo arquivo `packages/db/src/schema/signup-invite-rate-limit.ts`:

| Coluna     | Tipo          | Notas                  |
|------------|---------------|------------------------|
| `ip`       | `text`        | primary key            |
| `count`    | `integer`     | not null               |
| `reset_at` | `timestamptz` | not null, fim da janela |

Exportada em `packages/db/src/schema/index.ts` e registrada no objeto `schema` do
client em `packages/db/src/index.ts`.

Migration gerada com `bun run db:generate` e aplicada com `bun run db:migrate`.

### 2. Helper `checkSignupInviteRateLimit`

Novo arquivo `apps/web/src/lib/rate-limit/signup-invite.ts`. Exporta
`checkSignupInviteRateLimit(ip: string): Promise<boolean>` — `true` libera, `false`
bloqueia. Constantes `RATE_LIMIT_WINDOW_MS` (60s) e `RATE_LIMIT_MAX` (5) migram do
`route.ts` para este módulo.

Decisão atômica em um único upsert (race-safe entre instâncias concorrentes, sem
transação explícita):

```sql
INSERT INTO signup_invite_rate_limit (ip, count, reset_at)
VALUES ($ip, 1, now() + interval '60 seconds')
ON CONFLICT (ip) DO UPDATE SET
  count    = CASE WHEN signup_invite_rate_limit.reset_at < now()
                  THEN 1 ELSE signup_invite_rate_limit.count + 1 END,
  reset_at = CASE WHEN signup_invite_rate_limit.reset_at < now()
                  THEN now() + interval '60 seconds'
                  ELSE signup_invite_rate_limit.reset_at END
RETURNING count;
```

Executado via `db.execute(sql\`...\`)` (mesmo estilo SQL-direto do leaderboard).
Libera quando `count <= RATE_LIMIT_MAX`, bloqueia quando `count > RATE_LIMIT_MAX` —
equivale ao `count >= MAX → bloqueia` atual: a 5ª tentativa passa, a 6ª cai.

**Cleanup oportunístico:** com baixa probabilidade por chamada (`Math.random() < 0.05`),
roda `DELETE FROM signup_invite_rate_limit WHERE reset_at < now()` antes do upsert.
Mantém a tabela pequena sem job agendado. Falha de cleanup não deve derrubar o
request — mas o erro não é silenciado em nível que esconda a causa raiz; o upsert
seguinte é o caminho crítico.

### 3. `route.ts`

- Remove `attempts`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` e o `checkRateLimit`
  síncrono.
- Substitui por `await checkSignupInviteRateLimit(ip)`.
- `getClientIp` e a resposta `429` permanecem inalterados.
- `ip === "unknown"` (requests sem `x-forwarded-for`/`x-real-ip`) continua
  compartilhando um único bucket — comportamento idêntico ao atual.

## Fluxo

```
POST /api/signup-invite
  → getClientIp(req)
  → checkSignupInviteRateLimit(ip)   # upsert atômico no Postgres
      → cleanup oportunístico (5% das chamadas)
      → false  → 429
      → true   → valida code → timingSafeEqual → seta cookie → 200
```

## Erros

- **Falha de conexão ao Postgres no helper:** o erro propaga; o route handler
  responde `500`. Não há fallback que libere o request silenciosamente — fail-closed
  é o comportamento seguro para um controle anti-brute-force.
- **Falha do cleanup:** não bloqueia o request; o upsert subsequente é o caminho
  crítico e roda normalmente.

## Testes (Vitest)

Novo arquivo `apps/web/src/lib/rate-limit/signup-invite.test.ts` — integração contra
Postgres real. Conecta usando uma `DATABASE_URL` de teste; se a variável não estiver
definida, o teste faz `describe.skip` para não quebrar ambientes sem DB.

Casos:

1. Primeira chamada de um IP novo → libera (`count = 1`).
2. 5 chamadas dentro da janela → todas liberam; a 6ª bloqueia.
3. Após `reset_at` expirar, nova chamada → janela reinicia, libera.
4. IPs distintos têm buckets independentes.
5. Cleanup remove linhas com `reset_at` no passado.

Cada teste limpa as linhas que criou (`afterEach`).

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `packages/db/src/schema/signup-invite-rate-limit.ts` | novo — schema da tabela |
| `packages/db/src/schema/index.ts` | export do novo schema |
| `packages/db/src/index.ts` | registra schema no client `db` |
| `packages/db/src/migrations/*` | nova migration gerada |
| `apps/web/src/lib/rate-limit/signup-invite.ts` | novo — helper + cleanup |
| `apps/web/src/app/api/signup-invite/route.ts` | usa o helper async |
| `apps/web/src/lib/rate-limit/signup-invite.test.ts` | novo — teste de integração |
| `docs/tech-debt.md` | marca item #9 como resolvido |

## Verificação

- `bun run check-types`
- `bun run test`
- `bun run check`
- Migration aplicada em DB local e tabela `signup_invite_rate_limit` presente.
