# 07 - LGPD: Termos, Consentimento e Direitos do Titular

A LGPD (Lei nº 13.709/2018) se aplica diretamente aqui — você está tratando dados pessoais (nome, email, telefone) para uma finalidade específica. Implementação simples, mas obrigatória.

> ⚠️ **Este documento é orientação geral, não consultoria jurídica.** Para sorteio com premiação relevante (eletrônicos, viagens, dinheiro), peça revisão de advogado especializado. Atenção também à Lei nº 5.768/1971 e Portaria SECAP que regulam distribuição gratuita de prêmios — alguns sorteios precisam de **autorização do Ministério da Fazenda** (SECAP) independente de LGPD.

## O que minimamente deve constar nos termos

Pela LGPD, arts. 8º (consentimento) e 9º (informação ao titular):

| Item | Conteúdo |
|---|---|
| 1. Identificação do controlador | Nome da empresa, e-mail de contato, idealmente CNPJ |
| 2. Quais dados serão coletados | Nome, e-mail, telefone (WhatsApp) — apenas o essencial |
| 3. Finalidade específica | "Realizar o sorteio" e "comunicar o resultado" — nada mais |
| 4. Base legal | Art. 7º, I (consentimento) |
| 5. Compartilhamento com terceiros | Declarar explicitamente "nenhum" |
| 6. Tempo de retenção | Ex: "até 60 dias após o evento" |
| 7. Direitos do titular (art. 18) | Acesso, correção, eliminação, revogação — e COMO exercê-los |
| 8. Possibilidade de não consentir | E suas consequências (não participa do sorteio) |

## Princípio da minimização

A LGPD exige coletar **apenas o necessário** para a finalidade. Para um sorteio:

- ✅ Nome (anunciar ganhador)
- ✅ Email (comunicar fora do WhatsApp se preciso)
- ✅ Telefone (já é o canal de comunicação)
- ❌ CPF (só faria sentido para sorteios homologados pela SECAP)
- ❌ Endereço (a não ser que precise entregar prêmio fisicamente)
- ❌ Data de nascimento (irrelevante)
- ❌ Profissão (irrelevante)

**Não coletar dado que "talvez seja útil no futuro".** Isso viola o princípio da finalidade.

## Como armazenar o consentimento (prova auditável)

Três colunas na tabela `participants`:

| Coluna | Conteúdo | Justificativa |
|---|---|---|
| `terms_accepted_at` | Timestamp UTC do clique em "Aceito" | Prova de quando |
| `terms_version` | Ex: `v1` | Prova de qual versão (mudou de redação? mudou versão) |
| `terms_text_snapshot` | Texto EXATO mostrado naquele momento | Prova do que aceitou (mesmo que mude depois) |

> Por que `terms_text_snapshot` e não só uma referência à versão? Porque se você for processado por algo, precisa provar **exatamente** o texto que o titular consentiu — não basta um "v1" que pode ter mudado de servidor em servidor. Snapshot resolve isso de forma simples.

## Texto sugerido para os termos

Cabe nos 1024 chars do body de botões interativos do WhatsApp:

```
📜 Termos & LGPD

Coletaremos seu nome, e-mail e WhatsApp para:
✓ Realizar o sorteio
✓ Comunicar o resultado

Não compartilharemos com terceiros. Envie SAIR a qualquer momento para excluir seus dados.

Base legal: art. 7º, I da LGPD (Lei 13.709/2018).
Controlador: [Sua Empresa] — contato: [email@empresa.com].

Aceita participar?
```

Características:
- Curto (cabe no WhatsApp)
- Cumpre os 8 itens da lista acima de forma mínima
- Linguagem acessível (não jurídiquês)
- Inclui base legal e dados do controlador
- Explica como exercer o direito de exclusão

## Texto expandido (caso queira versão completa em página separada)

Se a empresa preferir um termo mais robusto, hospede em página própria (`/termos-sorteio`) e refira no WhatsApp:

```
📜 Termos do Sorteio + LGPD

Resumo: coletamos nome, e-mail e WhatsApp para realizar o sorteio e comunicar o resultado. Envie SAIR a qualquer momento.

Termos completos: https://exemplo.com/termos-sorteio
Política de privacidade: https://exemplo.com/privacidade

Aceita participar?
```

Conteúdo da página de termos:

```markdown
# Termos do Sorteio + Política de Privacidade

## 1. Quem somos
[Nome da Empresa], CNPJ [XX.XXX.XXX/0001-XX], com sede em [endereço].
Encarregado de Dados (DPO): [nome], e-mail: [dpo@empresa.com]

## 2. Quais dados coletamos
- Nome completo
- E-mail
- Número de WhatsApp

## 3. Para que usaremos seus dados
- Realizar o sorteio durante o evento [nome do evento] em [data]
- Comunicar o resultado ao ganhador via WhatsApp e e-mail
- Auditoria interna da realização do sorteio

## 4. Base legal
Consentimento expresso, conforme art. 7º, I da Lei nº 13.709/2018 (LGPD).

## 5. Compartilhamento
Não compartilhamos seus dados com terceiros. Os dados ficam armazenados em [provedor — ex: Supabase, hospedado em [região]] sob nossa responsabilidade.

## 6. Tempo de armazenamento
Seus dados serão excluídos automaticamente em até 60 dias após o sorteio. Você pode pedir exclusão antes disso a qualquer momento (item 8).

## 7. Segurança
Implementamos medidas técnicas razoáveis: criptografia em trânsito (HTTPS/TLS), acesso restrito por chave de serviço, logs de acesso.

## 8. Seus direitos (art. 18 da LGPD)
Você pode, gratuitamente, a qualquer momento:
- **Acessar** seus dados (envie STATUS pelo WhatsApp)
- **Corrigir** dados incorretos (entre em contato)
- **Excluir** seus dados (envie SAIR pelo WhatsApp)
- **Revogar** o consentimento (envie SAIR)
- **Solicitar portabilidade** (entre em contato)

## 9. Reclamações
Se entender que seus direitos foram violados, pode contatar a Autoridade Nacional de Proteção de Dados (ANPD): https://www.gov.br/anpd

## 10. Atualizações
Esta política pode ser atualizada. A versão vigente no momento do seu consentimento permanece aplicável aos seus dados.

Última atualização: [data]
Versão: v1
```

## Implementação no código

Arquivo: `lib/lgpd.ts`

```ts
// ============================================
// Versão dos termos
// ============================================
// Incrementar para "v2", "v3"... a cada mudança de texto.
// Permite distinguir quem aceitou cada versão.
export const TERMS_VERSION = "v1";

// ============================================
// Texto exato dos termos
// ============================================
// IMPORTANTE: este texto é salvo como snapshot na coluna
// terms_text_snapshot no momento do aceite. Se mudar este texto:
//   1. Incremente TERMS_VERSION
//   2. Mude os IDs dos botões para accept_terms_v2 / decline_terms_v2
//   3. Atualize o parsing em handleTermsResponse para reconhecer ambos
export const TERMS_TEXT = `📜 *Termos & LGPD*

Coletaremos seu *nome*, *e-mail* e *WhatsApp* (já fornecido) para:
✓ Realizar o sorteio
✓ Comunicar o resultado

Não compartilharemos com terceiros. Envie *SAIR* para excluir seus dados a qualquer momento.

Base legal: art. 7º, I da LGPD (Lei nº 13.709/2018).
Controlador: [Nome da Empresa] — contato: [email@empresa.com].

Aceita participar?`;
```

⚠️ **Substitua os placeholders**: `[Nome da Empresa]`, `[email@empresa.com]`.

## Direito de exclusão: comando `SAIR`

Implementação já está em `lib/state-machine.ts` — recapitulando:

```ts
// Comando universal: SAIR (direito de exclusão LGPD art. 18 VI)
const messageText = (msg.text?.body ?? "").trim().toLowerCase();
if (messageText === "sair" || messageText === "excluir") {
  await supabaseAdmin.from("participants").delete().eq("phone", phone);
  await sendText(
    phone,
    "✅ Seus dados foram completamente excluídos do nosso sistema.\n\n" +
      "Obrigado por participar! Se mudar de ideia, basta nos chamar de novo."
  );
  return;
}
```

Pontos importantes:
- O comando funciona em **qualquer estado** (antes do despacho por estado)
- A exclusão é **completa** (DELETE, não soft delete) — princípio da minimização
- O usuário recebe confirmação imediata
- Se ele iniciar nova conversa depois, começa do zero (fluxo normal)

### Por que DELETE e não soft delete?

Soft delete (marcar como inativo mas manter os dados) é uma anti-prática para LGPD. O direito do art. 18, VI é à **eliminação** dos dados tratados com consentimento.

Exceções legais (que não se aplicam ao seu caso):
- Cumprimento de obrigação legal (ex: nota fiscal — manter 5 anos)
- Estudo por órgão de pesquisa (anonimizado)
- Transferência a terceiro com consentimento

Para um sorteio, DELETE direto é correto.

## Versionamento de termos: quando e como

Quando MUDAR a redação dos termos:

1. Incremente `TERMS_VERSION` para `"v2"`
2. Atualize `TERMS_TEXT` com o novo conteúdo
3. Mude os IDs dos botões:
   ```ts
   { id: "accept_terms_v2", title: "✅ Aceito" },
   { id: "decline_terms_v2", title: "❌ Não aceito" },
   ```
4. Atualize o handler para reconhecer ambos durante migração:
   ```ts
   const accepted =
     buttonId === "accept_terms_v2" ||
     buttonId === "accept_terms_v1" || // legado
     ["aceito", "sim", "concordo"].includes(textLower);
   ```

Quem aceitou v1 fica protegido — você prova qual versão cada um aceitou via `terms_version` e `terms_text_snapshot`.

### Exemplo de mudança que justifica nova versão

- ✅ Adicionou nova finalidade (ex: "também usaremos para newsletter")
- ✅ Mudou o tempo de retenção (ex: "60 dias" para "1 ano")
- ✅ Adicionou compartilhamento com novo terceiro
- ❌ Corrigiu um typo (não muda direitos do titular)

## Cron de exclusão automática (retenção)

Se prometeu que dados serão excluídos em 60 dias após o evento, automatize:

```ts
// app/api/cron/cleanup/route.ts
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: Request) {
  // Validar que vem da Vercel Cron
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const eventDate = new Date(process.env.EVENT_DATE!); // ex: "2026-06-15"
  const retentionEndsAt = new Date(eventDate);
  retentionEndsAt.setDate(retentionEndsAt.getDate() + 60);

  if (new Date() < retentionEndsAt) {
    return Response.json({ ok: true, message: "Ainda dentro do prazo" });
  }

  const { count } = await supabaseAdmin
    .from("participants")
    .delete()
    .gt("created_at", "1970-01-01"); // deleta tudo

  return Response.json({
    ok: true,
    deleted: count,
    deletedAt: new Date().toISOString(),
  });
}
```

`vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/cleanup", "schedule": "0 3 * * *" }
  ]
}
```

Roda diariamente às 3h UTC. Quando passar dos 60 dias após o evento, deleta tudo.

## Política de Privacidade vs Termos do Sorteio

Para evento específico, um documento único combinando ambos funciona. Para empresa que tem sorteios recorrentes:
- **Política de Privacidade**: documento geral da empresa, pouco muda
- **Termos do Sorteio**: específico por evento, com regras + base LGPD

Referencie um dentro do outro.

## Caso o usuário não envie SAIR mas peça por outros meios

A LGPD não exige um canal específico. Se o usuário mandar e-mail para `dpo@empresa.com` pedindo exclusão, você precisa atender em até 15 dias úteis (art. 19).

Fluxo manual:
1. Confirmar identidade (pedir o telefone usado)
2. `DELETE FROM participants WHERE phone = '...'`
3. Confirmar exclusão por e-mail

## Auditoria: provando que você cumpriu

Cenário: titular reclama na ANPD. Você precisa provar:
1. Que tinha base legal (consentimento)
2. Que coletou apenas o necessário
3. Que excluiu quando pedido
4. Que protegeu os dados

Com a implementação acima, você tem:
- `terms_accepted_at` (quando consentiu)
- `terms_version` + `terms_text_snapshot` (o que consentiu)
- Logs da Vercel mostrando o comando SAIR e o DELETE
- HTTPS forçado (TLS em trânsito)
- Service role key no servidor apenas (acesso restrito)
- RLS ativado no Supabase (defesa em profundidade)

## Checklist da Fase 7 (LGPD)

- [ ] Texto dos termos definido com 8 itens obrigatórios
- [ ] Placeholders substituídos (nome da empresa, e-mail de contato)
- [ ] `lib/lgpd.ts` criado com `TERMS_VERSION` e `TERMS_TEXT`
- [ ] Snapshot do texto salvo em `terms_text_snapshot` no momento do aceite
- [ ] Comando `SAIR` funcional em qualquer estado
- [ ] Exclusão é DELETE (não soft delete)
- [ ] Confirmação enviada ao usuário após exclusão
- [ ] (Recomendado) Cron de exclusão automática após retenção
- [ ] (Recomendado) Página separada com termos completos
- [ ] (Para sorteios com prêmio relevante) Verificada necessidade de autorização SECAP

Próximo: `references/08-testing.md`.
