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
WHATSAPP_REDIRECT_VENDOR_PHONE=<E.164 sem +, ex: 5511999990000>
WHATSAPP_REDIRECT_EVENT_START=2026-05-26
WHATSAPP_REDIRECT_EVENT_END=2026-05-29
TERMS_VERSION=v1
NEXT_PUBLIC_EVENT_NAME=Sorteio Profills Fispal 2026
NEXT_PUBLIC_EVENT_WHATSAPP_NUMBER=<número Profills E.164 sem +>
NEXT_PUBLIC_RAFFLE_DATE=05/06/2026
NEXT_PUBLIC_WHATSAPP_WELCOME_IMAGE_URL=https://lead.profills.com/whatsapp/banner-sorteio.png
NEXT_PUBLIC_BETTER_AUTH_URL=https://lead.profills.com
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

## 10. Offboarding seguro pós-evento

Após o sorteio (05/06/2026), se o cliente quiser voltar o número ao app WhatsApp Business:

### Antes do go-live (preventivo)

1. No celular do atendente: WhatsApp Business → Configurações → Conversas → Backup → "Fazer backup agora" no Google Drive.
2. **Anotar a chave de criptografia de 64 dígitos** (Configurações → Conta → Backups com criptografia ponta a ponta). Guardar em local seguro fora do celular.

### Pós-evento

1. NÃO clicar em "Excluir" no WhatsApp Manager — bloqueia 30 dias e perde dados.
2. Usar `Deregister` via API:

```bash
curl -X POST "https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID}/deregister" \
  -H "Authorization: Bearer ${WHATSAPP_ACCESS_TOKEN}"
```

3. Aguardar confirmação. Re-instalar WhatsApp Business no celular.
4. Re-cadastrar o número. Tentar restaurar backup do Google Drive (chave de criptografia da etapa preventiva).

⚠️ Restaurar backup pós-migração Cloud API não é caminho documentado pela Meta. Risco real de perda de histórico. Backup duplicado + chave anotada é a única mitigação possível.

## 11. Valores operacionais — Sorteio Profills Fispal 2026

Variáveis a configurar no Vercel (Settings → Environment Variables, Production + Preview):

```env
WHATSAPP_REDIRECT_VENDOR_PHONE=5555996913627
WHATSAPP_REDIRECT_EVENT_START=2026-05-26
WHATSAPP_REDIRECT_EVENT_END=2026-05-29
NEXT_PUBLIC_RAFFLE_DATE=05/06/2026
```

> Não há env para nome do vendedor — o número é o canal profissional da Profills e a comunicação não cita pessoa específica.

Telefone do vendedor `5555996913627` = country code `55` + DDD `55` (Santa Maria/RS) + número `99691-3627`. Formato E.164 sem `+`, validado pelo Zod no `packages/env/src/server.ts`.

**Pendências de produto antes do go-live:**
- Identidade visual Profills no card Satori (`apps/web/src/app/api/whatsapp/code-card/route.tsx`) — cores atuais são placeholder `#0E1A2B` (background) + `#FF7A1A` (accent). Atualizar pra paleta real.
- Links reais de regulamento + política de privacidade no banner do bot (atualmente sem links explícitos na mensagem — adicionar se desejado).

