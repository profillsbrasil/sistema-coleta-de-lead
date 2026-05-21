# Spec — Diagnóstico do erro mobile no LeadForm

## Contexto

Em produção (Vercel) usuários no **mobile** relatam que o cadastro de lead não conclui. O console do navegador mostra:

```
An invalid form control with name='' is not focusable.
```

O HTML do input com erro:

```html
<input id="lead-name" data-slot="input" aria-invalid="false"
       autocomplete="name" enterkeyhint="next" placeholder="Ex.: Maria Silva"
       required class="..." type="text" value>
```

Note: o input tem `id="lead-name"` mas **não** tem `name=""` atribute (daí o `name=''` no erro). No desktop o fluxo completa normalmente.

Reprodução reportada pelo usuário: *"preencho todos os campos visíveis (nome, empresa, telefone, interesse) e ao clicar Salvar nada acontece — só vejo o erro no log"*.

## Causa raiz — hipóteses

A mensagem vem da **validação HTML5 nativa** (`form.reportValidity()`) que o browser roda **antes** do `e.preventDefault()` do handler React. Quando algum input `required` é considerado invalid, o browser tenta `.focus()` no input e falha por algum motivo. Hipóteses ranqueadas:

| # | Hipótese | Sinal que confirma |
|---|---|---|
| A | **Autofill mobile dessincroniza** o React state. iOS/Android Chrome preenche o DOM sem disparar `input/change` em controlled inputs; o React força `value=""` no re-render, mas no instante do submit pode haver janela em que o DOM tem valor "antigo" do autofill enquanto state está vazio. Erro `name=''` é só consequência de o input não ter atributo `name` para autofill. | DOM value ≠ React state no momento do submit |
| B | **Campo `required` invisível** (algum input dentro de container colapsado ou `display:none` que o browser ainda valida) | Lista de `:invalid` aponta para input fora dos 4 visíveis (nome, empresa, telefone, email) |
| C | **Foco bloqueado por overlay**: botão de submit fica `position: fixed bottom-[68px]` no mobile, sobrepondo o input invalid. O `.focus()` do browser dispara mas a "tentativa de focar" falha porque o input está fora da viewport / atrás do teclado virtual. | Logs mostram `form.checkValidity() === false` com input identificado, e visualmente o input está fora da viewport |
| D | **Browser bloqueia o submit mas o erro é cosmético** — handler React não chega a rodar, e o user interpreta como "não funciona" mesmo quando o problema é só visual. | Log "handleSubmit chamado" nunca aparece |

A correção depende da hipótese real. Por isso este spec instrumenta primeiro e corrige depois.

## Escopo

**In scope** — instrumentação temporária para diagnóstico:

1. Listener `onInvalid` no `<form>` de `lead-form.tsx`
2. Logs estruturados dentro do `handleSubmit` antes do `preventDefault`
3. Toast on-screen com info resumida (user vê no celular sem DevTools)
4. tRPC mutation `debug.logFormDiagnostic` que persiste payload nos Vercel logs
5. User-Agent + viewport size capturados no payload

**Out of scope** — não fazer agora:

- Aplicar o fix definitivo (`noValidate`, atributo `name`, mudanças no UX). Decisão fica para **depois** do diagnóstico.
- Adicionar Sentry ou observabilidade permanente
- Mudar a UI / layout do botão fixed bottom
- Mexer em `PhotoCapture` ou `TagSelector` antes de confirmar que estão envolvidos

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `apps/web/src/components/lead-form.tsx` | Adicionar handler `onInvalid` no `<form>`; enriquecer `handleSubmit` com logs estruturados e disparo da mutation tRPC + toast |
| `packages/api/src/routers/debug.ts` (novo) | Router tRPC com mutation `logFormDiagnostic` aceitando payload Zod, fazendo `console.log` estruturado (Vercel capta) |
| `packages/api/src/routers/index.ts` | Registrar `debug: debugRouter` |

Sem mudanças em schema, DB, env vars.

## Payload coletado

```ts
{
  source: "onInvalid" | "handleSubmit",
  ts: number,                          // Date.now()
  userAgent: string,
  viewport: { w: number; h: number },
  // estado React no instante
  reactState: { name, company, phone, email, interestTag },
  // valor real do DOM (cada input por id)
  domValues: { "lead-name": string, "lead-company": string, ... },
  // do onInvalid event (quando aplicável)
  invalidField?: {
    id: string,
    name: string | null,
    validationMessage: string,
    validity: {
      valueMissing, typeMismatch, patternMismatch,
      tooShort, tooLong, badInput, customError
    },
  },
  // do handleSubmit (quando aplicável)
  checkValidity?: boolean,
  invalidSelectors?: string[],         // querySelectorAll(":invalid") → ids
  submitter?: string | null,           // event.submitter?.id
}
```

## UX da instrumentação

- **Toast**: 6 segundos, dismissible. Conteúdo: `"Debug: <invalidField.id> vazio? state='<value>'/DOM='<value>'"`. Truncar se > 100 chars.
- **Console.log**: payload completo via `console.warn("[lead-form-debug]", payload)` — `warn` para destacar no log do browser.
- **tRPC**: fire-and-forget, sem bloquear o flow. Falha silenciosa se offline.

## Gate de ativação

Sempre ativo em produção até o diagnóstico ser concluído. **NÃO** atrás de query param ou env var — quanto mais reproduções espontâneas o usuário tiver, melhor o sinal.

Ao concluir o diagnóstico, **remover toda a instrumentação em commit dedicado** (`revert: remover instrumentação de debug do lead-form`). Lembrar de também remover o router `debug` se nada mais for usar.

## Plano de verificação

1. **Local**: rodar `bun run dev:web`, abrir `/leads/new` no Chrome DevTools mobile emulation (iPhone 14 / Android Pixel). Reproduzir manualmente: deixar nome vazio e tentar submeter. Confirmar que `onInvalid` dispara, toast aparece, console mostra payload, tRPC mutation é chamada.
2. **Teste unitário**: não — instrumentação temporária não merece teste. A correção final terá.
3. **Deploy**: push para `main` → Vercel deploya. Avisar usuário.
4. **Coleta**: pedir ao usuário para reproduzir 2-3 vezes no celular real, e mandar prints/relato dos toasts. Conferir Vercel logs para a payload completa.
5. **Análise**: ranquear as 4 hipóteses contra a evidência coletada. Escrever um spec de fix baseado no padrão dominante (provavelmente "Padrão A — autofill dessync" se DOM ≠ state aparecer).

## Critério de "diagnóstico concluído"

- 2+ reproduções com payload completo em Vercel logs OU prints do toast
- Hipótese A/B/C/D identificada como dominante
- Spec de fix curto escrito apontando para o padrão real
- Issue criada para tracking da remoção da instrumentação

## Riscos

| Risco | Mitigação |
|---|---|
| Vazamento de PII nos logs (nome/empresa/telefone do user em payload) | Os logs ficam em Vercel (mesma infraestrutura que já loga o DB). Não enviar para terceiros. Truncar telefone para últimos 4 dígitos no payload. |
| Toast bagunça UX do user real | Toast só aparece quando o erro acontece (constraint violation ou Zod fail). User comum não vê. Em desktop e mobile saudável, segue normal. |
| Instrumentação esquecida em prod | Criar entrada em `docs/tech-debt.md` lembrando da remoção. Ou criar issue no GitHub. |
| `console.warn` pode poluir logs do browser do user | Aceitável durante o diagnóstico. Removido no commit de cleanup. |
