# 03 - Webhook do WhatsApp (Backend)

O coração do bot. Recebe eventos da Meta (mensagens recebidas, status de entrega) e despacha para a máquina de estados.

## Princípios obrigatórios

1. **Validar assinatura HMAC-SHA256** em todo POST. Sem isso o endpoint é spoofável.
2. **Ler o body como TEXTO CRU** antes de parsear. `JSON.parse` + `JSON.stringify` mudam a serialização e quebram o HMAC.
3. **Responder 200 OK em < 5s**. Processamento pesado vai em fire-and-forget.
4. **Idempotência via `wamid`** — Meta retenta entregas falhas por até 7 dias com backoff exponencial.

## Endpoint completo

Arquivo: `app/api/webhook/whatsapp/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { processIncomingMessage } from "@/lib/state-machine";

// Forçar runtime Node.js: 'crypto' não roda no Edge Runtime;
// e Edge pode reencode o body, quebrando o HMAC.
export const runtime = "nodejs";

// Timeout máximo da função (Vercel Hobby permite até 60s; nosso webhook deve
// responder em < 1s, mas damos margem para o fire-and-forget).
export const maxDuration = 30;

// ============================================
// GET: Verificação do webhook (handshake da Meta)
// ============================================
// A Meta chama este endpoint UMA VEZ ao configurar o webhook no painel,
// passando ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
// Devemos responder com o valor de hub.challenge em texto puro.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = sp.get("hub.mode");
  const token = sp.get("hub.verify_token");
  const challenge = sp.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("[webhook] Verificação bem-sucedida");
    // IMPORTANTE: text/plain, NÃO JSON
    return new NextResponse(challenge ?? "", { status: 200 });
  }

  console.warn("[webhook] Falha na verificação", { mode, hasToken: !!token });
  return new NextResponse("Forbidden", { status: 403 });
}

// ============================================
// POST: Recebe mensagens e status updates
// ============================================
export async function POST(req: NextRequest) {
  // 1. Ler body como TEXTO CRU — necessário para HMAC.
  //    NÃO fazer await req.json() aqui — quebra a assinatura.
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256") ?? "";

  // 2. Validar assinatura HMAC-SHA256 com o App Secret
  if (!isValidSignature(rawBody, signature, process.env.WHATSAPP_APP_SECRET!)) {
    console.warn("[webhook] Assinatura inválida — payload descartado");
    return new NextResponse("Invalid signature", { status: 401 });
  }

  // 3. Parsear JSON após validação
  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error("[webhook] JSON inválido");
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  // 4. ACK imediato. Processamento em fire-and-forget.
  //    Se devolvermos != 2xx ou demorarmos demais, a Meta retenta o MESMO
  //    evento com backoff exponencial por até 7 dias (gerando duplicação).
  void handleWebhookAsync(payload).catch((err) => {
    console.error("[webhook] Erro no processamento assíncrono:", err);
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

// ============================================
// Validação HMAC-SHA256 (timing-safe)
// ============================================
function isValidSignature(
  rawBody: string,
  header: string,
  appSecret: string
): boolean {
  if (!header.startsWith("sha256=")) return false;

  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");
  const received = header.slice("sha256=".length);

  // Buffers de tamanhos diferentes → timingSafeEqual lança exceção;
  // verificamos antes para evitar information leak via erro.
  if (expected.length !== received.length) return false;

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(received, "hex");
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

// ============================================
// Processamento assíncrono dos eventos
// ============================================
async function handleWebhookAsync(payload: WebhookPayload) {
  // Filtro defensivo: outros produtos da Meta podem usar a mesma estrutura
  if (payload.object !== "whatsapp_business_account") {
    console.log("[webhook] Object diferente, ignorando:", payload.object);
    return;
  }

  // entry, changes e messages são ARRAYS — itere TODOS.
  // Sob alta carga, a Meta faz batching de eventos no mesmo payload.
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;

      const value = change.value;
      const phoneId = value.metadata.phone_number_id;

      // Mensagens recebidas
      for (const message of value.messages ?? []) {
        try {
          await processIncomingMessage(message, phoneId);
        } catch (err) {
          // Log mas não propaga — uma mensagem ruim não pode derrubar o batch
          console.error("[webhook] Erro ao processar mensagem:", err, {
            wamid: message.id,
            from: message.from,
          });
        }
      }

      // Status updates (delivered, read, failed) — apenas log por enquanto
      for (const status of value.statuses ?? []) {
        console.log(`[status] ${status.id}: ${status.status}`);
        // Opcional: persistir em received_messages_status para auditoria
      }
    }
  }
}

// ============================================
// Types do payload do WhatsApp
// ============================================
interface WebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      field: string;
      value: {
        messaging_product: "whatsapp";
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: Array<WAMessage>;
        statuses?: Array<{
          id: string;
          status: "sent" | "delivered" | "read" | "failed";
          timestamp: string;
          recipient_id: string;
        }>;
      };
    }>;
  }>;
}

export interface WAMessage {
  from: string;
  id: string;
  timestamp: string;
  type: "text" | "interactive" | "image" | "audio" | "document" | "button";
  text?: { body: string };
  interactive?: {
    type: "button_reply" | "list_reply";
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
}
```

## Estrutura do payload do WhatsApp (exemplo real)

Mensagem de texto recebida:

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "215589313241560883",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "15551797781",
              "phone_number_id": "7794189252778687"
            },
            "contacts": [
              {
                "profile": { "name": "Jessica Laverdetman" },
                "wa_id": "13557825698"
              }
            ],
            "messages": [
              {
                "from": "17863559966",
                "id": "wamid.HBgLMTc4NjM1NTk5NjYVAGHAYWYET688aASGNTI1QzZFQjhEMDk2QQA=",
                "timestamp": "1758254144",
                "text": { "body": "Hi!" },
                "type": "text"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

Resposta a botão interativo:

```json
{
  "messages": [
    {
      "from": "5511987654321",
      "id": "wamid.xxx",
      "timestamp": "1758254200",
      "type": "interactive",
      "interactive": {
        "type": "button_reply",
        "button_reply": {
          "id": "accept_terms_v1",
          "title": "✅ Aceito"
        }
      }
    }
  ]
}
```

Notas importantes:
- `from` é E.164 **sem `+`** (ex: `5511987654321`)
- `id` é o `wamid.*` — use como chave de idempotência
- `timestamp` é Unix epoch em string

## Por que `runtime = "nodejs"`?

Razões:
1. **`crypto.timingSafeEqual`** não está disponível no Edge Runtime
2. **Edge pode reencode o body** ao parsear (passar por middleware/transformações), quebrando o HMAC
3. **Não há benefício real do Edge aqui** — webhooks têm baixo volume e o Node serverless é mais simples

Edge faria sentido se tivéssemos centenas de webhooks/segundo, o que não é o caso.

## Por que `await req.text()` antes de tudo?

Se você fizer `await req.json()`, o Next.js faz `JSON.parse` internamente. Quando você tenta calcular HMAC depois (ex: pegando `JSON.stringify(payload)`), o resultado terá:
- Espaços diferentes (`{"a":1}` vs `{ "a": 1 }`)
- Ordem de chaves diferente
- Escapes diferentes em caracteres unicode

Qualquer uma dessas diferenças quebra a assinatura. **Sempre leia raw, valide HMAC, então parseie.**

## Por que `void handleWebhookAsync(payload).catch(...)`?

- A Meta tem um SLA implícito: se você não responder 2xx em alguns segundos, ela retenta
- Se o processamento (DB + API WhatsApp) demorar 3-5s, dá pra retornar 200 antes e processar em background
- O `void` indica intencionalmente que não estamos aguardando a Promise
- O `.catch` previne unhandled promise rejection (que pode crashar o processo)

**Limitação**: serverless functions na Vercel terminam após o response. Em teoria, o fire-and-forget pode ser cortado. Na prática, com `maxDuration: 30`, a Vercel mantém a função viva até o timeout — então fluxos curtos (1-3s) funcionam bem.

Para garantias mais fortes, use **`waitUntil`** do `@vercel/functions`:

```ts
import { waitUntil } from "@vercel/functions";

// dentro do POST:
waitUntil(handleWebhookAsync(payload));
return NextResponse.json({ ok: true });
```

`waitUntil` informa explicitamente a Vercel para não cortar a função até a promise terminar.

## Idempotência: por que e como

Cenários onde a Meta retransmite o mesmo evento:
- Seu servidor demorou para responder
- Seu servidor caiu durante o processamento
- A rede engasgou e o ACK não chegou

Sem idempotência, o usuário recebe a mesma mensagem 2-3 vezes, ou pior: 2 códigos de sorteio para a mesma pessoa.

**Implementação** (vai na `state-machine.ts`, mas o conceito vive aqui):

```ts
// Primeira coisa antes de processar qualquer mensagem
const { data: dup } = await supabaseAdmin
  .from("received_messages")
  .select("wamid")
  .eq("wamid", msg.id)
  .maybeSingle();

if (dup) {
  console.log(`[idempotency] wamid ${msg.id} já processado, ignorando`);
  return;
}

// Marcar como processado IMEDIATAMENTE (antes do processamento real)
await supabaseAdmin.from("received_messages").insert({
  wamid: msg.id,
  phone: msg.from,
  raw_payload: msg as unknown as object,
});

// Agora processa...
```

## Logging para debug

Mantenha logs estruturados — vão para a Vercel automaticamente:

```ts
console.log("[webhook]", "ação", { wamid, phone, state });
console.warn("[webhook]", "warning", { motivo });
console.error("[webhook]", "erro", err);
```

Acesse em **Vercel → Project → Logs → Realtime**.

## Pegadinhas comuns

### "Test funciona mas mensagens reais não chegam"

O botão **Test** no painel da Meta só dispara um evento sintético — não usa o pipeline real. Se ele funciona mas mensagens de verdade não chegam:

1. Você esqueceu de inscrever o app na WABA: `POST /{WABA_ID}/subscribed_apps`
2. O número de teste não está cadastrado em "Recipient phone numbers" (em Development mode)
3. O webhook caiu silenciosamente — confira logs da Vercel

### "Recebo evento mas não consigo responder"

- Token expirou (token temporário dura 24h) → use System User token permanente
- O `to` no envio precisa ser E.164 sem `+` (igual ao `from` que veio)
- A janela de 24h fechou → precisa template

### "HMAC sempre inválido"

- Está usando App Secret correto? (não confundir com Access Token)
- Está fazendo `await req.text()` antes de qualquer parse?
- O `runtime` está como `"nodejs"`?
- O middleware do Next está injetando algo no body? (verifique `middleware.ts`)

## Checklist da Fase 3 (Webhook)

- [ ] `app/api/webhook/whatsapp/route.ts` criado
- [ ] `runtime = "nodejs"` exportado
- [ ] GET handler implementado e testado (handshake responde challenge)
- [ ] POST handler implementado com validação HMAC
- [ ] Validação usa `timingSafeEqual` (não `===`)
- [ ] Body lido com `await req.text()` antes de qualquer parse
- [ ] Iteração em arrays `entry`, `changes`, `messages` (não objetos)
- [ ] Idempotência via `received_messages.wamid` implementada
- [ ] Fire-and-forget com `void` + `.catch` (ou `waitUntil`)
- [ ] Tipos TypeScript definidos para `WAMessage` e `WebhookPayload`

Próximo: `references/04-whatsapp-client.md` para a lib de envio de mensagens.
