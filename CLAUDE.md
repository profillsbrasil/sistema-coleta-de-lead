# Sistema Coleta de Lead

> Log de mistakes recorrentes e decisões não-óbvias. Em conflito, código vence.

## Produto

- Coleta de leads **offline-first** em eventos/congressos. Prioridade absoluta: não perder dados quando rede falha.
- **Não** é CRM. Funis, automações e follow-up complexos NÃO entram no escopo.

## Auth

- Auth usa **Better Auth** em `packages/auth`, **não Supabase Auth**. Supabase é só Storage (`bucket lead-photos`).
- Guard admin: `session.user.role === "admin"` — role mora em `public.user.role` (default `vendedor`), sem tabela de roles separada.

## Sync / Offline

- Resolução de conflito no pull: **server-wins** para dados do servidor.
- Leaderboard usa SQL direto + JOIN com `public."user"` (Better Auth), não `auth.users`.

## Convenções globais

- Prefira `unknown` > `any`. Sem `console.log` em produção.
- Imports path-based, sem barrel files novos (ver `packages/ui/CLAUDE.md`).

## Onde estão os outros mistakes-logs

| Tópico | CLAUDE.md |
|---|---|
| Offline / SSR / SW, Next 16, `/api/health` | `apps/web/CLAUDE.md` |
| RLS, schema, drizzle config | `packages/db/CLAUDE.md` |
| Imports UI, shadcn | `packages/ui/CLAUDE.md` |
| WhatsApp Bot Sorteio | `packages/api/src/whatsapp/CLAUDE.md` |

Stack / scripts / envs → `package.json`, `packages/env/src/{server,web}.ts`. Dívida técnica → `docs/tech-debt.md`.
