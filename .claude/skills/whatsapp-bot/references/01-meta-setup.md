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

### ⚠️ AVISO CRÍTICO: NÃO use o número principal de atendimento

Migrar um número do app WhatsApp Business para a Cloud API é **destrutivo e demorado para reverter**:

| Antes da migração | Depois da migração |
|---|---|
| Atendentes respondem do celular | App WhatsApp Business **desconectado permanentemente** desse número |
| Catálogo, etiquetas, mensagens automáticas do app | Tudo perdido (não migra para Cloud API) |
| WhatsApp Web tradicional funciona | Para de funcionar (Cloud API é só via Graph API) |
| Conversas em andamento acessíveis | Ficam órfãs no aparelho, sem como responder |

**Reverter** exige offboarding manual no painel Meta (~24h+) e durante esse tempo o número fica em limbo (nem no app, nem na Cloud API).

**Regra de ouro:** sempre use um **chip dedicado** (linha sobressalente, chip novo pré-pago R$15-30) para o bot. Mantenha o número comercial principal intocado. Para eventos pontuais, depois é possível desativar o chip.

Cenários alternativos se o número que você quer usar JÁ está no app WhatsApp Business:
- **Opção 1 (recomendada):** comprar/separar um chip novo, registrar o app WhatsApp Business nele, e aí migrar esse chip novo para a Cloud API
- **Opção 2:** desativar a conta WhatsApp Business no número atual (Settings → Account → Delete account), esperar ~30min, e cadastrar como novo na Cloud API. Perde-se conversas mas mantém o número
- **Opção 3:** convivência via solução multi-agente (Twilio, Zenvia, ManyChat) — investimento extra, semanas de setup

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

### Passo 6: Token de acesso — PULE o temporário, vá direto para o System User

Em **WhatsApp → API Setup**, há um botão "Generate access token" que gera um token **temporário válido por ~24h**.

**Recomendação forte: ignore esse botão.** Mesmo "só para testar" ele atrapalha — você gera, cola no `.env`, faz deploys, e em algumas horas o bot para de funcionar no meio do desenvolvimento. Aí volta no painel, gera de novo, atualiza Vercel, redeploy... ciclo cansativo que se evita criando o token permanente UMA vez agora.

**Vá direto para o passo 7.**

### Passo 7: Token de acesso PERMANENTE via System User

Procedimento oficial atualizado (verificado contra implementações reais em 2026):

#### 7.1 — Navegar até Usuários do Sistema (atenção: caminho confunde)

1. Abra <https://business.facebook.com/settings>
2. Selecione o **portfólio empresarial** correto no topo (não confunda com outro portfólio que você tenha acesso)
3. No menu esquerdo, expanda **Usuários** (não é o item raiz "Usuários" do nível superior, é o submenu)
4. Você verá:
   - **Pessoas** — humanos com login Facebook (NÃO É AQUI)
   - **Parceiros** — outras empresas (NÃO É AQUI)
   - **Usuários do sistema** ← **é este**

O item "Usuários do sistema" às vezes aparece truncado/cortado na sidebar dependendo do zoom — role um pouco se não estiver vendo.

#### 7.2 — Criar o System User

1. Clique em **+ Adicionar** (canto superior direito) → abre modal "Create system user"
2. **Nome:** use algo neutro/técnico — **NÃO use** as palavras `WhatsApp`, `Bot`, `Sorteio`, `Promoção`, `Profills` (a Meta tem blacklist de marca e termos promocionais; rejeitará com "nome inválido")
   - Bons exemplos: `Integracao Backend`, `API Service`, `Servico Eventos`
3. **Role:** **Admin** (necessário para gerar token)

⚠️ **Atenção aos falsos positivos:** a interface da Meta às vezes exibe erros que mentem:
- **"Você escolheu um nome de usuário do sistema inválido"** — pode aparecer mesmo quando o nome é aceito. O System User pode ter sido criado no submit anterior. **Antes de tentar outro nome, feche o modal e role a lista** para ver se já existe.
- **"O usuário administrador do sistema deve ter sido criado há mais de 7 dias para criar outros admins"** — também pode ser falso positivo se você for o primeiro admin do portfólio. Tente mesmo assim e verifique a lista.

Em ambos os casos: depois de receber o erro, **clique fora do modal, recarregue a página, e cheque a lista**. Se o User aparecer com role "Admin", ignore o erro — funcionou.

#### 7.3 — Atribuir ativos

1. Clique no System User recém-criado → abre o painel lateral direito
2. Clique em **Atribuir ativos** (botão central ou superior direito)
3. **Aba Apps:** selecione seu app → ative **"Gerenciar app"** com **"Controle total"** → Atribuir
4. **Aba Contas do WhatsApp:** selecione a WABA → ative **"Gerenciar contas do WhatsApp Business"** com **"Controle total"** → Atribuir

#### 7.4 — Gerar token

1. De volta no painel do System User → **Gerar token**
2. **Selecionar app:** o app criado no passo 3
3. **Vencimento do token:** **Nunca** (importante; o default às vezes é 60 dias)
4. **Permissões:** marque as três:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
   - `business_management`
5. **Gerar token** → o token aparece UMA VEZ na tela. Comece com `EAA...`
6. **COPIE IMEDIATAMENTE** para um lugar seguro — ao fechar o popup, não é mais possível ver. Apenas revogar e gerar outro.

#### 7.5 — Validar o token antes de qualquer coisa

Antes de colar no `.env`, valide via `GET /me`:

```bash
curl "https://graph.facebook.com/v25.0/me?access_token=COLE_O_TOKEN_AQUI"
```

Resposta esperada:
```json
{"name":"Integracao Backend","id":"122095555881340807"}
```

Se vier `{"error":...}`, o token está inválido ou faltou permissão. Não avance até resolver — você economiza horas de debug em produção.

Após validado, esse valor vai em `WHATSAPP_ACCESS_TOKEN` no `.env`.

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
  "https://graph.facebook.com/v25.0/<WABA_ID>/subscribed_apps" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Verifique se funcionou:

```bash
curl -X GET \
  "https://graph.facebook.com/v25.0/<WABA_ID>/subscribed_apps" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Resposta esperada: lista com seu app.

### Passo 11: Adicionar números de teste à allow list

Em modo **Development** com o **Test Number da Meta** (o `+1 555 675 9095` que aparece como "Número de teste" no dropdown De), todo número que vai trocar mensagens precisa estar pré-cadastrado em uma allow list.

1. Em **WhatsApp → Configuração da API** → seção **Etapa 1: Selecione números de telefone**
2. No dropdown **"Até"** clique → **Gerenciar lista de números de telefone**
3. **Adicionar telefone** → escolher código do país (BR +55) → digitar o número
4. Você concorda em receber mensagens nesse número (clicar "Avançar")
5. Confirmar via OTP enviado por WhatsApp ou SMS

#### ⚠️ Cuidado: nono dígito brasileiro

Números brasileiros antigos (pré-2014, especialmente RS/SC/PR) podem estar registrados no WhatsApp **sem o 9 do celular**. Exemplo: você cadastra `+55 51 99647-4579` (13 dígitos), mas o WhatsApp normaliza para `+55 51 9647-4579` (12 dígitos sem o 9).

Sintoma: o webhook recebe `wa_id: 555196474579` (12 dígitos) e a tentativa de responder falha com `(#131030) Recipient phone number not in allowed list` — porque o cadastro está com 13 dígitos mas o destinatário internamente tem 12.

**Solução:** cadastre **ambas as versões** na allow list (com e sem o 9). Você tem até 5 vagas no Test Number; sobra espaço.

#### ⚠️ Comportamento do Test Number: inbound só após outbound prévio

O Test Number (+1 555 675 9095) tem uma limitação não documentada explicitamente: **mensagens enviadas pelo usuário só são retransmitidas para o webhook se o bot já tiver enviado pelo menos uma mensagem antes** (abrindo uma "conversação" do lado da Meta). Antes disso, inbounds são silenciosamente engolidos.

Para destravar: dispare um template `hello_world` (passo 12) **antes** de testar o fluxo de inbound. Daí em diante, todas as mensagens do usuário chegam ao webhook normalmente.

Esta limitação **não existe em números reais** — apenas no Test Number.

#### Custos do Test Number

Gratuito por **90 dias** desde o primeiro uso, ilimitado dentro dos 5 testers. Após esse prazo o número expira e você precisa registrar um número real.

### Passo 12: Teste inicial com `hello_world`

Valide que o setup todo está funcionando antes de escrever uma linha de código:

```bash
curl -X POST \
  "https://graph.facebook.com/v25.0/<PHONE_NUMBER_ID>/messages" \
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
- [ ] System User criado com role Admin + ativos atribuídos (app + WABA em Controle total)
- [ ] Access Token permanente (Never expire) gerado, com 3 permissões (`whatsapp_business_messaging`, `whatsapp_business_management`, `business_management`)
- [ ] **Token validado via `GET /me`** — retorna `{name, id}` HTTP 200
- [ ] Verify Token gerado (com `openssl rand -hex 32`)
- [ ] App inscrito na WABA via POST `/{WABA_ID}/subscribed_apps`
- [ ] Pelo menos 1 número de teste na allow list (e se for número BR antigo, **ambas as versões** com e sem o 9)
- [ ] Teste `hello_world` funcionou (mensagem chegou no celular) — **antes** do teste de inbound, para destravar o Test Number
- [ ] **Sabendo que o número de produção será um chip dedicado**, não o número comercial principal

Próximo passo: leia `references/02-database-schema.md`.
