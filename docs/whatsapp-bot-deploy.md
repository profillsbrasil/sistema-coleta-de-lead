# Deploy & operação do bot WhatsApp (Sorteio Profills Fispal 2026)

Cheatsheet pra colocar em produção e operar no dia do evento.

## 1. Variáveis de ambiente no Vercel

Domínio: `https://lead.profills.com`

Acesse: Vercel → Project `lead-profills` → Settings → Environment Variables. Adicione (Production + Preview):

```
WHATSAPP_ACCESS_TOKEN=<System User Access Token, NUNCA o temporary>
WHATSAPP_PHONE_NUMBER_ID=1195256440329092
WHATSAPP_BUSINESS_ACCOUNT_ID=1702967640743484
WHATSAPP_APP_SECRET=<app secret da app Meta>
WHATSAPP_VERIFY_TOKEN=<string aleatória, ex: openssl rand -hex 32>
WHATSAPP_API_VERSION=v25.0
TERMS_VERSION=v1
NEXT_PUBLIC_EVENT_NAME=Sorteio Profills Fispal 2026
NEXT_PUBLIC_EVENT_WHATSAPP_NUMBER=<número Profills E.164 sem +>
NEXT_PUBLIC_RAFFLE_DATE=<ISO 8601 ou vazio>
NEXT_PUBLIC_WHATSAPP_WELCOME_IMAGE_URL=https://lead.profills.com/whatsapp/banner-sorteio.png
```

Se `SUPABASE_SERVICE_ROLE_KEY` não estiver definido, o bot funciona normalmente — só não dá pra subir mídia via API (e nesse projeto não precisa, o banner vem do `public/`).

## 2. Subir o banner

1. Salve a arte como `apps/web/public/whatsapp/banner-sorteio.png` (PNG ou JPG, ≤ 5MB)
2. `git add apps/web/public/whatsapp/banner-sorteio.png`
3. `git commit -m "feat: arte do banner do sorteio"`
4. `git push`

Após deploy, fica em `https://lead.profills.com/whatsapp/banner-sorteio.png`.

## 3. Configurar webhook na Meta

```bash
./scripts/setup-whatsapp-meta.sh
```

O script:
- mostra checklist do que fazer no dashboard (callback URL + verify token)
- testa o webhook GET do lado deployado
- assina a WABA via API para receber eventos
- lista apps assinados (sanity check)

Manualmente, no Meta dashboard:

- **Callback URL**: `https://lead.profills.com/api/whatsapp/webhook`
- **Verify token**: o mesmo valor de `WHATSAPP_VERIFY_TOKEN`
- **Subscribe field**: `messages` (obrigatório)

## 4. Testers (modo Dev)

Enquanto o app não estiver em **Live mode**, apenas números pré-aprovados recebem mensagens:

Meta dashboard → app → WhatsApp → API Setup → "To" → adicionar até 5 números.

## 5. Token permanente

O token atual no `.env` provavelmente é **temporário** (24h). Para o evento:

1. Meta → Business settings → System Users
2. Crie um System User (ou use existente) com acesso à WABA
3. Gere token com permissões: `whatsapp_business_messaging`, `whatsapp_business_management`
4. Substitua `WHATSAPP_ACCESS_TOKEN` no Vercel + `.env` local

## 6. Smoke test pré-evento

```bash
# 1. Confirme deploy: status deve ser READY na Vercel
# 2. Confirme webhook verificado: Meta dashboard mostra "Verified"
# 3. Abra no celular (tester):
#    wa.me/<NUMERO_PROFILLS>?text=Sorteio%20Profills%20Fispal%202026
# 4. Deve receber:
#    - Imagem do banner (se URL configurada)
#    - Mensagem de boas-vindas + botões Aceito / Não aceito
# 5. Clique Aceito → digite nome → digite empresa → recebe código PROFILLS-XXXX
# 6. Painel: https://lead.profills.com/admin/sorteio (logado como admin)
#    - Confira inscritos completos
#    - Teste filtros e busca
#    - Exporte o CSV para o sorteio externo
#    - Abra um contato de teste pelo botão WhatsApp
```

## 7. Dia do evento

- Mantenha o webhook do Vercel monitorado (Logs → filter `whatsapp:webhook`)
- Painel admin `/admin/sorteio` aberto em outra aba
- Rate limit: 30 msgs/60s por wa_id (proteção contra abuso). Se um usuário spammar, o bot ignora silenciosamente. Tabela `whatsapp.rate_limit` rastreia o estado.

## 8. Pós-evento

- Export CSV final via painel admin
- Considere TTL de purge dos dados (sem retenção indefinida pós-sorteio)
- Avalie se quer manter o webhook ativo ou desativar até a próxima campanha

## 9. Troubleshooting

| Sintoma | Onde checar |
|---|---|
| Webhook verify falha | `WHATSAPP_VERIFY_TOKEN` no Vercel = o que está no dashboard Meta |
| Signature inválida | `WHATSAPP_APP_SECRET` no Vercel = app secret real da app Meta |
| Bot não responde | Logs Vercel filtrando `whatsapp:webhook`; possível rate_limit ou token expirado |
| Imagem não aparece | URL precisa ser HTTPS público; teste abrindo no navegador |
| 401 dos tokens | Token temporário expirou; troque pelo System User permanent |
| Código colidiu 5 vezes | Quase impossível (10k slots); olhe `whatsapp.participants` no Supabase Studio |
