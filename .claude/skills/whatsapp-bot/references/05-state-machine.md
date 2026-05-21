# 05 - Máquina de Estados da Conversa (lib/state-machine.ts)

O cérebro do bot. Recebe cada mensagem do usuário, identifica em qual etapa da conversa ele está, valida a entrada e dispara a próxima ação.

## Diagrama de estados

```
                    ┌─────────────┐
   primeira msg ──→ │   INITIAL   │
                    └──────┬──────┘
                           │ bot envia boas-vindas + botões termos
                           ▼
                    ┌─────────────┐
                    │ TERMS_SENT  │
                    └──┬─────┬────┘
              recusou  │     │  aceitou
                       ▼     ▼
              ┌──────────┐  ┌────────────────┐
              │ DECLINED │  │ AWAITING_NAME  │
              └──────────┘  └────────┬───────┘
                                     │ nome válido
                                     ▼
                            ┌────────────────┐
                            │ AWAITING_EMAIL │
                            └────────┬───────┘
                                     │ email válido + gera código
                                     ▼
                            ┌────────────────┐
                            │   COMPLETED    │
                            └────────────────┘
```

Estados terminais: `COMPLETED`, `DECLINED`. Comando `SAIR` deleta o registro em qualquer estado (direito de exclusão LGPD).

## Implementação completa

Arquivo: `lib/state-machine.ts`

```ts
import crypto from "node:crypto";
import { z } from "zod";
import { supabaseAdmin } from "./supabase";
import { sendText, sendInteractiveButtons } from "./whatsapp";
import { TERMS_TEXT, TERMS_VERSION } from "./lgpd";
import type { WAMessage } from "@/app/api/webhook/whatsapp/route";
import type { Participant } from "@/types/database";

// ============================================
// Schemas de validação
// ============================================
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Email inválido")
  .max(254, "Email muito longo");

const nameSchema = z
  .string()
  .trim()
  .min(2, "Nome muito curto")
  .max(80, "Nome muito longo")
  // Rejeita nomes que são só números/símbolos
  .refine(
    (v) => /[a-zA-ZÀ-ÿ]/.test(v),
    "Nome deve conter pelo menos uma letra"
  );

// ============================================
// Entry point: processa uma mensagem recebida
// ============================================
export async function processIncomingMessage(
  msg: WAMessage,
  _phoneId: string
): Promise<void> {
  const phone = msg.from;

  // -------------------------------------------
  // 1. Idempotência: já processamos este wamid?
  // -------------------------------------------
  const { data: dup } = await supabaseAdmin
    .from("received_messages")
    .select("wamid")
    .eq("wamid", msg.id)
    .maybeSingle();

  if (dup) {
    console.log(`[idempotency] wamid ${msg.id} já processado, ignorando`);
    return;
  }

  // Marcar IMEDIATAMENTE como processado.
  // Se algo falhar adiante, ainda assim não duplicamos.
  // Se preferir "best effort" (reprocessar em caso de erro), mova
  // este insert para o final da função.
  await supabaseAdmin
    .from("received_messages")
    .insert({
      wamid: msg.id,
      phone,
      raw_payload: msg as unknown as object,
    });

  // -------------------------------------------
  // 2. Buscar/criar participante
  // -------------------------------------------
  let participant = await getOrCreateParticipant(phone);

  // -------------------------------------------
  // 3. Comando universal: SAIR (direito LGPD)
  // -------------------------------------------
  const messageText = (msg.text?.body ?? "").trim().toLowerCase();
  if (messageText === "sair" || messageText === "excluir") {
    await supabaseAdmin.from("participants").delete().eq("phone", phone);
    await sendText(
      phone,
      "✅ Seus dados foram completamente excluídos do nosso sistema.\n\n" +
        "Obrigado por participar! Se mudar de ideia, basta nos chamar de novo."
    );
    console.log(`[lgpd] Dados deletados para phone=${phone}`);
    return;
  }

  // -------------------------------------------
  // 4. Comando: STATUS (consulta dados sem deletar)
  // -------------------------------------------
  if (messageText === "status" || messageText === "meu codigo" || messageText === "meu código") {
    if (participant.current_state === "COMPLETED" && participant.raffle_code) {
      await sendText(
        phone,
        `Seus dados:\n\n👤 Nome: ${participant.name}\n📧 Email: ${participant.email}\n🎫 Código: *${participant.raffle_code}*`
      );
    } else {
      await sendText(
        phone,
        `Você ainda não completou seu cadastro. Estado atual: ${participant.current_state}`
      );
    }
    return;
  }

  // -------------------------------------------
  // 5. Despacho por estado
  // -------------------------------------------
  switch (participant.current_state) {
    case "INITIAL":
      await handleInitial(participant);
      break;
    case "TERMS_SENT":
      await handleTermsResponse(participant, msg);
      break;
    case "AWAITING_NAME":
      await handleName(participant, msg);
      break;
    case "AWAITING_EMAIL":
      await handleEmail(participant, msg);
      break;
    case "COMPLETED":
      await handleCompleted(participant);
      break;
    case "DECLINED":
      await handleDeclined(participant, msg);
      break;
    default:
      console.warn(
        `[state-machine] Estado desconhecido: ${participant.current_state}`
      );
  }

  // Atualizar timestamp da última mensagem
  await supabaseAdmin
    .from("participants")
    .update({ last_message_at: new Date().toISOString() })
    .eq("phone", phone);
}

// ============================================
// Buscar ou criar participante
// ============================================
async function getOrCreateParticipant(phone: string): Promise<Participant> {
  const { data: existing } = await supabaseAdmin
    .from("participants")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (existing) return existing as Participant;

  const { data: created, error } = await supabaseAdmin
    .from("participants")
    .insert({ phone, current_state: "INITIAL" })
    .select("*")
    .single();

  if (error) {
    // Race condition: outra invocação criou simultaneamente.
    // Tenta buscar de novo.
    if (error.code === "23505") {
      const { data: retry } = await supabaseAdmin
        .from("participants")
        .select("*")
        .eq("phone", phone)
        .single();
      if (retry) return retry as Participant;
    }
    throw error;
  }

  return created as Participant;
}

// ============================================
// Handler: INITIAL → envia termos
// ============================================
async function handleInitial(p: Participant): Promise<void> {
  await sendText(
    p.phone,
    `👋 Olá! Bem-vindo(a) ao nosso sorteio.\n\n` +
      `Antes de continuar, precisamos do seu consentimento para coletar alguns dados.`
  );

  await sendInteractiveButtons(
    p.phone,
    TERMS_TEXT,
    [
      { id: "accept_terms_v1", title: "✅ Aceito" },
      { id: "decline_terms_v1", title: "❌ Não aceito" },
    ],
    { footerText: `Versão dos termos: ${TERMS_VERSION}` }
  );

  await supabaseAdmin
    .from("participants")
    .update({ current_state: "TERMS_SENT" })
    .eq("phone", p.phone);
}

// ============================================
// Handler: TERMS_SENT → processa aceite
// ============================================
async function handleTermsResponse(
  p: Participant,
  msg: WAMessage
): Promise<void> {
  const buttonId = msg.interactive?.button_reply?.id;
  const textLower = (msg.text?.body ?? "").trim().toLowerCase();

  // Aceito: clicou no botão OU mandou texto compatível
  const accepted =
    buttonId === "accept_terms_v1" ||
    ["aceito", "sim", "concordo", "ok", "s", "yes"].includes(textLower);

  // Recusou: clicou no botão OU mandou texto compatível
  const declined =
    buttonId === "decline_terms_v1" ||
    ["não aceito", "nao aceito", "recuso", "não", "nao", "n", "no"].includes(
      textLower
    );

  if (accepted) {
    await supabaseAdmin
      .from("participants")
      .update({
        current_state: "AWAITING_NAME",
        terms_accepted_at: new Date().toISOString(),
        terms_version: TERMS_VERSION,
        terms_text_snapshot: TERMS_TEXT,
      })
      .eq("phone", p.phone);

    await sendText(
      p.phone,
      "Ótimo! 🙌\n\nAgora, por favor, me diga seu *nome completo*:"
    );
    return;
  }

  if (declined) {
    await supabaseAdmin
      .from("participants")
      .update({ current_state: "DECLINED" })
      .eq("phone", p.phone);

    await sendText(
      p.phone,
      "Tudo certo, sem problemas. Você não será cadastrado(a) no sorteio.\n\n" +
        "Se mudar de ideia antes do evento, é só nos chamar de novo. 🎈"
    );
    return;
  }

  // Resposta não reconhecida: reenvia botões
  await sendText(
    p.phone,
    "Não consegui entender. Por favor, escolha uma das opções abaixo:"
  );
  await sendInteractiveButtons(p.phone, TERMS_TEXT, [
    { id: "accept_terms_v1", title: "✅ Aceito" },
    { id: "decline_terms_v1", title: "❌ Não aceito" },
  ]);
}

// ============================================
// Handler: AWAITING_NAME
// ============================================
async function handleName(p: Participant, msg: WAMessage): Promise<void> {
  const raw = msg.text?.body ?? "";
  const parsed = nameSchema.safeParse(raw);

  if (!parsed.success) {
    await sendText(
      p.phone,
      `Hmm, esse nome não parece válido. ${parsed.error.errors[0]?.message ?? ""}\n\nPode me mandar seu *nome completo* novamente?`
    );
    return;
  }

  await supabaseAdmin
    .from("participants")
    .update({
      name: parsed.data,
      current_state: "AWAITING_EMAIL",
    })
    .eq("phone", p.phone);

  const firstName = parsed.data.split(" ")[0];
  await sendText(
    p.phone,
    `Prazer, *${firstName}*! 👋\n\nAgora preciso do seu *e-mail*:`
  );
}

// ============================================
// Handler: AWAITING_EMAIL
// ============================================
async function handleEmail(p: Participant, msg: WAMessage): Promise<void> {
  const raw = (msg.text?.body ?? "").trim();
  const parsed = emailSchema.safeParse(raw);

  if (!parsed.success) {
    await sendText(
      p.phone,
      `Esse e-mail não parece válido. ${parsed.error.errors[0]?.message ?? ""}\n\n` +
        "Por favor, envie no formato `nome@dominio.com`:"
    );
    return;
  }

  // Gerar código único de 6 dígitos
  const raffleCode = await generateUniqueRaffleCode();

  await supabaseAdmin
    .from("participants")
    .update({
      email: parsed.data,
      raffle_code: raffleCode,
      current_state: "COMPLETED",
    })
    .eq("phone", p.phone);

  await sendText(
    p.phone,
    `🎉 *Pronto! Você está participando do sorteio!*\n\n` +
      `🎫 Seu código exclusivo é:\n\n*${raffleCode}*\n\n` +
      `📜 *Regras do sorteio:*\n` +
      `• O sorteio será realizado ao vivo durante o evento\n` +
      `• Guarde bem este código — ele é único e intransferível\n` +
      `• O ganhador será notificado neste mesmo WhatsApp\n` +
      `• Boa sorte! 🍀\n\n` +
      `💡 _A qualquer momento você pode enviar:_\n` +
      `• *STATUS* para ver seus dados\n` +
      `• *SAIR* para excluir seus dados`
  );
}

// ============================================
// Handler: COMPLETED → usuário já participou
// ============================================
async function handleCompleted(p: Participant): Promise<void> {
  await sendText(
    p.phone,
    `Você já está participando do sorteio! 🎉\n\n` +
      `🎫 Seu código: *${p.raffle_code}*\n\n` +
      `Aguarde o resultado durante o evento. Boa sorte! 🍀`
  );
}

// ============================================
// Handler: DECLINED → usuário recusou
// ============================================
async function handleDeclined(p: Participant, msg: WAMessage): Promise<void> {
  const text = (msg.text?.body ?? "").trim().toLowerCase();

  // Se mandar "participar", reinicia o fluxo
  if (text === "participar" || text === "quero participar") {
    await supabaseAdmin
      .from("participants")
      .update({ current_state: "INITIAL" })
      .eq("phone", p.phone);
    // Reprocessa como se fosse a primeira mensagem
    await handleInitial(p);
    return;
  }

  await sendText(
    p.phone,
    `Você optou por não participar do sorteio.\n\n` +
      `Se mudar de ideia, envie *PARTICIPAR* para começar o cadastro.`
  );
}

// ============================================
// Geração de código único de 6 dígitos
// ============================================
async function generateUniqueRaffleCode(): Promise<string> {
  // Tentamos até 10 vezes (probabilidade de colisão para 200 códigos em 10^6
  // é ~0.02%; 10 tentativas é mais que suficiente).
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = crypto
      .randomInt(0, 1_000_000)
      .toString()
      .padStart(6, "0");

    const { data } = await supabaseAdmin
      .from("participants")
      .select("id")
      .eq("raffle_code", code)
      .maybeSingle();

    if (!data) return code;
  }

  throw new Error(
    "Falha ao gerar código único após 10 tentativas. " +
      "Possível esgotamento do espaço de códigos."
  );
}
```

## Sobre `crypto.randomInt`

`crypto.randomInt(0, 1_000_000)` retorna inteiro **uniformemente distribuído** em `[0, 999999]`, usando o gerador criptográfico do SO. `Math.random()` NÃO tem essa garantia e tem viés conhecido.

Probabilidade de colisão (paradoxo do aniversário):
- 100 códigos em 10⁶ → 0,5% chance de alguma colisão
- 200 códigos em 10⁶ → 2% chance de alguma colisão
- 500 códigos em 10⁶ → 11% chance de alguma colisão

Por isso fazemos o retry até 10 vezes. A constraint UNIQUE no banco garante a invariante mesmo em race condition.

## Race condition no `getOrCreateParticipant`

Se dois webhooks chegarem para o mesmo número ao MESMO tempo (improvável mas possível), ambos podem falhar no select e tentar inserir, causando erro de constraint única.

Tratamento: capturamos código `23505` (Postgres unique violation) e re-buscamos. Solução elegante para um cenário raro.

Alternativa mais robusta seria usar `upsert`:

```ts
const { data, error } = await supabaseAdmin
  .from("participants")
  .upsert(
    { phone, current_state: "INITIAL" },
    { onConflict: "phone", ignoreDuplicates: false }
  )
  .select("*")
  .single();
```

Mas `upsert` com `ignoreDuplicates: false` sobrescreve dados existentes — perigoso se já houver estado. Por isso o padrão select-then-insert com retry é mais seguro.

## Pegadinhas de fluxo

### Usuário muda de ideia no meio

Se está em `AWAITING_EMAIL` e manda `SAIR`, o comando universal pega antes do despacho por estado. Funciona.

### Usuário manda áudio/imagem em vez de texto

Em qualquer estado que espera texto, `msg.text?.body` será `undefined`. As validações Zod vão falhar e o handler vai pedir de novo. Comportamento OK.

Para melhorar UX:

```ts
if (msg.type !== "text" && msg.type !== "interactive") {
  await sendText(
    p.phone,
    "Por favor, me envie apenas texto. Áudios e imagens não são suportados."
  );
  return;
}
```

Adicione no início de `processIncomingMessage`.

### Estado órfão: usuário sumiu em `AWAITING_NAME`

Sem cleanup, o registro fica no banco com estado incompleto. Para limpar após o evento:

```sql
delete from participants
where current_state in ('INITIAL', 'TERMS_SENT', 'AWAITING_NAME', 'AWAITING_EMAIL')
  and updated_at < now() - interval '7 days';
```

## Estendendo a máquina (futuros eventos)

Para adicionar uma nova etapa (ex: pedir cidade do participante):

1. Adicione novo estado no enum check: `AWAITING_CITY`
2. Adicione handler `handleCity`
3. Adicione case no switch
4. Atualize transição: `handleEmail` agora vai para `AWAITING_CITY` (em vez de `COMPLETED`)
5. `handleCity` vai para `COMPLETED` após validar

A estrutura modular facilita.

## Testes manuais (que rodar no celular)

Veja a checklist completa em `references/08-testing.md`. Resumo do fluxo feliz:

1. Manda primeira mensagem → recebe boas-vindas + botões termos ✅
2. Clica "Aceito" → recebe "Qual seu nome?" ✅
3. Manda "João Silva" → recebe "Qual seu e-mail?" ✅
4. Manda "joao@example.com" → recebe código + regras ✅
5. Manda qualquer coisa de novo → recebe "Você já está participando" ✅
6. Manda "STATUS" → recebe dados + código ✅
7. Manda "SAIR" → recebe confirmação de exclusão ✅

## Checklist da Fase 5 (State Machine)

- [ ] `lib/state-machine.ts` criado
- [ ] Idempotência via `received_messages` no início
- [ ] Comandos universais `SAIR` e `STATUS` antes do despacho
- [ ] Validação Zod para nome e email
- [ ] Geração de código com `crypto.randomInt` + retry de colisão
- [ ] Handler para cada estado implementado
- [ ] Race condition em `getOrCreateParticipant` tratada
- [ ] Mensagens de erro amigáveis (não vazam estado interno)
- [ ] Snapshot dos termos salvo no momento do aceite

Próximo: `references/06-frontend-landing.md` para a página + QR Code.
