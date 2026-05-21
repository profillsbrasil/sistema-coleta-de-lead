#!/usr/bin/env bash
#
# Helper para configurar o webhook do WhatsApp Cloud API na Meta.
#
# Pré-requisitos:
#   - Vars do bot já preenchidas em `apps/web/.env`
#   - `curl` e `jq` instalados
#   - Token ainda válido (System User Access Token, não o temporary do dashboard)
#
# O que este script faz:
#   1. Lê as credenciais do `.env`
#   2. Mostra um checklist do que precisa ser feito MANUALMENTE no Meta dashboard
#      (configurar o callback URL e verify token a nível de app)
#   3. Roda o `subscribed_apps` POST que ASSINA a WhatsApp Business Account
#      para receber eventos do app — único passo que dá pra automatizar
#   4. Testa o webhook GET local respondendo ao mesmo verify_token
#
# Uso:
#   ./scripts/setup-whatsapp-meta.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f apps/web/.env ]]; then
  echo "❌ apps/web/.env não encontrado"
  exit 1
fi

# Carrega vars do .env (ignora comentários e linhas vazias)
set -a
# shellcheck disable=SC1091
source <(grep -E '^[A-Z_]+=' apps/web/.env | sed 's/="\(.*\)"$/=\1/')
set +a

: "${WHATSAPP_ACCESS_TOKEN:?precisa estar em apps/web/.env}"
: "${WHATSAPP_PHONE_NUMBER_ID:?precisa estar em apps/web/.env}"
: "${WHATSAPP_BUSINESS_ACCOUNT_ID:?precisa estar em apps/web/.env}"
: "${WHATSAPP_APP_SECRET:?precisa estar em apps/web/.env}"
: "${WHATSAPP_VERIFY_TOKEN:?precisa estar em apps/web/.env}"
: "${WHATSAPP_API_VERSION:=v23.0}"

DOMAIN="${DOMAIN:-https://lead.profills.com}"
WEBHOOK_URL="$DOMAIN/api/whatsapp/webhook"

cat <<EOF

═══════════════════════════════════════════════════════════════════
  Setup WhatsApp Cloud API — Sorteio Profills Fispal 2026
═══════════════════════════════════════════════════════════════════

Phone Number ID:    $WHATSAPP_PHONE_NUMBER_ID
Business Account:   $WHATSAPP_BUSINESS_ACCOUNT_ID
API version:        $WHATSAPP_API_VERSION
Webhook URL:        $WEBHOOK_URL

EOF

echo "─── Passo 1: Configurar callback URL no app Meta (MANUAL) ───"
cat <<EOF

Acesse: https://developers.facebook.com → seu app → WhatsApp → Configuration

  Callback URL:   $WEBHOOK_URL
  Verify token:   $WHATSAPP_VERIFY_TOKEN

Clique em "Verify and save". A Meta vai chamar GET no seu webhook e validar
o verify token. Se o domínio estiver acessível e a app deployada, deve
retornar 200 com o challenge.

Em seguida, assine ao field:
  - messages (obrigatório)

Pressione ENTER quando tiver configurado lá no dashboard.
EOF

read -r

echo ""
echo "─── Passo 2: Validar webhook GET (do nosso lado) ───"
echo ""

# Testa o GET com um challenge fake
TEST_CHALLENGE="profills-test-$(date +%s)"
RESPONSE=$(curl -sS -o /dev/null -w "%{http_code}|%{url_effective}" \
  "$WEBHOOK_URL?hub.mode=subscribe&hub.verify_token=$WHATSAPP_VERIFY_TOKEN&hub.challenge=$TEST_CHALLENGE" || true)

HTTP_CODE="${RESPONSE%%|*}"

if [[ "$HTTP_CODE" == "200" ]]; then
  BODY=$(curl -sS "$WEBHOOK_URL?hub.mode=subscribe&hub.verify_token=$WHATSAPP_VERIFY_TOKEN&hub.challenge=$TEST_CHALLENGE")
  if [[ "$BODY" == "$TEST_CHALLENGE" ]]; then
    echo "✅ Webhook GET respondeu 200 com o challenge correto"
  else
    echo "⚠️  Webhook respondeu 200 mas com body errado: $BODY"
    echo "   Esperado: $TEST_CHALLENGE"
  fi
elif [[ "$HTTP_CODE" == "403" ]]; then
  echo "❌ Webhook devolveu 403 — verify_token não bate. Confira o .env e o que está no Meta dashboard."
else
  echo "⚠️  Webhook devolveu HTTP $HTTP_CODE. Verifique se o domínio está deployado e acessível."
fi

echo ""
echo "─── Passo 3: Assinar a WABA para receber eventos do app (via API) ───"
echo ""

SUBSCRIBE_RESPONSE=$(curl -sS -X POST \
  "https://graph.facebook.com/$WHATSAPP_API_VERSION/$WHATSAPP_BUSINESS_ACCOUNT_ID/subscribed_apps" \
  -H "Authorization: Bearer $WHATSAPP_ACCESS_TOKEN")

echo "Resposta: $SUBSCRIBE_RESPONSE"

if echo "$SUBSCRIBE_RESPONSE" | grep -q '"success":true'; then
  echo "✅ WABA assinada para receber webhook events"
else
  echo "⚠️  Falha ao assinar. Confira o token e se o app tem permissão na WABA."
fi

echo ""
echo "─── Passo 4: Listar apps assinados (sanity check) ───"
echo ""

curl -sS \
  "https://graph.facebook.com/$WHATSAPP_API_VERSION/$WHATSAPP_BUSINESS_ACCOUNT_ID/subscribed_apps" \
  -H "Authorization: Bearer $WHATSAPP_ACCESS_TOKEN" | jq . 2>/dev/null || \
  curl -sS \
  "https://graph.facebook.com/$WHATSAPP_API_VERSION/$WHATSAPP_BUSINESS_ACCOUNT_ID/subscribed_apps" \
  -H "Authorization: Bearer $WHATSAPP_ACCESS_TOKEN"

cat <<EOF

═══════════════════════════════════════════════════════════════════
  Próximos passos:
═══════════════════════════════════════════════════════════════════

1. Adicione seu número WhatsApp como tester no dashboard Meta
   (até 5 testers enquanto o app não estiver em Live mode)
2. Abra wa.me/$WHATSAPP_PHONE_NUMBER_ID?text=Sorteio%20Profills%20Fispal%202026
   (ajuste o número se for outro)
3. Envie a mensagem → deve receber boas-vindas com botões
4. Percorra o fluxo: Aceito → nome → empresa → recebe código

Logs do webhook ficam visíveis em:
   - dev local:  output do \`bun run dev\`
   - Vercel:     Vercel dashboard → Project → Logs → filter "whatsapp:webhook"
EOF
