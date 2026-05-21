# 09 - Deploy na Vercel e Go-Live

## Pré-deploy: checklist final

Antes de fazer `git push`, confirme:

- [ ] `.env.local` não está commitado (`.gitignore` deve conter `.env*.local`)
- [ ] Todos os testes da Fase 8 passaram em ambiente local com ngrok
- [ ] `package.json` tem scripts `build`, `start`, `typecheck`
- [ ] `vercel.json` configurado (especialmente `maxDuration` do webhook)
- [ ] Endpoint de debug (`/api/debug/simulate`) protegido por `NODE_ENV` ou removido

## Configuração de variáveis de ambiente na Vercel

1. <https://vercel.com/dashboard> → seu projeto → **Settings → Environment Variables**
2. Adicione TODAS as variáveis (use o template em `assets/env.example` como referência)

| Variável | Ambiente | Sensível? |
|---|---|---|
| `WHATSAPP_ACCESS_TOKEN` | All | ✅ Secret |
| `WHATSAPP_PHONE_NUMBER_ID` | All | Não |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | All | Não |
| `WHATSAPP_APP_SECRET` | All | ✅ Secret |
| `WHATSAPP_VERIFY_TOKEN` | All | ✅ Secret |
| `WHATSAPP_API_VERSION` | All | Não (default v25.0 — confirme no painel WhatsApp → Configuração da API antes de fixar) |
| `NEXT_PUBLIC_SUPABASE_URL` | All | Não (público) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | Não (público) |
| `SUPABASE_SERVICE_ROLE_KEY` | All | ✅ Secret |
| `NEXT_PUBLIC_EVENT_NAME` | All | Não |
| `NEXT_PUBLIC_EVENT_WHATSAPP_NUMBER` | All | Não |
| `TERMS_VERSION` | All | Não |
| `CRON_SECRET` | All | ✅ Secret (se usar cron) |

⚠️ Variáveis com `NEXT_PUBLIC_` ficam no bundle do cliente — NUNCA marque como `SUPABASE_SERVICE_ROLE_KEY` com prefixo público.

### Preview vs Production vs Development

Por padrão, as variáveis valem para os 3 ambientes. Se você quiser separar:

- **Production**: usado pela URL `vercel.app` ou domínio customizado
- **Preview**: usado em branches que não são `main`
- **Development**: usado quando você roda `vercel dev` local

Para um projeto único de evento, mantenha tudo igual em "All Environments".

## Deploy inicial

### Opção A: Via Git (recomendado)

1. Push para `main`:
   ```bash
   git add .
   git commit -m "feat: WhatsApp raffle bot"
   git push origin main
   ```
2. Vercel detecta automaticamente e faz deploy
3. Acompanhe em **Deployments**

### Opção B: Via CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

Aceite os defaults; ele detecta Next.js automaticamente.

### Verificar o deploy

Após o deploy:

```bash
# Testar a landing
curl -I https://seu-projeto.vercel.app/sorteio
# Esperado: HTTP/2 200

# Testar o handshake do webhook (substitua o token)
curl "https://seu-projeto.vercel.app/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=SEU_VERIFY_TOKEN&hub.challenge=teste"
# Esperado: HTTP/2 200, body: teste
```

Se o handshake falhar:
- Variável `WHATSAPP_VERIFY_TOKEN` configurada na Vercel?
- Você está usando o mesmo valor no curl?
- Veja logs em **Vercel → Logs**

## Atualizar Callback URL no Meta para produção

1. Volte ao Meta for Developers → seu app → **WhatsApp → Configuration**
2. Em **Webhook → Edit** ao lado de Callback URL:
   - **Callback URL**: `https://seu-projeto.vercel.app/api/webhook/whatsapp`
   - **Verify token**: o mesmo valor da variável `WHATSAPP_VERIFY_TOKEN`
3. Clique em **Verify and save**
4. Confirme em **Webhook fields**: `messages` continua marcado

## Sair do modo Development → ir para Live

Em **Development**, apenas números pré-cadastrados em "Recipient phone numbers" recebem mensagens. Em produção real, todo número pode receber.

> ⚠️ **Antes de ir Live, troque o Test Number (+1 555) por um número definitivo da empresa.**
>
> - O Test Number da Meta é gratuito por 90 dias mas tem teto de 5 testers — útil só para smoke test em dev.
> - **NUNCA migre o número comercial principal da empresa** (o que atende clientes via app WhatsApp Business). Migrar para Cloud API é destrutivo: desconecta o número do app, conversas em andamento ficam inacessíveis no celular, vendedores perdem o canal, e o offboarding para reverter leva 24h+. Detalhe em `references/01-meta-setup.md` (warning no topo).
> - Use **chip dedicado** (SIM nova, chip eSIM, número virtual habilitado para SMS/voz da operadora). Coloque em um celular qualquer só para receber o SMS/ligação de verificação no Passo 5 do setup Meta.
> - Atualize `NEXT_PUBLIC_EVENT_WHATSAPP_NUMBER` (E.164 sem `+`) na Vercel ao trocar o número — é o link `wa.me` do QR code.

### Passos

1. No topo do painel do app → **App Mode** → alternar de **Development** para **Live**
2. A Meta pode exigir:
   - **Business Verification**: upload de docs (CNPJ, comprovante de endereço, página oficial)
   - **App Review**: solicitação de permissões avançadas (não é o caso aqui — permissões básicas já estão liberadas)

### Business Verification (se exigida)

1. **Business Settings → Business Info → Start Verification**
2. Documentos típicos:
   - Cartão CNPJ
   - Comprovante de endereço (até 90 dias)
   - Site oficial da empresa
   - Telefone comercial (que a Meta liga para confirmar)
3. Prazo: 1 a 5 dias úteis

**Comece este processo PELO MENOS 7 dias antes do evento.**

### Aprovação do Display Name

Em paralelo, o nome de exibição (o que aparece no chat ao lado do número) precisa ser aprovado.

1. **WhatsApp → Phone Numbers → Settings → Display Name**
2. Regras:
   - Refletir a empresa real
   - Sem termos genéricos como "Bot", "Sorteio", "Atendimento"
   - Compatível com a página oficial / produto da empresa
3. Aprovação: até 48h

Bons exemplos: "Festa Anual XYZ", "Loja Acme"
Ruins: "Bot Sorteio 2026", "Atendimento Premium"

## Verificar que tudo funciona em produção

Repita os casos de teste 1-14 da `references/08-testing.md`, agora com a URL de produção.

Faça check:
- [ ] QR Code aponta para `https://seu-projeto.vercel.app/sorteio`
- [ ] Botão "Participar" abre WhatsApp com mensagem `[SORTEIO]...`
- [ ] Bot responde com termos
- [ ] Fluxo completo gera código
- [ ] Comando SAIR funciona
- [ ] Logs da Vercel mostram a atividade
- [ ] Dados aparecem no Supabase

## Monitoramento durante o evento

### Vercel Logs em tempo real

Deixe aberto durante o evento:
```
Vercel → Project → Logs → Realtime
```

Filtre por `error` para ver problemas imediatamente.

### Notificações por email

**Settings → Notifications → Activity**:
- Ative: **Deployment Failed**
- Ative: **Function Error Rate** (alerta se > 5% de erros)

### Dashboard SQL ao vivo

Mantenha um SQL aberto no Supabase:
```sql
select count(*) as total,
       sum(case when current_state = 'COMPLETED' then 1 else 0 end) as completos
from participants;
```

F5 a cada 5 minutos. Se "completos" não aumenta enquanto pessoas estão escaneando, algo está errado.

## Configurar domínio customizado (opcional)

Se quiser `sorteio.suaempresa.com.br` em vez de `*.vercel.app`:

1. **Vercel → Project → Settings → Domains → Add**
2. Digite `sorteio.suaempresa.com.br`
3. Configure no seu DNS:
   - Tipo: CNAME
   - Nome: sorteio
   - Valor: cname.vercel-dns.com
4. Aguarde propagação (até 24h, geralmente alguns minutos)
5. Vercel emite certificado SSL automaticamente
6. **Atualize a Callback URL no Meta** para usar o novo domínio

## Plan da Vercel: Hobby vs Pro

| Critério | Hobby (free) | Pro ($20/mo) |
|---|---|---|
| Uso comercial | Tecnicamente proibido | Permitido |
| Bandwidth | 100 GB/mês | 1 TB/mês |
| Function invocations | 1M/mês | Ilimitado |
| `maxDuration` | até 60s | até 800s |
| Vercel Analytics | Limitado | Completo |
| Team members | 1 | Ilimitado |
| Suporte | Comunidade | Email |

Para um evento único com 200 pessoas: **Hobby cabe técnica e legalmente** (uso pessoal/teste). Para empresa que vai usar regularmente: **Pro** é o correto.

## Plano do Supabase: Free vs Pro

| Critério | Free | Pro ($25/mo) |
|---|---|---|
| Database | 500 MB | 8 GB inicial |
| Auth users | 50.000 MAUs | 100.000 MAUs |
| Bandwidth | 5 GB | 250 GB |
| Backups | Manual | Diário automático |
| **Auto-pause** | **Sim, após 7 dias inativo** | Não |
| Support | Comunidade | Email |

Para sorteio único: **Free**, mas configure cron de keep-alive (veja `references/02-database-schema.md`).

## Pré-evento: timeline recomendada

| Dia | Ação |
|---|---|
| **D-14** | Iniciar Business Verification se necessário |
| **D-10** | Setup completo do Meta for Developers, tokens gerados |
| **D-7** | Backend funcional, deploy preview na Vercel |
| **D-5** | Mudar para Live mode, Display Name aprovado |
| **D-3** | Testes finais com 5-10 colegas usando celulares reais |
| **D-1** | QR Codes impressos e testados; backup plan definido |
| **D-Dia** | Logs abertos, SQL ao vivo aberto, equipe atenta |
| **D+1** | Exportar CSV, fazer o sorteio |
| **D+30** | Verificar se cron de exclusão LGPD está rodando |

## Backup plan: e se o bot cair durante o evento?

Cenário pessimista mas vale planejar:

### Detecção rápida
- Logs da Vercel mostrando erros 5xx
- SQL ao vivo parado (sem novos registros)
- Reclamação de participante

### Mitigações

1. **Webhook caiu mas Meta funciona**:
   - Verificar tokens (expirou? deslogou?)
   - Verificar variáveis de ambiente
   - Rollback para deployment anterior na Vercel (botão "Promote to Production" em deployment antigo)

2. **Supabase pausou** (free tier):
   - Acesse o dashboard → projeto vai voltar em ~30s
   - Mensagens perdidas durante a pausa são retentadas pela Meta

3. **Número da empresa banido pela Meta** (improvável):
   - Sem solução imediata
   - Ter um número backup configurado em paralelo

4. **Atendente humano de plantão**:
   - Configure o app WhatsApp Business consumidor em outro celular com o **mesmo número** (não, isso não é possível por padrão sem migração)
   - Alternativa: tenha um número de "atendimento" anunciado no banner do evento

## Pós-evento: o que fazer

### Imediatamente após o sorteio

1. Anunciar o ganhador no WhatsApp:
   ```sql
   -- No SQL Editor do Supabase
   select id, name, email, phone, raffle_code
   from participants
   where current_state = 'COMPLETED'
   order by random()
   limit 1;
   ```
2. Notificar o ganhador via WhatsApp (texto livre se ele ainda estiver dentro da janela 24h)
3. Se a janela passou: usar template aprovado de notificação

### Nos dias seguintes

1. **Exportar dados** para CSV (auditoria, registros internos)
2. **Verificar conformidade**: ninguém em `AWAITING_*` há muito tempo? Considere mandar template de reativação
3. **Anonimizar/excluir** conforme retenção prometida nos termos

### Pós-retenção (ex: 60 dias depois)

O cron de cleanup descrito em `references/07-lgpd-compliance.md` deve ter rodado automaticamente. Confirme:

```sql
select count(*) from participants;
-- Esperado: 0
```

## Checklist da Fase 9 (Deploy)

- [ ] `.env*.local` no `.gitignore`
- [ ] Todas variáveis configuradas na Vercel
- [ ] Deploy via push para `main` ou `vercel --prod`
- [ ] Landing acessível em `https://seu-projeto.vercel.app/sorteio`
- [ ] Webhook handshake funciona (curl no GET)
- [ ] Callback URL atualizada no Meta para produção
- [ ] App em modo **Live**
- [ ] Display Name aprovado
- [ ] Business Verification (se exigida) concluída
- [ ] QR Code apontando para URL final
- [ ] Notificações de erro configuradas na Vercel
- [ ] (Opcional) Domínio customizado configurado
- [ ] (Opcional) Cron de keep-alive Supabase
- [ ] (Opcional) Cron de exclusão LGPD

Próximo: `references/10-troubleshooting.md` para problemas comuns.
