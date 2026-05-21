---
name: whatsapp-bot
description: "Construa um chatbot de sorteio para eventos usando WhatsApp Cloud API (Meta) + Next.js + Vercel + Supabase. Use sempre que o usuário mencionar: chatbot WhatsApp, bot de sorteio, integração WhatsApp Business API, QR Code com fluxo WhatsApp, coleta de leads via WhatsApp, webhook WhatsApp Meta, wa.me link, Cloud API, ou quando quiser construir qualquer fluxo conversacional no WhatsApp que colete dados (nome/email), peça consentimento LGPD, ou envie códigos/cupons. Aplica-se tanto a projetos novos do zero quanto à INTEGRAÇÃO em projetos Next.js + Supabase existentes na Vercel. Cobre setup Meta for Developers, webhook handler com validação HMAC, máquina de estados de conversa, schema Postgres, conformidade LGPD, geração de QR Code, testes locais com ngrok e deploy."
---

# WhatsApp Raffle Bot

Skill completa para construir/integrar um chatbot de sorteio no WhatsApp usando a stack Next.js + Vercel + Supabase com a Cloud API oficial da Meta.

## Quando usar esta skill

Sempre que o usuário quiser:
- Criar um bot do WhatsApp que coleta dados (nome, email, telefone) e devolve algo (código, cupom, voucher)
- Integrar WhatsApp num projeto Next.js + Supabase existente
- Construir fluxos conversacionais com aceite de termos LGPD
- Distribuir códigos únicos via WhatsApp em eventos (sorteios, brindes, check-in)

## Visão geral do fluxo construído

```
Cliente escaneia QR → abre landing → clica botão "Participar"
  → abre WhatsApp com mensagem pré-preenchida (wa.me link)
  → bot recebe mensagem (webhook Meta → Vercel)
  → bot envia boas-vindas + botões de termos LGPD
  → cliente clica "Aceito"
  → bot pede nome → cliente envia
  → bot pede email → cliente envia
  → bot gera código único 6 dígitos + envia regras
  → dados salvos no Supabase para sorteio posterior
```

## Stack e decisões arquiteturais

| Decisão | Escolha | Justificativa |
|---|---|---|
| Provider WhatsApp | **Cloud API oficial (Meta)** | On-Premises API foi descontinuada em 23/10/2025; única opção para novos números |
| Framework | **Next.js App Router** | Route handlers nativos, fácil ler body raw para HMAC, `runtime = "nodejs"` granular |
| Hospedagem | **Vercel** | Serverless escala automaticamente; free tier suporta 200+ participantes |
| Banco | **Supabase (Postgres)** | Free tier generoso; SQL puro para queries do sorteio |
| Versão Graph API | **v23.0** | Versão estável dos code samples oficiais atuais da Meta |
| Armazenamento de estado da conversa | **Coluna `current_state` na tabela `participants`** | Para até ~500 usuários simultâneos não compensa adicionar Redis/KV |
| Aceite de termos | **Botões interativos** (não texto livre) | IDs estáveis, parsing trivial, maior conversão |

## Custos esperados (200 participantes)

- **Vercel Hobby**: R$ 0,00 (< 0,1% do free tier)
- **Supabase Free**: R$ 0,00 (~50 KB de dados)
- **WhatsApp Cloud API**: R$ 0,00 (cliente sempre inicia → janela de 24h → mensagens não-template grátis)

## Como navegar nesta skill

Esta skill está dividida em arquivos de referência por área. **Leia este SKILL.md inteiro primeiro**, depois carregue os references conforme a fase do trabalho:

| Arquivo | Quando ler |
|---|---|
| `references/01-meta-setup.md` | Antes de criar a conta Meta for Developers, app, WABA, tokens, configurar webhook |
| `references/02-database-schema.md` | Antes de criar/alterar tabelas no Supabase |
| `references/03-webhook-implementation.md` | Para implementar `app/api/webhook/whatsapp/route.ts` com validação HMAC e idempotência |
| `references/04-whatsapp-client.md` | Para implementar `lib/whatsapp.ts` (envio de mensagens texto e botões interativos) |
| `references/05-state-machine.md` | Para implementar `lib/state-machine.ts` com toda a lógica conversacional |
| `references/06-frontend-landing.md` | Para implementar a página da landing e gerar o QR Code |
| `references/07-lgpd-compliance.md` | Antes de escrever os termos de consentimento e tratar o direito de exclusão |
| `references/08-testing.md` | Para testar localmente com ngrok e rodar a checklist de casos de teste |
| `references/09-deployment.md` | Para subir o webhook em produção e mudar o app para Live |
| `references/10-troubleshooting.md` | Quando algo não funciona — erros comuns mapeados |
| `references/11-integration-existing-project.md` | Se for integrar em projeto Next.js + Supabase existente em vez de criar do zero |
| `assets/env.example` | Template de `.env.local` com todas as variáveis |

## Fluxo de execução recomendado

Quando o usuário pede para construir este sistema, siga esta ordem — confirmando cada etapa com o usuário antes de avançar:

### Fase 0 — Descoberta (sempre faça antes de escrever código)

Pergunte ao usuário:
1. É um projeto novo ou integração em projeto existente?
2. Se existente: App Router ou Pages Router? Já tem cliente Supabase em `lib/`? Tem auth?
3. Volume esperado de participantes (afeta apenas dimensionamento, não a arquitetura para até 500)
4. Tem o número de WhatsApp dedicado? (não pode ser o mesmo do app WhatsApp Business consumidor)
5. Já tem conta Meta Business / Meta for Developers?
6. A empresa já tem termos LGPD/Política de Privacidade aprovados ou precisa do template?

### Fase 1 — Setup externo (sem código)

Guie o usuário pelo `references/01-meta-setup.md`. Esta fase pode levar de 1h a 3 dias (Business Verification, aprovação do nome de exibição). **Comece esta fase com antecedência**. Ao final, o usuário terá em mãos:
- App ID, App Secret
- Phone Number ID
- WhatsApp Business Account ID
- Access Token permanente (System User)
- Verify Token (definido pelo próprio usuário)

### Fase 2 — Banco de dados

Leia `references/02-database-schema.md` e gere a migration SQL para o Supabase. Se for projeto existente, verifique nomes de tabela conflitantes primeiro.

### Fase 3 — Backend (webhook + máquina de estados)

Nesta ordem:
1. `lib/supabase.ts` (cliente admin com service role key)
2. `lib/whatsapp.ts` — referência: `references/04-whatsapp-client.md`
3. `lib/lgpd.ts` — referência: `references/07-lgpd-compliance.md`
4. `lib/state-machine.ts` — referência: `references/05-state-machine.md`
5. `app/api/webhook/whatsapp/route.ts` — referência: `references/03-webhook-implementation.md`

### Fase 4 — Frontend (landing + QR Code)

Leia `references/06-frontend-landing.md`. Crie a página em `app/sorteio/page.tsx` (ou onde fizer sentido no projeto do usuário). Gere o QR Code via script em `scripts/generate-qr.ts`.

### Fase 5 — Testes locais

Siga `references/08-testing.md`:
1. Expor com ngrok
2. Configurar webhook no Meta apontando para a URL ngrok
3. Rodar a checklist de 13 casos de teste

### Fase 6 — Deploy

Siga `references/09-deployment.md`:
1. Push para repositório → deploy Vercel
2. Atualizar Callback URL no Meta para o domínio de produção
3. Mudar app de Development para Live
4. Verificação opcional do business (necessária para alguns limites)

## Princípios obrigatórios (sempre aplicar)

1. **Validar `X-Hub-Signature-256` em todo POST do webhook**. Ler `await req.text()` ANTES de `JSON.parse`. Sem isso o endpoint é spoofável.
2. **Responder 200 OK em < 5s**. Processamento pesado → fire-and-forget. A Meta retenta por até 7 dias com backoff exponencial se receber != 2xx.
3. **Idempotência via `wamid`**. Tabela `received_messages` com PK em `wamid` — segundo recebimento é ignorado.
4. **Nunca expor `SUPABASE_SERVICE_ROLE_KEY` no client**. Apenas em route handlers / Server Components / Server Actions.
5. **Nunca usar Access Token temporário em produção**. Eles expiram em 24h. Sempre System User token.
6. **Sempre versionar os termos LGPD**. Quando mudar texto, suba `TERMS_VERSION` para `v2`. Mude IDs dos botões para `accept_terms_v2`.
7. **Para projetos existentes**: leia `references/11-integration-existing-project.md` ANTES de mexer em qualquer arquivo. Verifique conflitos de nomes de tabela, libs já instaladas, padrões do projeto.

## Anti-padrões (nunca fazer)

- ❌ `await req.json()` antes de validar HMAC (a reserialização quebra a assinatura)
- ❌ Tratar `entry`, `changes`, `messages` como objetos únicos — são **arrays**
- ❌ Esquecer de inscrever o app na WABA via `POST /{WABA_ID}/subscribed_apps` (sintoma: teste funciona, mensagens reais não chegam — "shadow delivery")
- ❌ Usar a tabela `auth.users` do Supabase como `participants` (mistura de domínios)
- ❌ Esquecer de mudar app para Live antes do evento (em Development só números pré-cadastrados recebem)
- ❌ Imprimir QR Codes apontando direto para `wa.me` — sempre aponte para a landing primeiro (permite ajustar regras, ter analytics, exibir info do evento)
- ❌ Coletar dados sensíveis (CPF, endereço) "porque pode ser útil" — princípio da minimização da LGPD

## Convenções a seguir ao gerar código

- TypeScript estrito, sem `any` exceto em payloads externos da Meta
- Comentários em português brasileiro
- Validação com Zod para inputs do usuário (nome, email)
- Variáveis de ambiente lidas via `process.env.X!` com fallbacks defensivos
- Erros logados com `console.error` (Vercel captura automaticamente)
- Sem `try/catch` que engole o erro silenciosamente — sempre relogar ou repropagar
