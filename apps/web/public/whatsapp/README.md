# Assets do bot WhatsApp

Imagens servidas publicamente como mídia das mensagens do bot. WhatsApp Cloud API exige URL HTTPS pública; após deploy na Vercel, qualquer arquivo aqui fica acessível em `https://<dominio>/whatsapp/<arquivo>`.

## Arquivos esperados

- `banner-sorteio.png` — arte principal enviada na mensagem de boas-vindas (TV 65" / Churrasqueira / Cooler). Substitua o placeholder pelo arquivo final antes do evento.

## Como apontar o bot pra essa imagem

No `apps/web/.env`:

```
NEXT_PUBLIC_WHATSAPP_WELCOME_IMAGE_URL="https://<seu-dominio>/whatsapp/banner-sorteio.png"
```

Em dev com `cloudflared tunnel --url http://localhost:3001`, use a URL do tunnel:

```
NEXT_PUBLIC_WHATSAPP_WELCOME_IMAGE_URL="https://<random>.trycloudflare.com/whatsapp/banner-sorteio.png"
```

Se a variável estiver vazia, o bot envia apenas o texto de boas-vindas (sem imagem).
