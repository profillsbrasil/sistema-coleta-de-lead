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
