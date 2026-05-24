# WhatsApp Bot — Sorteio Profills Fispal 2026

Backend de captação via QR Code → WhatsApp. Isolado da coleta de leads dos vendedores.

## Mistakes / gotchas

- **LGPD: opt-in obrigatório** por botão `Aceito` / `Nao aceito`. Quem recusa fica em state `DECLINED` com **apenas `wa_id + declined_at + terms_version`** (sem nome/empresa).
- **Sem comando SAIR no bot** — eliminação de dados é por canal humano. Não inventar fluxo de opt-out via mensagem.
- **Signature HMAC-SHA256 sobre RAW body**, comparação timing-safe (`signature.ts`). Não usar body parseado.
- **Sistema NÃO persiste vencedor, prêmio sorteado ou notificação de vencedor.** O sorteio acontece fora do sistema (terceiro). `participants.raffle_code` é só identificação da inscrição.
- Webhook em `apps/web/src/app/api/whatsapp/webhook/route.ts` faz: verify token (GET) + HMAC + dedup por `wamid` + rate limit + state machine + persist + send. Manter ordem.
- Schema Postgres em `whatsapp.*` (não `public.*`), 3 tabelas. RLS habilitada nas três.

## States e comportamento

- **NON_PARTICIPANT:** cliente enviou mensagem não-keyword na primeira vez. Recebe redirect com botões de sorteio. Anti-loop via `redirect_sent_at` (cooldown 4h default). Keyword ou botão `want_to_participate` faz transição para `AWAITING_CONSENT`.
- **DECLINED + mensagem não-keyword:** envia redirect (não reoffer). Reoffer só com keyword ou botão `want_to_participate`.
- **`redirect_sent_at`:** setado pelo webhook (`route.ts`) após enviar outbound redirect — a state machine retorna `participantPatch: null` nesse caso; o webhook detecta pelo botão `want_to_participate` na resposta.

## Envs

`WHATSAPP_*` em `apps/web/.env` (lista canônica em `packages/env/src/server.ts`).
Redirect/CTA: `WHATSAPP_REDIRECT_VENDOR_PHONE`, `WHATSAPP_REDIRECT_EVENT_START`, `WHATSAPP_REDIRECT_EVENT_END`. **Não existe env de nome de vendedor** — o número é o canal Profills; comunicação não cita pessoa.

Stack / scripts gerais → `../../../../CLAUDE.md`.
