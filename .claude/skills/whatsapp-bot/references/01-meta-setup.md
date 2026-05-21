# 01 - Setup Meta for Developers, WhatsApp Cloud API

Esta é a fase de cadastro externo. Não tem código aqui, mas é a base de tudo. **Comece pelo menos 7 dias antes do evento** — Business Verification pode levar dias.

## Conceitos importantes antes de começar

### App WhatsApp Business (consumidor) vs WhatsApp Business Platform (Cloud API)

| Característica | App WhatsApp Business (grátis) | Cloud API |
|---|---|---|
| Onde roda | Celular Android/iOS | Servidor da Meta (`graph.facebook.com`) |
| Automação programática | Não | Sim (REST/Graph API) |
| Webhooks de mensagens recebidas | Não | Sim |
| Multi-agente | Não | Sim |
| Custo de infraestrutura | Grátis | Grátis (paga só template fora da janela 24h) |

**Você precisa da Cloud API.** O número usado na Cloud API NÃO pode estar simultaneamente ativo no app WhatsApp consumidor — precisa ser dedicado, ou migrar.

### On-Premises API foi descontinuada

A documentação oficial da Meta (`developers.facebook.com/docs/whatsapp/on-premises/sunset`) afirma textualmente: *"The final supported version of the On-Premise API client expired on October 23, 2025. On-Premises API can't be used to send messages to WhatsApp users anymore."* Novos números só rodam na Cloud API hospedada pela Meta.

### Customer Service Window (janela de 24 horas)

Cada mensagem recebida do usuário **abre/reseta** uma janela de 24h durante a qual você pode responder com qualquer tipo de mensagem (texto, botões, mídia) **gratuitamente**. Se a janela fechar, só reabre com **template aprovado** (e aí paga por mensagem). No fluxo de sorteio, a janela nunca fecha (usuário responde em poucos minutos).

## Passos de cadastro (em ordem rigorosa)

### Passo 1: Conta pessoal no Facebook

Regra da Meta: a conta inicial precisa estar em nome de uma **pessoa física**, não da marca. Use sua conta pessoal mesmo — depois você adiciona colegas como admins do Business Portfolio.

### Passo 2: Criar Meta Business Portfolio

1. Acesse <https://business.facebook.com>
2. Clique em **Criar conta** (se ainda não tem)
3. Preencha: nome do negócio, seu nome, email de trabalho

### Passo 3: Criar App de desenvolvedor

1. Acesse <https://developers.facebook.com>
2. **Meus apps → Criar App**
3. Caso de uso: **"Other"** → tipo: **Business**
4. Vincule ao Business Portfolio criado no passo 2
5. Anote o **App ID** (aparece no topo do painel do app)

### Passo 4: Adicionar produto WhatsApp ao app

1. No painel do app → **Adicionar produto → WhatsApp → Configurar**
2. A Meta cria automaticamente uma **WABA de teste** com um **número de teste**
3. Vá em **WhatsApp → API Setup** (também chamado de "Quickstart")
4. Anote:
   - **Phone Number ID** (do número de teste, formato `123456789012345`)
   - **WhatsApp Business Account ID** (WABA ID)

### Passo 5: App Secret

1. **Configurações do App → Básico**
2. Encontre **App Secret** → clique em **Mostrar** → digite sua senha
3. Anote — vai no `.env` como `WHATSAPP_APP_SECRET`. **Este valor é o segredo HMAC** para validar webhooks.

### Passo 6: Token de acesso TEMPORÁRIO (apenas para testes iniciais)

Em **WhatsApp → API Setup**, há um botão "Generate access token" — este token **expira em 24h**. Use APENAS para validar que o setup está funcionando. Nunca em produção.

### Passo 7: Token de acesso PERMANENTE (via System User) — OBRIGATÓRIO para produção

Esta é a etapa que muita gente erra. Siga exatamente nesta ordem (procedimento oficial da Meta, página "Get Started" atualizada em 01/10/2025):

1. Vá para **Business Settings** (<https://business.facebook.com/settings>)
2. No menu esquerdo: **Users → System Users**
3. Clique em **Add** → preencha:
   - Nome: `whatsapp-bot-prod` (ou qualquer identificador)
   - Role: **Admin**
4. Clique no System User criado → **Add Assets**
5. Selecione **Apps** → escolha o app criado no passo 3 → ative **Manage app**
6. Selecione **WhatsApp Accounts** → escolha a WABA → ative **Manage WhatsApp Business Accounts**
7. Volte para o System User → clique em **Generate New Token**
8. Selecione o app
9. Marque permissões:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
10. Token expiration: **Never** (60 dias é o padrão; mude para Never)
11. Clique em **Generate Token**
12. **COPIE O TOKEN IMEDIATAMENTE — ele só aparece uma vez**

Esse é o valor de `WHATSAPP_ACCESS_TOKEN` no `.env`.

### Passo 8: Definir o Verify Token

Este é um valor que **você inventa** — uma string aleatória longa que a Meta vai usar para verificar que é você quem está respondendo ao GET de handshake do webhook.

Gere com:
```bash
openssl rand -hex 32
```

Anote como `WHATSAPP_VERIFY_TOKEN`. Não compartilhe.

### Passo 9: Configurar o Webhook no painel Meta

⚠️ **Faça isto APÓS ter o backend rodando** (ngrok local OU primeiro deploy na Vercel). A Meta valida a URL no momento em que você salva.

1. Vá em **WhatsApp → Configuration → Webhook**
2. **Callback URL**: a URL HTTPS pública do seu endpoint
   - Local: `https://abc123.ngrok-free.app/api/webhook/whatsapp`
   - Produção: `https://seu-projeto.vercel.app/api/webhook/whatsapp`
3. **Verify Token**: cole o mesmo valor que você definiu no passo 8
4. Clique em **Verify and Save**
   - A Meta chama seu endpoint com `GET ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`
   - Seu endpoint deve responder com o valor de `hub.challenge` em texto puro
   - Se a verificação falhar: confira a URL, o verify token, e se o servidor está respondendo
5. Em **Webhook fields → Manage**: ative o campo **messages** (obrigatório)

### Passo 10: Inscrever o app na WABA (pegadinha crítica)

⚠️ **Sem este passo, o teste interno funciona mas mensagens reais não chegam ao webhook.** É o erro #1 de iniciantes — chamado de "shadow delivery".

Execute via curl:

```bash
curl -X POST \
  "https://graph.facebook.com/v23.0/<WABA_ID>/subscribed_apps" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Verifique se funcionou:

```bash
curl -X GET \
  "https://graph.facebook.com/v23.0/<WABA_ID>/subscribed_apps" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Resposta esperada: lista com seu app.

### Passo 11: Adicionar número de teste de destinatário

Em modo **Development**, apenas números pré-cadastrados podem **receber** mensagens do bot.

1. **WhatsApp → API Setup → Add phone number → To** (destinatário)
2. Adicione seu próprio celular (e o de quem vai testar)
3. Confirme via OTP

### Passo 12: Teste inicial com `hello_world`

Valide que o setup todo está funcionando antes de escrever uma linha de código:

```bash
curl -X POST \
  "https://graph.facebook.com/v23.0/<PHONE_NUMBER_ID>/messages" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "5511987654321",
    "type": "template",
    "template": {
      "name": "hello_world",
      "language": { "code": "en_US" }
    }
  }'
```

`5511987654321` = E.164 sem `+` (Brasil: `55` + DDD + número).

Se receber a mensagem no WhatsApp, o setup está correto. Se não, veja `references/10-troubleshooting.md`.

## Para PRODUÇÃO (depois dos testes)

### Registrar número de produção real

1. **WhatsApp → Numbers → Add phone number**
2. Use um número que NÃO esteja registrado no app WhatsApp consumidor (ou peça a migração)
3. Verificação via SMS/voz
4. **Display Name** (nome de exibição): precisa de aprovação da Meta (até 48h)
   - Regras: não pode ser genérico ("Sorteio"), tem que refletir a empresa
   - Exemplo bom: "Festa Anual XYZ"
   - Exemplo ruim: "Bot Sorteio"

### Mudar app de Development para Live

1. No topo do painel do app, alterne **App Mode** de **Development** para **Live**
2. Pode exigir **Business Verification** (upload de docs da empresa — CNPJ, comprovante)
3. Em Development, só números cadastrados recebem; em Live, qualquer número

### Atualizar Callback URL para produção

Depois do deploy na Vercel, volte em **WhatsApp → Configuration → Webhook** e atualize a Callback URL para `https://seu-projeto.vercel.app/api/webhook/whatsapp`. Re-verify.

## Limites importantes (vigentes em 2025/2026)

- **Mensagens recebidas**: sempre grátis e ilimitadas
- **Mensagens template enviadas**: cobradas por mensagem entregue
- **Mensagens não-template dentro da janela de 24h**: **GRÁTIS**
- **Service conversations**: ilimitadas e grátis desde 01/11/2024
- **Pricing per-message** desde 01/07/2025 (substituiu o modelo per-conversation)
- **Limite inicial de 250 conversas/dia por portfolio** (mudança de 07/10/2025: limites por portfolio, não mais por número)
- **Throughput**: 80 mensagens/segundo por padrão, escala automaticamente até 1.000 mps

Para 200 participantes user-initiated em um único dia → 100% dentro do regime gratuito.

## Checklist da Fase 1 (Setup Meta)

Antes de começar a codar, confirme que tem:

- [ ] Business Portfolio criado
- [ ] App criado no Meta for Developers
- [ ] Produto WhatsApp adicionado ao app
- [ ] Phone Number ID anotado
- [ ] WhatsApp Business Account ID (WABA ID) anotado
- [ ] App ID anotado
- [ ] App Secret anotado
- [ ] System User criado com permissões `whatsapp_business_messaging` e `whatsapp_business_management`
- [ ] Access Token permanente (Never expire) gerado e copiado
- [ ] Verify Token gerado (com `openssl rand -hex 32`)
- [ ] App inscrito na WABA via POST `/{WABA_ID}/subscribed_apps`
- [ ] Pelo menos 1 número de teste adicionado em API Setup
- [ ] Teste `hello_world` funcionou (mensagem chegou no celular)

Próximo passo: leia `references/02-database-schema.md`.
