# WhatsApp Bot — Sorteio Profills Fispal 2026

Backend de captação via QR Code → WhatsApp. Isolado da coleta de leads dos vendedores.

## Mistakes / gotchas

- **LGPD: opt-in obrigatório** por botão `Aceito` / `Nao aceito`. Quem recusa fica em state `DECLINED` com **apenas `wa_id + declined_at + terms_version`** (sem nome/empresa).
- **Opt-out via keyword é REATIVO, NÃO destrutivo** (A1): keywords `PARAR|SAIR|CANCELAR|STOP|UNSUBSCRIBE|DESCADASTRAR` (word-boundary, sem acento, lowercase) marcam `participants.opted_out_at` + `opted_out_reason` e silenciam o bot — **NÃO deletam dado**. `VOLTAR` ou `RETORNAR` limpa a flag e reabre. Eliminação real de dados continua sendo apenas via DSR manual no admin. Precedência máxima: opt-out roda antes de sorteio/handoff.
- **Signature HMAC-SHA256 sobre RAW body**, comparação timing-safe (`signature.ts`). Não usar body parseado.
- **Sistema NÃO persiste vencedor, prêmio sorteado ou notificação de vencedor.** O sorteio acontece fora do sistema (terceiro). `participants.raffle_code` é só identificação da inscrição.
- **Webhook arch (B1+B2):** POST faz HMAC + parse e despacha `after(processMessageAsync)` — ACK 200 imediato. `processMessageAsync` começa por `claimInbound`, que abre transação, adquire `pg_advisory_xact_lock(hashtext(wa_id))`, carrega/cria participant (state=NEW), faz `INSERT messages ... ON CONFLICT (wamid) DO NOTHING RETURNING` — dedup atômico — e atualiza `participants.last_inbound_at` (usado pelo guard rail). 0 rows = duplicate, return. Pós-claim: rate limit, branches (mídia/opt-out/handoff), state machine, outbounds. NÃO duplicar log de inbound nos branches — `claimInbound` já gravou.
- **Sender (B3+B5):** `postMessage` aplica `AbortSignal.timeout(8000)` e retry 3× exp backoff (500/1500/4500ms ± 30% jitter). Retentável: HTTP 5xx, 429, Meta codes 130429/131056. Esgotou ou bateu 4xx não-retentável → `WhatsappSendPermanentError` (subclasse de `WhatsappSendError`, mantém compat). `loggedSend` (route.ts) captura `WhatsappSendPermanentError`, grava dead-letter row (`failed_at/code/reason`), loga `outbound_failed_dead_letter` e segue. Guard rail: antes do send, se `now - participant.last_inbound_at > 23h` → bloqueia (grava failed row com reason `blocked_outside_24h_window`, loga `outbound_blocked_outside_window`). Bot é 100% reativo; guard só dispara em bug.
- Schema Postgres em `whatsapp.*` (não `public.*`), 3 tabelas. RLS habilitada nas três.

## States e comportamento

- **Princípio: sorteio é exceção, não regra.** Cliente que entra em contato sem citar keyword (`sorteio`/`participar`) recebe `eventNotice` — mensagem de atendimento focada em "fale com a equipe", botão CTA URL nativo pra `wa.me/<vendor>`. **Não menciona sorteio.**
- **Fluxo do sorteio entra apenas via keyword** (`sorteio` ou `participar`, normalizado sem acento) ou via QR Code (texto pré-preenchido contém keyword).
- **NON_PARTICIPANT:** cliente comum (não-keyword na primeira interação). Recebe **1 envio único** de `eventNotice`; após isso silêncio permanente para esse `wa_id`. Controlado por `redirect_count` (≥1 = silêncio). Keyword `sorteio` sempre reabre fluxo, mesmo após silêncio. Sem cooldown — limite hard de 1 evita spam e custo desnecessário (A5).
- **DECLINED + keyword:** reabre fluxo (cliente mudou de ideia → AWAITING_CONSENT + welcome).
- **DECLINED + não-keyword:** mesma lógica de NON_PARTICIPANT (1 eventNotice e silêncio).
- **COMPLETED + qualquer mensagem:** responde `alreadyParticipated` (já tem botão CTA URL pra contato).
- **`wasEventNotice` no HandleResult:** state machine sinaliza ao webhook quando enviou eventNotice. Webhook usa esse flag pra setar `redirectSentAt` + incrementar `redirectCount`. Coluna mantém nome `redirect_*` por compatibilidade com schema antigo.
- **Botões removidos:** `want_to_participate` / `already_registered` não existem mais. Quem veio pelo sorteio digita keyword OU usa QR (que injeta keyword).

## Envs

`WHATSAPP_*` em `apps/web/.env` (lista canônica em `packages/env/src/server.ts`).
- `WHATSAPP_REDIRECT_VENDOR_PHONE`, `WHATSAPP_REDIRECT_EVENT_START/END` — usados pelo `eventNotice`. **Não existe env de nome de vendedor** — o número é o canal Profills; comunicação não cita pessoa.
- `NEXT_PUBLIC_WHATSAPP_LOGO_URL` — URL pública do logo Profills usada como header de imagem do `eventNotice` (opcional; sem ela a mensagem sai sem header).
- `NEXT_PUBLIC_WHATSAPP_WELCOME_IMAGE_URL` — banner do `welcome` (mensagem que abre o fluxo do sorteio).

Stack / scripts gerais → `../../../../CLAUDE.md`.
