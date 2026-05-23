# WhatsApp Bot — Sorteio Profills Fispal 2026

Backend de captação via QR Code → WhatsApp. Isolado da coleta de leads dos vendedores.

## Mistakes / gotchas

- **LGPD: opt-in obrigatório** por botão `Aceito` / `Nao aceito`. Quem recusa fica em state `DECLINED` com **apenas `wa_id + declined_at + terms_version`** (sem nome/empresa).
- **Sem comando SAIR no bot** — eliminação de dados é por canal humano. Não inventar fluxo de opt-out via mensagem.
- **Signature HMAC-SHA256 sobre RAW body**, comparação timing-safe (`signature.ts`). Não usar body parseado.
- **Sistema NÃO persiste vencedor, prêmio sorteado ou notificação de vencedor.** O sorteio acontece fora do sistema (terceiro). `participants.raffle_code` é só identificação da inscrição.
- Webhook em `apps/web/src/app/api/whatsapp/webhook/route.ts` faz: verify token (GET) + HMAC + dedup por `wamid` + rate limit + state machine + persist + send. Manter ordem.
- Schema Postgres em `whatsapp.*` (não `public.*`), 3 tabelas. RLS habilitada nas três.

## Envs

`WHATSAPP_*` em `apps/web/.env` (lista canônica em `packages/env/src/server.ts`).

Stack / scripts gerais → `../../../../CLAUDE.md`.
