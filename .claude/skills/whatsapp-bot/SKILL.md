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
| Versão Graph API | **v25.0** | Versão atual em produção (2026); os code samples no painel da Meta já vêm em v25. v23 ainda funciona mas está em sunset gradual. Sempre confira a versão exibida no curl da Etapa 2 do painel ao iniciar — é a fonte de verdade. |
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
1. Configurar envs na Vercel **antes** do primeiro push — use `vercel env add <NOME> production` (CLI, mais rápido) ou o painel. Sem isso, o build quebra no Zod (`packages/env/src/server.ts`).
2. Push para repositório → deploy Vercel
3. Atualizar Callback URL no Meta para o domínio de produção
4. Mudar app de Development para Live (ou trocar Test Number por chip dedicado se quiser ficar em Development por mais tempo — Test Number é só smoke test)
5. Verificação opcional do business (necessária para alguns limites de envio)

## Princípios obrigatórios (sempre aplicar)

1. **Validar `X-Hub-Signature-256` em todo POST do webhook**. Ler `await req.text()` ANTES de `JSON.parse`. Sem isso o endpoint é spoofável.
2. **Responder 200 OK em < 5s**. Processamento pesado → fire-and-forget. A Meta retenta por até 7 dias com backoff exponencial se receber != 2xx.
3. **Idempotência via `wamid`**. Tabela `received_messages` com PK em `wamid` — segundo recebimento é ignorado.
4. **Nunca expor `SUPABASE_SERVICE_ROLE_KEY` no client**. Apenas em route handlers / Server Components / Server Actions.
5. **Nunca usar Access Token temporário (do botão "Gerar token de acesso" do painel) — nem em dev.** Expira em ~24h e quebra o bot no meio do desenvolvimento. **Pule esse botão e vá direto para o System User token** (passo 7 de `01-meta-setup.md`). O tempo perdido recadastrando vale mais que os 5 min para criar System User uma vez.
6. **Validar o token via `GET /me` antes de assumir que está funcionando.** `curl https://graph.facebook.com/v25.0/me?access_token=...` deve retornar `{"name": "<nome do System User>", "id": "..."}`. Se 401/400, o token está morto. Faça isso após qualquer troca de token.
7. **Sempre versionar os termos LGPD**. Quando mudar texto, suba `TERMS_VERSION` para `v2`. Mude IDs dos botões para `accept_terms_v2`.
8. **Antes de declarar "bot quebrado", isole inbound vs outbound.** Se mensagens não fluem, dispare um template `hello_world` direto via curl para o número de teste — se chegar, o bot só tem problema de inbound (provavelmente recipient não autorizado). Se não chegar, o problema é token/configuração base. Este é o teste mais barato de diagnóstico.
9. **Use o `wa_id` exatamente como veio no payload do webhook ao montar o `to` do outbound.** A Meta normaliza números brasileiros antigos (pré-2014) sem o nono dígito — `5511987654321` (13 dígitos) pode chegar como `551187654321` (12 dígitos, sem o 9 do celular). Normalizar manualmente quebra o outbound (erro 131030). Mais detalhe em `references/10-troubleshooting.md`.
10. **Para projetos existentes**: leia `references/11-integration-existing-project.md` ANTES de mexer em qualquer arquivo. Verifique conflitos de nomes de tabela, libs já instaladas, padrões do projeto.

## Anti-padrões (nunca fazer)

### Implementação

- ❌ `await req.json()` antes de validar HMAC (a reserialização quebra a assinatura)
- ❌ Tratar `entry`, `changes`, `messages` como objetos únicos — são **arrays**
- ❌ Esquecer de inscrever o app na WABA via `POST /{WABA_ID}/subscribed_apps` (sintoma: teste funciona, mensagens reais não chegam — "shadow delivery")
- ❌ Usar a tabela `auth.users` do Supabase como `participants` (mistura de domínios)
- ❌ Normalizar/transformar o `wa_id` que veio do webhook antes de enviar resposta — sempre use exatamente o valor recebido (ver princípio 9 acima)
- ❌ Coletar dados sensíveis (CPF, endereço) "porque pode ser útil" — princípio da minimização da LGPD

### Setup / operação

- ❌ **Usar o número principal de atendimento da empresa para o bot.** Migrar um número que está no app WhatsApp Business para a Cloud API é uma operação **destrutiva**: o número é desconectado do app, conversas em andamento ficam inacessíveis pelo celular, vendedores perdem o canal. O offboarding (voltar atrás) leva 24h+. **SEMPRE chip dedicado.** Detalhe em `01-meta-setup.md`.
- ❌ **Assumir que mensagens de erro da UI da Meta são literais.** A interface do Business Manager exibe erros genéricos ("Você escolheu um nome inválido", "Admin precisa ter >7 dias") que frequentemente são falsos positivos — o System User pode ser criado mesmo após o erro aparecer. **Sempre recarregue a lista para verificar o estado real** antes de tentar de novo. Detalhe em `01-meta-setup.md`.
- ❌ **Nomes contendo "WhatsApp", "Bot", "Sorteio", "Promoção"** em System Users → a Meta bloqueia (proteção de marca / política de promoções). Use nomes técnicos neutros como `Integracao Backend`, `API Service` ou similar.
- ❌ Esquecer de mudar app para Live antes do evento (em Development só números pré-cadastrados recebem)
- ❌ Imprimir QR Codes apontando direto para `wa.me` — sempre aponte para a landing primeiro (permite ajustar regras, ter analytics, exibir info do evento)
- ❌ **Confiar no Test Number da Meta (+1 555 675 9095) para o evento real.** É só desenvolvimento: máximo 5 testers pré-cadastrados, prefixo americano feio no QR, inbound só após outbound prévio do bot. Use somente para validação durante implementação. Detalhe em `01-meta-setup.md`.

## Convenções a seguir ao gerar código

- TypeScript estrito, sem `any` exceto em payloads externos da Meta
- Comentários em português brasileiro
- Validação com Zod para inputs do usuário (nome, email)
- Variáveis de ambiente lidas via `process.env.X!` com fallbacks defensivos
- Erros logados com `console.error` (Vercel captura automaticamente)
- Sem `try/catch` que engole o erro silenciosamente — sempre relogar ou repropagar
