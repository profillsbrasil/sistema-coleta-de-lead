# 08 - Testes Locais e Casos de Teste

A Meta exige HTTPS público no webhook — `localhost` não funciona. Aqui está o caminho mais rápido para testar tudo antes de subir em produção.

## Setup de tunneling com ngrok

### Instalação

```bash
# macOS / Linux
brew install ngrok

# ou via npm (qualquer SO)
npm install -g ngrok
```

### Autenticar (uma vez)

1. Crie conta gratuita em <https://ngrok.com>
2. Pegue o auth token em <https://dashboard.ngrok.com/get-started/your-authtoken>
3. Configure:
```bash
ngrok config add-authtoken <SEU_TOKEN>
```

### Rodar

Terminal 1 (Next.js):
```bash
npm run dev
# servidor em http://localhost:3000
```

Terminal 2 (ngrok):
```bash
ngrok http 3000
```

Saída esperada:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:3000
```

Use essa URL no painel Meta como Callback URL: `https://abc123.ngrok-free.app/api/webhook/whatsapp`.

### Limitação do free tier do ngrok

A URL muda a cada `ngrok http 3000`. Workarounds:

**Subdomain estático** (free tier permite 1):
```bash
ngrok http --domain=seu-sub.ngrok-free.app 3000
```

Reserve em <https://dashboard.ngrok.com/cloud-edge/domains>.

**Alternativa: Cloudflare Tunnel** (grátis, sem rotação):
```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:3000
```

Saída: `https://random-words.trycloudflare.com`.

## Reconfigurar webhook a cada novo tunnel

Cada vez que a URL do tunnel muda:
1. Vá em **WhatsApp → Configuration → Webhook**
2. Clique em **Edit** ao lado de Callback URL
3. Cole a nova URL
4. Cole o mesmo `WHATSAPP_VERIFY_TOKEN`
5. **Verify and save**

Se você reservou subdomínio estático no ngrok, faz isso uma vez só.

## Casos de teste obrigatórios

Antes de subir produção, rode TODOS estes casos com pelo menos um celular real:

### Caso 1: Primeiro acesso (fluxo feliz)
- **Ação**: escanear QR Code → clicar Participar → enviar mensagem
- **Esperado**: bot envia boas-vindas + botões de termos
- **Verificar**: tabela `participants` tem novo registro com `current_state = 'TERMS_SENT'`

### Caso 2: Aceitar termos
- **Ação**: clicar no botão "✅ Aceito"
- **Esperado**: bot pergunta "Qual seu nome?"
- **Verificar**: `current_state = 'AWAITING_NAME'`, `terms_accepted_at` preenchido, `terms_version = 'v1'`, `terms_text_snapshot` contém o texto

### Caso 3: Recusar termos
- **Ação**: novo número, clicar em "❌ Não aceito"
- **Esperado**: bot agradece, encerra
- **Verificar**: `current_state = 'DECLINED'`, `terms_accepted_at` é null, `name` e `email` são null

### Caso 4: Aceitar via texto (fallback)
- **Ação**: novo número, em vez de clicar no botão, digitar "aceito"
- **Esperado**: mesmo efeito do botão (state vai para AWAITING_NAME)
- **Verificar**: igual ao caso 2

### Caso 5: Resposta não reconhecida nos termos
- **Ação**: em `TERMS_SENT`, mandar "kkkk" ou "blá"
- **Esperado**: bot pede para escolher uma das opções e reenvia botões
- **Verificar**: `current_state` permanece `TERMS_SENT`

### Caso 6: Nome inválido (muito curto)
- **Ação**: em `AWAITING_NAME`, mandar "A" ou "Bo"
- **Esperado**: bot recusa, pede nome novamente
- **Verificar**: `name` permanece null, `current_state` permanece `AWAITING_NAME`

### Caso 7: Nome só com números
- **Ação**: em `AWAITING_NAME`, mandar "12345"
- **Esperado**: bot recusa, pede nome novamente
- **Verificar**: idem caso 6

### Caso 8: Nome válido
- **Ação**: em `AWAITING_NAME`, mandar "João Silva"
- **Esperado**: bot saúda pelo primeiro nome, pede e-mail
- **Verificar**: `name = 'João Silva'`, `current_state = 'AWAITING_EMAIL'`

### Caso 9: E-mail inválido
- **Ação**: em `AWAITING_EMAIL`, mandar "fulano@" ou "joão@"
- **Esperado**: bot recusa, pede formato correto
- **Verificar**: `email` permanece null, state permanece `AWAITING_EMAIL`

### Caso 10: E-mail válido (fluxo feliz finaliza)
- **Ação**: em `AWAITING_EMAIL`, mandar "joao@example.com"
- **Esperado**: bot envia código de 6 dígitos + regras do sorteio
- **Verificar**:
  - `email = 'joao@example.com'`
  - `raffle_code` preenchido com 6 dígitos
  - `current_state = 'COMPLETED'`

### Caso 11: Reenvio depois de COMPLETED
- **Ação**: usuário em `COMPLETED` manda qualquer coisa
- **Esperado**: bot responde "Você já está participando! Código: XXX"
- **Verificar**: state permanece `COMPLETED`, código não muda

### Caso 12: Comando STATUS
- **Ação**: usuário em `COMPLETED` manda "STATUS"
- **Esperado**: bot mostra nome, e-mail e código
- **Verificar**: resposta correta

### Caso 13: Comando SAIR (LGPD)
- **Ação**: usuário em qualquer estado manda "SAIR"
- **Esperado**: bot confirma exclusão
- **Verificar**: registro foi DELETADO da tabela `participants`

### Caso 14: Reativação após SAIR
- **Ação**: usuário que saiu manda nova mensagem
- **Esperado**: fluxo recomeça do zero (boas-vindas + termos)
- **Verificar**: novo registro criado em `INITIAL` → `TERMS_SENT`

### Caso 15: Idempotência (importante)
- **Ação**: forçar a Meta a retentar (difícil de simular; alternativa: mandar mesma mensagem 2x rapidamente)
- **Esperado**: segundo recebimento ignorado, sem mensagem duplicada
- **Verificar**: tabela `received_messages` tem 1 entry só (PK constraint)

### Caso 16: POST sem assinatura HMAC
- **Ação**: enviar curl direto sem header `X-Hub-Signature-256`
- **Esperado**: 401 Unauthorized

```bash
curl -X POST https://abc123.ngrok-free.app/api/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"object":"whatsapp_business_account","entry":[]}'
# Esperado: 401
```

### Caso 17: POST com assinatura inválida
- **Ação**: enviar curl com header HMAC errado
- **Esperado**: 401 Unauthorized

```bash
curl -X POST https://abc123.ngrok-free.app/api/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: sha256=deadbeef" \
  -d '{"object":"whatsapp_business_account","entry":[]}'
# Esperado: 401
```

### Caso 18: GET de verificação correto
- **Ação**: simular o handshake da Meta
- **Esperado**: 200 com o challenge no body

```bash
curl "https://abc123.ngrok-free.app/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=SEU_TOKEN&hub.challenge=teste123"
# Esperado: HTTP 200, body "teste123"
```

### Caso 19: GET com token errado
- **Ação**: simular handshake com token errado
- **Esperado**: 403 Forbidden

```bash
curl "https://abc123.ngrok-free.app/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=ERRADO&hub.challenge=teste"
# Esperado: HTTP 403
```

## Script de testes automatizados (opcional)

Para rodar todos os casos do webhook sem precisar do WhatsApp real:

`__tests__/webhook.test.ts`

```ts
import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/webhook/whatsapp/route";
import crypto from "node:crypto";

const APP_SECRET = "test-app-secret";
process.env.WHATSAPP_APP_SECRET = APP_SECRET;
process.env.WHATSAPP_VERIFY_TOKEN = "test-verify-token";

function makeSignedRequest(body: string): Request {
  const signature = crypto
    .createHmac("sha256", APP_SECRET)
    .update(body, "utf8")
    .digest("hex");
  return new Request("http://localhost/api/webhook/whatsapp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hub-signature-256": `sha256=${signature}`,
    },
    body,
  });
}

describe("webhook POST", () => {
  it("rejeita request sem assinatura", async () => {
    const req = new Request("http://localhost/api/webhook/whatsapp", {
      method: "POST",
      body: '{"object":"whatsapp_business_account","entry":[]}',
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it("rejeita request com assinatura inválida", async () => {
    const req = new Request("http://localhost/api/webhook/whatsapp", {
      method: "POST",
      headers: { "x-hub-signature-256": "sha256=deadbeef" },
      body: '{"object":"whatsapp_business_account","entry":[]}',
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it("aceita request com assinatura válida", async () => {
    const body = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [],
    });
    const req = makeSignedRequest(body);
    const res = await POST(req as any);
    expect(res.status).toBe(200);
  });

  it("retorna 400 para JSON inválido", async () => {
    const req = makeSignedRequest("not json");
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});
```

Rodar:
```bash
npm install -D vitest @vitest/ui
npx vitest
```

## Debugging: Como ver o que está rolando

### Logs da Vercel (em produção)

```
Vercel Dashboard → Project → Logs → Realtime
```

Filtros úteis:
- `[webhook]` para eventos do webhook
- `[whatsapp]` para envios
- `[state-machine]` para mudanças de estado
- `[idempotency]` para deduplicação

### Logs locais

`npm run dev` mostra os logs do servidor no terminal. Filtre com `grep`:

```bash
npm run dev 2>&1 | grep -E "\[webhook\]|\[whatsapp\]"
```

### Inspeção do banco em tempo real

Supabase Dashboard → **Table Editor → participants** — atualize a página depois de cada mensagem para ver mudanças de estado.

Para SQL ao vivo, use **SQL Editor**:

```sql
select phone, current_state, name, email, raffle_code, updated_at
from participants
order by updated_at desc
limit 10;
```

### Vendo payloads completos

Em `received_messages` ficam todos os payloads brutos:

```sql
select wamid, phone, received_at, raw_payload
from received_messages
order by received_at desc
limit 5;
```

`raw_payload` é JSON — abra no Supabase para inspecionar.

## Simular envio sem WhatsApp real (avançado)

Para testar a máquina de estados sem mandar mensagem real, crie um endpoint de debug protegido:

`app/api/debug/simulate/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { processIncomingMessage } from "@/lib/state-machine";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Só funciona em development
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = await req.json();
  // Espera: { phone, text } OU { phone, buttonId }
  const msg = {
    from: body.phone,
    id: `wamid.debug-${Date.now()}-${Math.random()}`,
    timestamp: Math.floor(Date.now() / 1000).toString(),
    type: body.buttonId ? "interactive" : "text",
    ...(body.text && { text: { body: body.text } }),
    ...(body.buttonId && {
      interactive: {
        type: "button_reply",
        button_reply: { id: body.buttonId, title: "Test" },
      },
    }),
  };

  await processIncomingMessage(msg as any, "debug-phone-id");
  return NextResponse.json({ ok: true });
}
```

Uso (apenas em dev):
```bash
# Simula primeira mensagem
curl -X POST http://localhost:3000/api/debug/simulate \
  -H "Content-Type: application/json" \
  -d '{"phone":"5511987654321","text":"oi"}'

# Simula clique em "Aceito"
curl -X POST http://localhost:3000/api/debug/simulate \
  -H "Content-Type: application/json" \
  -d '{"phone":"5511987654321","buttonId":"accept_terms_v1"}'

# Simula envio do nome
curl -X POST http://localhost:3000/api/debug/simulate \
  -H "Content-Type: application/json" \
  -d '{"phone":"5511987654321","text":"João Silva"}'
```

⚠️ **Removha este endpoint antes do deploy ou deixe protegido por NODE_ENV.**

## Stress test (opcional)

Para validar que aguenta o pico do evento:

```bash
npm install -g autocannon
```

```bash
# Simula 50 conexões simultâneas por 10 segundos no GET de verificação
autocannon -c 50 -d 10 \
  "https://abc123.ngrok-free.app/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=SEU_TOKEN&hub.challenge=stress"
```

Para 200 participantes em pico, autocannon mostrando latência mediana < 200ms é mais que suficiente.

## Checklist da Fase 8 (Testes)

- [ ] ngrok ou Cloudflare Tunnel rodando
- [ ] URL do tunnel configurada como Callback no Meta
- [ ] Casos 1-14 testados manualmente com celular real
- [ ] Caso 15 (idempotência) verificado
- [ ] Casos 16-19 (segurança HMAC) verificados via curl
- [ ] Logs sendo lidos durante os testes
- [ ] (Opcional) Testes automatizados Vitest passando
- [ ] (Opcional) Endpoint de debug `/api/debug/simulate` para iteração rápida

Próximo: `references/09-deployment.md` para subir em produção.
