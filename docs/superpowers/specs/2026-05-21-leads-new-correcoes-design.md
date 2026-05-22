# Spec — Correções na tela `/leads/new`

## Contexto

A tela `/leads/new` (`apps/web/src/app/(app)/leads/new/page.tsx` → `LeadForm`) é o fluxo principal do produto: captação rápida de leads em eventos, offline-first. Uma auditoria do componente revelou problemas de UX e de tratamento de erro que prejudicam o objetivo central do produto — **não perder dados quando a rede falha**.

O gatilho foi uma queixa: "clico em Salvar e não vai" no mobile. A investigação mostrou que o botão fica `disabled` quando falta campo obrigatório, e tocar um botão desabilitado no mobile não dá nenhum feedback — o vendedor não sabe o que falta.

Esta spec cobre 8 correções (A–H) na tela e nos seus módulos de apoio.

## Como a tela funciona hoje

- `LeadForm` é um componente client-side com estado co-localizado (12 `useState`).
- Campos obrigatórios: **nome**, **empresa**, **telefone OU email**. Interesse tem default `"morno"`.
- `saveLead` (`lib/lead/save-lead.ts`) grava no IndexedDB via Dexie + enfileira em `syncQueue`. O sync engine sincroniza depois.
- Foto é opcional, capturada e comprimida client-side (`lib/lead/compression.ts`).
- Botão "Salvar" vive num `<div>` fixo no rodapé (mobile) / inline (desktop), associado ao `<form>` via `form="lead-form"`.
- O `<form>` tem `noValidate` (correção anterior) — a validação é 100% via Zod em `handleSubmit`.

## Problemas e correções

### A — Botão `disabled` sem feedback ao toque

**Problema:** `disabled={submitDisabled}` onde `submitDisabled = isSubmitting || !(isEditMode || hasMinimum)`. Em criação, o botão fica cinza até nome+empresa+contato estarem preenchidos. Tocar um botão `disabled` no mobile = silêncio absoluto. O `missingHint` existe mas fica no header, longe do botão.

**Correção:** o botão passa a usar `disabled={isSubmitting}` apenas. Sempre clicável (exceto durante o save). Ao tocar com form incompleto, `handleSubmit` roda — o Zod já falha, `setErrors` popula os erros e `focusFirstError` foca o primeiro campo inválido. O `missingHint` no header permanece como nudge proativo. `hasMinimum` continua existindo apenas para alimentar o `missingHint`.

**Arquivo:** `apps/web/src/components/lead-form.tsx`.

### B — Pré-checagem de storage (sem nunca bloquear o lead)

**Problema:** `checkStorageAndCompress` lança `Error("Armazenamento cheio (>90%)...")` quando o storage está acima de 90%. Esse erro é capturado pelo `catch` genérico do `handleSubmit`, que mostra `"Algo deu errado. Tente novamente."` — escondendo a causa real. Pior: um storage cheio bloquearia o save inteiro, violando o princípio "não perder dados".

**Correção:** o storage cheio nunca impede salvar o lead (o texto é minúsculo). Apenas a **foto** (opcional, pesada) é afetada.

1. `compression.ts` ganha `getStorageStatus(): Promise<"ok" | "warning" | "full">` — encapsula o `navigator.storage.estimate()` e a classificação (`>= 0.9` → `full`, `>= 0.8` → `warning`, senão `ok`).
2. `checkStorageAndCompress` perde o `throw`: passa a comprimir de forma adaptativa e nunca bloquear. Renomeada para `compressForStorage` para refletir que não decide mais sobre bloqueio.
3. `lead-form.tsx`:
   - `useEffect` ao montar chama `getStorageStatus()` e popula o estado `storageFull` (`status === "full"`).
   - Quando `storageFull`, renderiza um banner no topo do `<form>`: *"Armazenamento quase cheio. As fotos estão indisponíveis — o lead será salvo normalmente."*
   - `PhotoCapture` recebe `disabled` quando `storageFull`.
   - No `handleSubmit`, se houver foto e o storage estiver `full` no momento do save, o lead é gravado **sem a foto** e um `toast` avisa: *"Lead salvo sem foto — armazenamento cheio."*
4. `save-lead.ts`: a decisão de bloqueio sai daqui. `saveLead` continua recebendo `photo` e comprimindo via `compressForStorage`; não inspeciona mais o status de storage para decidir.

**Arquivos:** `apps/web/src/lib/lead/compression.ts`, `apps/web/src/lib/lead/save-lead.ts`, `apps/web/src/components/lead-form.tsx`.

### C — Captura de foto sem `catch`

**Problema:** `PhotoCapture.handleFileChange` envolve `compressImage` num `try/finally` sem `catch`. Se `compressImage` rejeitar (`"Canvas toBlob failed"`, `"Failed to get canvas 2d context"`), a exceção vira unhandled rejection; a foto não aparece e o usuário não recebe aviso.

**Correção:** adicionar `catch` que mostra `toast.error("Não foi possível processar a foto. Tente novamente.")`. Importar `toast` de `sonner` em `photo-capture.tsx`.

**Arquivo:** `apps/web/src/components/photo-capture.tsx`.

### D — Mensagens de validação sem acento

**Problema:** `leadFormSchema` tem mensagens sem acentuação: `"Nome e obrigatorio"`, `"Email invalido"`, `"Empresa e obrigatoria"`. Viola a convenção de PT do projeto.

**Correção:** corrigir para `"Nome é obrigatório"`, `"Email inválido"`, `"Empresa é obrigatória"`. A mensagem do `refine` (`"Informe telefone ou email"`) já está correta.

**Arquivo:** `apps/web/src/lib/lead/validation.ts`.

### E — Guard contra double-save

**Problema:** `handleSubmit` não verifica `isSubmitting` no início. Dois submits rápidos (ex.: Enter repetido no teclado mobile) podem rodar `handleSubmit` duas vezes antes do re-render que desabilita o botão, criando dois leads distintos no IndexedDB (cada um com `localId` próprio).

**Correção:** após `e.preventDefault()`, adicionar `if (isSubmitting) return;` no topo do `handleSubmit`.

**Arquivo:** `apps/web/src/components/lead-form.tsx`.

### F — Feedback local-first no toast de sucesso

**Problema:** o toast `"Lead salvo!"` não comunica que o dado foi salvo localmente e será sincronizado. Num evento offline, o vendedor pode ficar inseguro.

**Correção:** adicionar `description: "Será sincronizado automaticamente."` ao `toast.success` da criação. Título "Lead salvo!" e a ação "Editar" permanecem. O toast de edição (`"Lead atualizado!"`) recebe o mesmo `description`.

**Arquivo:** `apps/web/src/components/lead-form.tsx`.

### G — `enterKeyHint` coerente

**Problema:** todos os inputs da cadeia (nome, empresa, telefone, email) têm `enterKeyHint="next"`, mas o email é o fim da cadeia de campos obrigatórios — "next" ali é incoerente.

**Correção:** o input de email passa a `enterKeyHint="done"`. Os demais mantêm `"next"` (sinalização visual de progressão). Não se implementa navegação automática entre campos — fora de escopo (ajuste menor).

**Arquivo:** `apps/web/src/components/lead-form.tsx`.

### H — `resetForm` não fecha o Collapsible

**Problema:** após salvar na criação, `resetForm` limpa os campos extras (cargo/segmento/notas) mas não fecha o `Collapsible` "Mais informações" nem reseta `extrasOpen`.

**Correção:** adicionar `setExtrasOpen(false)` ao `resetForm`.

**Arquivo:** `apps/web/src/components/lead-form.tsx`.

## Escopo

**In scope:** as 8 correções A–H acima e a atualização dos testes afetados.

**Out of scope:**
- Navegação automática entre campos com `enterKeyHint` (apenas o rótulo é corrigido em G)
- Redesign visual da tela / polish de espaçamento (impeccable fica para depois, se desejado)
- Mudanças no sync engine ou no schema Dexie
- Mexer em `public.leads` / `public.user` ou qualquer schema dos vendedores no servidor
- Pré-checagem de storage em outras telas que não `/leads/new`

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `apps/web/src/components/lead-form.tsx` | A, B (banner + estado + handleSubmit), E, F, G, H |
| `apps/web/src/components/photo-capture.tsx` | B (prop `disabled`), C (catch + toast) |
| `apps/web/src/lib/lead/compression.ts` | B (`getStorageStatus`, `compressForStorage` sem throw) |
| `apps/web/src/lib/lead/save-lead.ts` | B (usar `compressForStorage`, sem decisão de bloqueio) |
| `apps/web/src/lib/lead/validation.ts` | D (acentuação) |
| `apps/web/src/lib/lead/compression.test.ts` | atualizar testes de storage (sem throw, `getStorageStatus`) |
| `apps/web/src/lib/lead/validation.test.ts` | atualizar strings esperadas com acento |

## Detalhe técnico — `getStorageStatus`

```ts
export type StorageStatus = "ok" | "warning" | "full";

export async function getStorageStatus(): Promise<StorageStatus> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return "ok";
  }
  const { usage, quota } = await navigator.storage.estimate();
  if (quota == null || quota === 0) {
    return "ok";
  }
  const ratio = (usage ?? 0) / quota;
  if (ratio >= 0.9) {
    return "full";
  }
  if (ratio >= 0.8) {
    return "warning";
  }
  return "ok";
}
```

`compressForStorage` reusa essa função: se `warning`, comprime para `COMPRESSED_DIMENSION` (800px); senão retorna o blob como está. Nunca lança por motivo de storage.

## Plano de verificação

1. **Testes unitários:** `bun run test` — `compression.test.ts` cobre `getStorageStatus` (`ok`/`warning`/`full` por ratio, e o fallback quando `navigator.storage` é indefinido) e `compressForStorage` (não lança em storage cheio). `validation.test.ts` confere as mensagens acentuadas.
2. **Typecheck + lint:** `bun run check-types` e `bun run check` passam.
3. **Teste manual no dev server (mobile emulation Chrome/Brave, viewport ~400px):**
   - Form vazio → tocar "Salvar" → erros vermelhos inline aparecem, primeiro campo recebe foco, **nenhum** erro no console.
   - Preencher nome + empresa + telefone → "Salvar" → toast "Lead salvo!" com descrição de sync, form reseta, Collapsible fechado.
   - Email inválido → "Salvar" → erro "Email inválido" inline.
   - Captura de foto com erro simulado (mock de `compressImage` rejeitando) → toast de erro de foto.
   - Double-tap rápido em "Salvar" → apenas um lead criado.
4. **Storage cheio (difícil de simular real):** validar via teste unitário de `getStorageStatus`/`compressForStorage`; o banner é validado visualmente forçando `storageFull` em dev.

## Riscos

| Risco | Mitigação |
|---|---|
| Botão sempre clicável → mais submits inválidos | Esperado e desejável — o Zod dá feedback. Guard de `isSubmitting` (E) evita double-save. |
| `getStorageStatus` indisponível em algum browser | Fallback retorna `"ok"` quando `navigator.storage.estimate` não existe — comportamento atual preservado. |
| Banner de storage ocupa espaço no form mobile | Só aparece quando `full` (raro). Texto curto, uma linha ou duas. |
| Renomear `checkStorageAndCompress` → `compressForStorage` quebra import | Só `save-lead.ts` importa; atualizar na mesma mudança. `compression.test.ts` também referencia. |
