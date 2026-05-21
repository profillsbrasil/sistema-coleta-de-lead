# 04 - Cliente WhatsApp (lib/whatsapp.ts)

Wrapper sobre a Graph API para enviar mensagens. Mantém o código limpo, tipado e centraliza tratamento de erros e rate limits.

## Decisão: SDK ou fetch direto?

**Decisão: fetch direto.**

Razões:
- A Graph API tem 4-5 endpoints relevantes para nosso caso — não justifica dependência
- SDKs de terceiros ficam desatualizados rápido (a Meta sobe versão da Graph API a cada 3 meses)
- Reduz superfície de bugs e tamanho do bundle serverless
- O `fetch` global do Node 18+ é suficiente

## Implementação completa

Arquivo: `lib/whatsapp.ts`

```ts
// ============================================
// Configuração
// ============================================
const API_VERSION = process.env.WHATSAPP_API_VERSION ?? "v23.0";
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;
const BASE_URL = `https://graph.facebook.com/${API_VERSION}/${PHONE_ID}`;

// Validação na boot do módulo: falha rápido se env vars estão faltando
if (!PHONE_ID || !TOKEN) {
  throw new Error(
    "WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN são obrigatórios"
  );
}

// ============================================
// Helper interno: POST para a Graph API
// ============================================
async function postToWhatsApp<T = unknown>(
  payload: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${BASE_URL}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("[whatsapp] API error", {
      status: res.status,
      body: errorBody,
      payload,
    });
    throw new WhatsAppApiError(res.status, errorBody);
  }

  return res.json() as Promise<T>;
}

// ============================================
// Erro customizado
// ============================================
export class WhatsAppApiError extends Error {
  constructor(public statusCode: number, public body: string) {
    super(`WhatsApp API error ${statusCode}: ${body}`);
    this.name = "WhatsAppApiError";
  }
}

// ============================================
// Resposta da API ao enviar mensagem
// ============================================
export interface SendMessageResponse {
  messaging_product: "whatsapp";
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

// ============================================
// Envio: TEXTO
// ============================================
/**
 * Envia uma mensagem de texto simples.
 *
 * @param to - Número E.164 sem o `+` (ex: "5511987654321")
 * @param body - Texto da mensagem (até 4096 chars)
 * @param previewUrl - Se true, gera preview do primeiro link encontrado
 */
export async function sendText(
  to: string,
  body: string,
  previewUrl = false
): Promise<SendMessageResponse> {
  if (body.length > 4096) {
    throw new Error("Texto excede 4096 caracteres");
  }
  return postToWhatsApp<SendMessageResponse>({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { preview_url: previewUrl, body },
  });
}

// ============================================
// Envio: BOTÕES INTERATIVOS (reply buttons)
// ============================================
export interface InteractiveButton {
  /** ID estável (até 256 chars) — usado no parsing da resposta */
  id: string;
  /** Texto visível do botão — máximo 20 chars */
  title: string;
}

export interface InteractiveButtonsOptions {
  /** Texto do cabeçalho (opcional, até 60 chars) */
  headerText?: string;
  /** Texto do rodapé (opcional, até 60 chars) */
  footerText?: string;
}

/**
 * Envia mensagem com até 3 botões de resposta rápida.
 *
 * Limites WhatsApp:
 * - Máximo 3 botões
 * - Título: 20 chars
 * - Body: 1024 chars
 * - Header (opcional): 60 chars
 * - Footer (opcional): 60 chars
 *
 * @param to - Número E.164 sem `+`
 * @param bodyText - Texto principal da mensagem
 * @param buttons - Array de 1 a 3 botões
 * @param options - Header e footer opcionais
 */
export async function sendInteractiveButtons(
  to: string,
  bodyText: string,
  buttons: InteractiveButton[],
  options?: InteractiveButtonsOptions
): Promise<SendMessageResponse> {
  if (buttons.length === 0 || buttons.length > 3) {
    throw new Error("Quantidade de botões deve ser entre 1 e 3");
  }
  if (bodyText.length > 1024) {
    throw new Error("Body excede 1024 caracteres");
  }

  // Truncar títulos a 20 chars (limite WhatsApp)
  const safeButtons = buttons.map((b) => ({
    type: "reply" as const,
    reply: {
      id: b.id,
      title: b.title.length > 20 ? b.title.slice(0, 20) : b.title,
    },
  }));

  return postToWhatsApp<SendMessageResponse>({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      ...(options?.headerText && {
        header: { type: "text", text: options.headerText.slice(0, 60) },
      }),
      body: { text: bodyText },
      ...(options?.footerText && {
        footer: { text: options.footerText.slice(0, 60) },
      }),
      action: { buttons: safeButtons },
    },
  });
}

// ============================================
// Envio: LISTA INTERATIVA (até 10 opções)
// ============================================
export interface ListSection {
  title: string;
  rows: Array<{
    id: string;
    title: string;       // até 24 chars
    description?: string; // até 72 chars
  }>;
}

/**
 * Envia mensagem com lista interativa (botão "Ver opções").
 * Use quando precisar de mais de 3 opções.
 */
export async function sendInteractiveList(
  to: string,
  bodyText: string,
  buttonText: string,
  sections: ListSection[]
): Promise<SendMessageResponse> {
  return postToWhatsApp<SendMessageResponse>({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: bodyText },
      action: {
        button: buttonText.slice(0, 20),
        sections,
      },
    },
  });
}

// ============================================
// Envio: TEMPLATE aprovado (fora da janela 24h)
// ============================================
export async function sendTemplate(
  to: string,
  templateName: string,
  languageCode = "pt_BR",
  components?: Array<Record<string, unknown>>
): Promise<SendMessageResponse> {
  return postToWhatsApp<SendMessageResponse>({
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components && { components }),
    },
  });
}

// ============================================
// Marcar mensagem como lida (opcional, melhora UX)
// ============================================
export async function markAsRead(messageId: string): Promise<void> {
  await postToWhatsApp({
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
  });
}
```

## Códigos de erro comuns e tratamento

A Graph API retorna erros estruturados. Mapeamento:

| Código | Significado | Como tratar |
|---|---|---|
| `131026` | Mensagem fora da janela de 24h | Use template aprovado |
| `131047` | Número não está no WhatsApp | NÃO retente; marque o usuário como inválido |
| `130429` | Rate limit (throughput) | Backoff exponencial: 1s, 2s, 4s |
| `131048` | Spam rate limit | PARE imediatamente — número pode ser banido |
| `368` | Conta temporariamente bloqueada | Abra ticket no support Meta |
| `131056` | Par (business, consumer) tem volume alto demais | Reduzir frequência |
| `133010` | Phone number not registered | Registre o número antes |

Para tratamento robusto, expanda `WhatsAppApiError`:

```ts
export class WhatsAppApiError extends Error {
  public readonly errorCode?: number;
  public readonly errorSubcode?: number;

  constructor(public statusCode: number, public body: string) {
    super(`WhatsApp API error ${statusCode}`);
    this.name = "WhatsAppApiError";
    try {
      const parsed = JSON.parse(body);
      this.errorCode = parsed?.error?.code;
      this.errorSubcode = parsed?.error?.error_subcode;
    } catch {
      // body não é JSON, ignorar
    }
  }

  get isRateLimit(): boolean {
    return this.errorCode === 130429 || this.statusCode === 429;
  }

  get isOutsideWindow(): boolean {
    return this.errorCode === 131026;
  }

  get isInvalidRecipient(): boolean {
    return this.errorCode === 131047 || this.errorCode === 133010;
  }
}
```

## Retry com backoff (opcional, para robustez extra)

Para o caso de uso (200 participantes, baixo volume), retry simples é suficiente. Para volumes maiores:

```ts
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (err instanceof WhatsAppApiError) {
        if (err.isInvalidRecipient) throw err; // não retenta destinatário inválido
        if (!err.isRateLimit && err.statusCode < 500) throw err; // só retenta 5xx e rate limit
      }
      if (attempt === maxAttempts) break;
      // Backoff exponencial com jitter: 1s, 2s, 4s ±25%
      const delay = Math.pow(2, attempt - 1) * 1000 * (0.75 + Math.random() * 0.5);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// Uso:
await withRetry(() => sendText(to, body));
```

## Botões: padrões recomendados

### IDs estáveis com versionamento

```ts
// ✅ BOM — id versionado, parsing trivial
{ id: "accept_terms_v1", title: "✅ Aceito" }
{ id: "decline_terms_v1", title: "❌ Não aceito" }

// ❌ RUIM — id genérico
{ id: "yes", title: "Sim" }
```

Vantagens do versionamento:
- Se mudar texto dos termos, mude para `accept_terms_v2`
- Histórico de quem aceitou v1 vs v2 fica claro
- Não vaza informação do estado interno

### Emojis no título

Aumentam contraste visual e conversão:

```ts
{ id: "accept_terms_v1", title: "✅ Aceito" }
{ id: "decline_terms_v1", title: "❌ Não aceito" }
```

Contam para o limite de 20 chars (cada emoji conta 1-2).

### Footer para metadados

Use footer para informações secundárias (versão, código, hashtag):

```ts
await sendInteractiveButtons(
  to,
  TERMS_TEXT,
  [/* botões */],
  { footerText: `Versão dos termos: v1 • Sorteio 2026` }
);
```

## Throughput e limites (Cloud API)

A documentação oficial *Cloud API Throughput* (`developers.facebook.com/documentation/business-messaging/whatsapp/throughput/`) afirma: 80 mensagens/segundo (mps) por padrão, escala automaticamente para até 1.000 mps.

Para 200 participantes em pico de evento (~5 msg/s), nem perto do limite.

## Testes unitários (opcional mas recomendado)

```ts
// __tests__/whatsapp.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendText, sendInteractiveButtons } from "@/lib/whatsapp";

describe("sendText", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        messaging_product: "whatsapp",
        contacts: [{ input: "5511987654321", wa_id: "5511987654321" }],
        messages: [{ id: "wamid.xxx" }],
      }),
    });
  });

  it("envia texto simples", async () => {
    await sendText("5511987654321", "Olá!");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/messages"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("rejeita texto > 4096 chars", async () => {
    await expect(sendText("55119", "a".repeat(5000))).rejects.toThrow();
  });
});

describe("sendInteractiveButtons", () => {
  it("rejeita mais de 3 botões", async () => {
    await expect(
      sendInteractiveButtons("5511987654321", "test", [
        { id: "1", title: "A" },
        { id: "2", title: "B" },
        { id: "3", title: "C" },
        { id: "4", title: "D" },
      ])
    ).rejects.toThrow();
  });

  it("trunca títulos longos a 20 chars", async () => {
    const longTitle = "a".repeat(30);
    await sendInteractiveButtons("5511987654321", "test", [
      { id: "1", title: longTitle },
    ]);
    const call = (fetch as any).mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.interactive.action.buttons[0].reply.title.length).toBe(20);
  });
});
```

## Checklist da Fase 4 (Cliente WhatsApp)

- [ ] `lib/whatsapp.ts` criado
- [ ] `sendText` funcional (até 4096 chars)
- [ ] `sendInteractiveButtons` funcional (até 3 botões, títulos até 20 chars)
- [ ] `WhatsAppApiError` customizado
- [ ] Variáveis de ambiente validadas na boot
- [ ] (Opcional) `sendTemplate` para mensagens fora da janela
- [ ] (Opcional) `withRetry` para robustez
- [ ] (Opcional) Testes unitários

Próximo: `references/05-state-machine.md` para a lógica conversacional.
