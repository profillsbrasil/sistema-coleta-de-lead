# 10 - Troubleshooting

Erros mais comuns e como resolver, organizados por sintoma.

## 🔴 Setup da Meta

### Mensagens de erro da Meta UI são falsos positivos com frequência

A interface do Business Manager exibe erros que mentem ou são genéricos demais. Padrões observados:

| Erro exibido | Realidade frequente |
|---|---|
| "Você escolheu um nome de usuário do sistema inválido" | Pode aparecer mesmo com nome aceito. **Recarregue a lista** — o User pode ter sido criado |
| "O usuário administrador deve ter sido criado há mais de 7 dias para criar outros admins" | Pode ser bypassado em casos de primeiro admin do portfólio. **Recarregue e verifique** |
| "Verificar token" falha sem detalhes | Geralmente o domínio é alcançável mas o GET handler retorna JSON em vez de texto puro |

**Regra geral:** depois de um erro da UI da Meta, **sempre recarregue a página e verifique o estado real** antes de tentar novamente. Você economiza tempo importante.

### "Nome inválido" ao criar System User

A Meta tem blacklist de termos que rejeita silenciosamente:

- `WhatsApp` (proteção de marca)
- `Bot` (política de transparência)
- `Sorteio`, `Promoção` (política de promoções; Meta restringe para evitar abuso)
- Possivelmente sua marca/empresa também, se cair em alguma flag

**Solução:** use nomes técnicos neutros: `Integracao Backend`, `API Service`, `Servico Eventos`. Função do System User é interna, nome não precisa ser bonito.

### Não consigo achar "Usuários do sistema" na sidebar do Business Manager

Você provavelmente está em **Pessoas** (humanos com login Facebook) ou em **Parceiros** (outras empresas). **Usuários do sistema** é um item separado no submenu de Usuários, geralmente o terceiro item, às vezes truncado visualmente.

URL direta: `https://business.facebook.com/latest/settings/system_users?business_id=<SEU_PORTFOLIO_ID>`

### "Verify and save" falha na configuração do webhook

**Sintomas**: ao clicar em "Verify and save" no painel da Meta, recebe erro genérico.

**Causas possíveis**:
1. URL do webhook não está acessível publicamente
   - Confira que ngrok está rodando
   - Confira que o Next.js está rodando em `localhost:3000`
   - Teste a URL no navegador
2. GET handler não retorna o challenge corretamente
   - Deve retornar texto puro com o valor de `hub.challenge`
   - NÃO retornar JSON
3. `WHATSAPP_VERIFY_TOKEN` na Vercel é diferente do que você digitou no painel

**Como debugar**:
```bash
# Simule a chamada da Meta
curl -v "https://abc123.ngrok-free.app/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=SEU_TOKEN&hub.challenge=test123"
```

Resposta esperada: HTTP 200, body `test123`, sem aspas, sem JSON wrapper.

### Token de acesso expira sozinho

**Sintoma**: depois de 24h ou de uns dias, mensagens param de ser enviadas com erro 190 ou OAuth.

**Causa**: você está usando o token TEMPORÁRIO do Quick Start em vez do System User token.

**Solução**: gere token permanente (passo 7 de `references/01-meta-setup.md`):
1. Business Settings → System Users → Add → Admin
2. Add Assets: app + WhatsApp Business Account
3. Generate New Token → "Never" expire
4. Permissões: `whatsapp_business_messaging` + `whatsapp_business_management`

### "phone_number_id" não funciona

**Sintoma**: erro 100 ou 132000 ao tentar enviar mensagem.

**Causa**: provavelmente confundiu o **Phone Number ID** com o **número do telefone**.

- Phone Number ID: inteiro tipo `123456789012345` (15 dígitos)
- Número: `5511987654321` (E.164 sem +)

O Phone Number ID vai na URL: `graph.facebook.com/v25.0/{PHONE_NUMBER_ID}/messages`.
O número do destinatário vai no body: `"to": "5511987654321"`.

## 🔴 Webhook

### Mandei mensagem pro Test Number e o webhook não recebeu nada

Comportamento conhecido do Test Number da Meta (`+1 555 675 9095`):

**Mensagens enviadas pelo usuário só são retransmitidas para o webhook se o bot já tiver enviado pelo menos uma mensagem antes.** Antes disso, a Meta engole o inbound silenciosamente.

**Solução**: dispare um template `hello_world` direto via curl PARA O TESTER, antes de pedir pro tester mandar mensagem:

```bash
curl -X POST "https://graph.facebook.com/v25.0/<PHONE_NUMBER_ID>/messages" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "5551996474579",
    "type": "template",
    "template": {"name": "hello_world", "language": {"code": "en_US"}}
  }'
```

Depois que o tester recebe o "Hello World", **ele responde nessa mesma conversa** e a mensagem chega ao webhook normalmente.

Isso **não vale em números reais (Live)** — apenas no Test Number.

### "Funcionou no Test mas mensagens reais não chegam"

**Sintoma clássico**: o botão **Test** no painel funciona, mas mensagens enviadas pelo celular não disparam o webhook.

**Causa**: o app não está inscrito na WhatsApp Business Account (WABA).

**Solução**: execute:

```bash
curl -X POST \
  "https://graph.facebook.com/v25.0/<WABA_ID>/subscribed_apps" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Verifique:

```bash
curl -X GET \
  "https://graph.facebook.com/v25.0/<WABA_ID>/subscribed_apps" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

A resposta deve listar seu app. Se vier vazio, repita o POST.

### Assinatura HMAC sempre inválida (401)

**Sintomas**: nos logs aparece "Assinatura inválida — payload descartado" para toda mensagem.

**Causas possíveis**:

1. **Está usando `App ID` em vez de `App Secret`**.
   - App ID é público (aparece no topo do app), App Secret está em Settings → Basic → Show.

2. **Está fazendo `await req.json()` antes da validação**.
   - Após `req.json()`, o body é consumido — você não consegue mais ler como texto cru
   - Solução: SEMPRE `const rawBody = await req.text()` primeiro, depois `JSON.parse(rawBody)` se passar na validação

3. **Está no Edge Runtime**.
   - Edge pode reencode body, quebrando HMAC
   - Solução: `export const runtime = "nodejs"`

4. **Middleware do Next.js está alterando o body**.
   - Verifique `middleware.ts` — se tiver, exclua o webhook do matcher

5. **Variável de ambiente errada**.
   - `WHATSAPP_APP_SECRET` na Vercel está com o valor correto? (sem espaços no início/fim, sem aspas)

**Como verificar**:

Adicione log temporário (REMOVA depois):
```ts
console.log("[DEBUG]", {
  rawBodyLength: rawBody.length,
  signatureHeader: signature,
  expectedSignature: crypto
    .createHmac("sha256", process.env.WHATSAPP_APP_SECRET!)
    .update(rawBody, "utf8")
    .digest("hex"),
});
```

Compare o expected com o received. Se forem diferentes em comprimento, o problema é o body. Se mesmo comprimento mas valores diferentes, o problema é o secret.

### Webhook recebe a mesma mensagem várias vezes

**Sintomas**: usuário manda 1 mensagem e o bot responde 2-3 vezes; tabela `received_messages` tem entradas duplicadas (se PK não estiver configurada).

**Causa**: você não está implementando idempotência por `wamid`.

**Solução**: confirme que:
1. Tabela `received_messages` tem `wamid` como PRIMARY KEY (não só UNIQUE)
2. No início de `processIncomingMessage`, você verifica:
   ```ts
   const { data: dup } = await supabaseAdmin
     .from("received_messages")
     .select("wamid")
     .eq("wamid", msg.id)
     .maybeSingle();
   if (dup) return;
   ```
3. E insere ANTES de processar:
   ```ts
   await supabaseAdmin.from("received_messages").insert({ wamid: msg.id, ... });
   ```

### Webhook timeout (504)

**Sintomas**: logs mostram "Function execution timed out" ou similar.

**Causa**: processamento síncrono demora demais.

**Solução**:
1. Use fire-and-forget: `void handleAsync(payload).catch(console.error)`
2. Responda 200 OK IMEDIATAMENTE
3. Configure `export const maxDuration = 30` no route.ts
4. Para garantir que serverless não corta: use `waitUntil` do `@vercel/functions`

```ts
import { waitUntil } from "@vercel/functions";
waitUntil(handleAsync(payload));
return NextResponse.json({ ok: true });
```

## 🔴 Envio de mensagens

### Erro 131030: "Recipient phone number not in allowed list" (nono dígito brasileiro)

**Sintoma**: webhook recebe mensagem do usuário normalmente, bot tenta responder e falha com:
```
WhatsApp API error 400:
{"error":{"message":"(#131030) Recipient phone number not in allowed list", ...}}
```

**Causa #1 (mais comum) — você está em Test Number e o destinatário não foi cadastrado**: adicione o número via painel Meta → API Setup → "Até" → Gerenciar lista de números.

**Causa #2 (sutil, fácil de não ver) — nono dígito brasileiro**: o `wa_id` recebido no payload pode estar em **formato canônico do WhatsApp** (12 dígitos, sem o 9 do celular brasileiro antigo), enquanto seu cadastro tem 13 dígitos (com 9). A Meta vê como números diferentes.

Exemplo:
- Você cadastrou: `+55 51 99647-4579` (13 dígitos)
- Webhook entregou: `wa_id: 555196474579` (12 dígitos, sem o 9)
- A Meta rejeita o outbound porque "555196474579" não está na allow list

**Solução**:
1. No painel Meta, adicione **a versão sem o 9** na allow list (ou ambas; você tem 5 vagas no Test Number)
2. No código, **NÃO normalize** o `wa_id` no client — use exatamente como veio do webhook
3. Se o número é novo (pós-2014, SP/MG/RJ/etc), provavelmente não verá esse problema. RS/SC/PR têm muitos números antigos.

### Erro 131026: "Message Undeliverable"

**Causa**: você está tentando enviar mensagem não-template para um usuário com quem não tem janela de 24h aberta.

**Solução**:
- Confirme que o usuário enviou uma mensagem nas últimas 24h
- Se a janela fechou, use template aprovado: `sendTemplate(to, "nome_do_template", "pt_BR")`

### Erro 131047: "Re-engagement message"

**Causa**: similar ao 131026 — janela 24h fechada.

**Solução**: idem acima.

### Erro 131056: "Pair rate limit hit"

**Causa**: você está enviando muitas mensagens muito rápido para o mesmo par (seu número → mesmo destinatário).

**Solução**:
- Espace mensagens consecutivas em pelo menos 1 segundo
- Não envie 5 mensagens em sequência para o mesmo número; junte em uma só

### Erro 130429: rate limit geral

**Causa**: throughput excedido (improvável para 200 usuários).

**Solução**: implemente `withRetry` com backoff exponencial (`references/04-whatsapp-client.md`).

### Mensagem enviada mas não chegou

**Causas**:
1. Em **Development mode**: número de destino não está em "Recipient phone numbers"
2. Número do destinatário está incorreto (faltando código de país, com `+`)
3. Número do destinatário não tem WhatsApp instalado

**Como verificar**:

```bash
# Tente enviar via curl direto
curl -X POST \
  "https://graph.facebook.com/v25.0/PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "5511987654321",
    "type": "text",
    "text": { "body": "Teste" }
  }'
```

Se a resposta tem `messages[0].id` mas a mensagem não chega: o problema é o número de destino.

### Botões não aparecem no celular

**Causa comum**: a versão do WhatsApp do usuário é muito antiga (raro em 2026).

**Soluções**:
1. O bot sempre aceita fallback em texto ("aceito" funciona igual a clicar)
2. Atualize a UX para deixar isso explícito: "Clique no botão OU responda com 'aceito'"

### Título do botão truncado de forma estranha

**Causa**: título excede 20 caracteres (inclui emojis multi-byte).

**Solução**: o código em `lib/whatsapp.ts` já trunca a 20 chars, mas avalie se faz sentido visualmente. Reduza o título.

## 🔴 Supabase

### "Permission denied for table participants"

**Causa**: você está tentando ler/escrever com a chave anônima (anon key) em vez da service role key.

**Solução**: confirme que `lib/supabase.ts` usa `SUPABASE_SERVICE_ROLE_KEY`:

```ts
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // NÃO usar anon key aqui
  { auth: { autoRefreshToken: false, persistSession: false } }
);
```

### "Database connection limit reached"

**Causa**: você está abrindo muitas conexões diretas. O free tier do Supabase tem 60 conexões.

**Solução**: use o **connection pooler** (modo Transaction):
- URL com pooler: `https://xxxxx.supabase.co` (a anon e service role já usam pooler por padrão)
- Se usar Postgres direto via `pg`, mude para `aws-0-...pooler.supabase.com:6543`

### "Could not find the function 'gen_random_uuid'"

**Causa**: extensão `pgcrypto` não está instalada.

**Solução**:
```sql
create extension if not exists "pgcrypto";
```

### Projeto Supabase pausou

**Sintoma**: queries falham, dashboard mostra "Project is paused".

**Causa**: projeto Free tier fica pausado após 7 dias inativo.

**Solução**:
1. Vá ao dashboard → projeto vai começar a despausar (toma ~30s)
2. Para o futuro, configure cron de keep-alive (`references/02-database-schema.md`)

## 🔴 Vercel

### Deploy falha com "Build error"

**Causas comuns**:
1. Erro de TypeScript em algum arquivo
   - Rode `npm run typecheck` local para ver erros
2. Variável de ambiente faltando referenciada com `!`
   - Vercel tem todas as env vars configuradas?

**Solução**: ver logs detalhados em **Deployments → Failed deployment → View logs**.

### "Module not found" só na Vercel

**Causa**: você importou um arquivo que não foi commitado para o git.

**Solução**:
```bash
git status
# Veja se há arquivos não staged
git add .
git commit -m "fix: missing files"
git push
```

### `process.env.X` é undefined em runtime

**Causas**:
1. Esqueceu de adicionar a variável na Vercel
2. Adicionou mas não fez redeploy depois (variáveis novas só vigoram em novos deployments)
3. Variável é `NEXT_PUBLIC_` mas você está lendo no server (funciona, mas verifique nome)
4. Variável NÃO é `NEXT_PUBLIC_` e você está lendo no client (não funciona)

**Solução**: redeploy depois de adicionar variáveis. Em **Deployments → ... → Redeploy**.

### Logs não aparecem em Realtime

**Causa**: às vezes o painel Realtime tem delay; ou você está olhando o deployment errado.

**Solução**: confirme que está no deployment correto (em Production). Recarregue. Use `console.log` (não `console.debug` — pode estar filtrado).

## 🔴 Frontend

### Botão "Participar" não abre WhatsApp no iPhone

**Causa possível**: o iPhone bloqueia abertura de apps externos se a página não é HTTPS ou se o user-gesture não foi reconhecido.

**Soluções**:
1. Confirme HTTPS (Vercel já tem por default)
2. Não use `window.location` para abrir; use `<a href>` ou `<Link href>`
3. Adicione `target="_blank"` e `rel="noopener noreferrer"`

### Texto da mensagem vem cortado

**Causa**: caracteres especiais não foram URL-encoded direito.

**Solução**: SEMPRE use `encodeURIComponent`:

```tsx
const link = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
```

Não use template literals diretos no texto.

### QR Code aponta para domínio errado

**Causa**: gerou o QR antes do domínio customizado estar configurado.

**Solução**: gere novo QR apontando para o domínio final. Antes do evento, escaneie 3-5 vezes com celulares diferentes para confirmar.

## 🔴 Diagnóstico geral

### "Não sei o que está dando errado, só sei que não funciona"

**Antes do roteiro abaixo**, sempre faça este teste de isolamento — é o mais barato:

```bash
# Valida o token (passou OAuth?)
curl "https://graph.facebook.com/v25.0/me?access_token=<TOKEN>"

# Valida que outbound funciona ponta a ponta (token + WABA + Phone ID + allow list)
curl -X POST "https://graph.facebook.com/v25.0/<PHONE_NUMBER_ID>/messages" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"messaging_product":"whatsapp","to":"<TESTER>","type":"template",
       "template":{"name":"hello_world","language":{"code":"en_US"}}}'
```

Se outbound chega: o problema é só inbound (webhook não recebe, ou recebe e falha ao processar). Vá pro roteiro abaixo focando nos passos 1-3.

Se outbound não chega: problema na config base (token, WABA, allow list, app não Live). Resolva isso primeiro — o bot inteiro depende disso funcionar.

**Roteiro de diagnóstico** (assumindo outbound já validado):

1. **Logs da Vercel** (Project → Logs → Realtime, ou `vercel logs <url> --expand --since 5m`) — tem alguma exception?
2. **Painel da Meta** (WhatsApp → Configuration → Webhook) — Last Delivery Status mostra erro?
3. **Tabela received_messages no Supabase** — entries chegam quando você envia?
4. **Tabela participants** — estado avança após cada interação?

Se 4 falha mas 1, 2, 3 estão OK: problema na máquina de estados.
Se 3 falha mas 1, 2 estão OK: webhook não chegou no DB (erro de query, RLS bloqueando).
Se 2 falha mas 1 está OK: assinatura HMAC ou response com status != 2xx.
Se 1 está vazio: webhook não está sendo chamado (Callback URL errada, app não inscrito na WABA, ou Test Number aguardando outbound prévio).

### Como gerar trace completo de uma mensagem

Adicione logs temporários:

```ts
// No início de processIncomingMessage
console.log("[TRACE] msg received", { wamid: msg.id, from: msg.from, type: msg.type });

// Após cada operação importante
console.log("[TRACE] dedup check", { duplicate: !!dup });
console.log("[TRACE] participant", { phone, state: participant.current_state });
console.log("[TRACE] dispatching to handler", { handler: "handleTermsResponse" });

// Antes de chamar WhatsApp API
console.log("[TRACE] sending message", { to: phone, type: "text" });

// Após resposta da API
console.log("[TRACE] message sent", { messageId: response.messages[0].id });
```

Depois de validar, REMOVA os traces para não poluir logs em produção.

### Como reproduzir um bug localmente

1. Identifique o `wamid` da mensagem problemática nos logs
2. Pegue o payload de `received_messages.raw_payload`:
   ```sql
   select raw_payload from received_messages where wamid = 'wamid.xxx';
   ```
3. Use o endpoint de debug `/api/debug/simulate` (apenas em dev) para reprocessar:
   ```bash
   curl -X POST http://localhost:3000/api/debug/simulate \
     -H "Content-Type: application/json" \
     -d @payload.json
   ```
4. Debug com breakpoints no VSCode (configure launch.json para Next.js)

## 🆘 Plano B: como pivotar se algo der muito errado

Se faltar 1 dia para o evento e o bot não funciona:

### Opção 1: Google Forms + QR
- QR aponta para um Google Form com nome + email
- Sorteio manual no fim

### Opção 2: Bot manual via WhatsApp Business app
- Use mensagens automáticas do app consumidor
- 1 pessoa do staff anota nome, email e gera código manualmente
- Funciona para até ~50 participantes

### Opção 3: Tela com QR + papel
- Cada participante pega um papel com código pré-impresso
- Você coleta nome+email em formulário online opcional

Não é tão polido, mas o evento acontece.

## Quando pedir ajuda

Se travou em algo por mais de 1h sem progresso:

1. **Stack Overflow**: filtre por `[whatsapp-cloud-api]`
2. **WhatsApp Business API Community**: <https://developers.facebook.com/community/whatsapp/>
3. **Meta for Developers Support**: para problemas de conta/billing
4. **Vercel Discord**: <https://vercel.community>
5. **Supabase Discord**: <https://discord.supabase.com>

Inclua nas perguntas:
- Versão da Graph API (`v25.0`)
- Código do erro (se houver)
- Trecho mínimo de código que reproduz
- O que você já tentou

Boa sorte! Quando o evento rolar, abra um cafezinho e curta. 🎉
