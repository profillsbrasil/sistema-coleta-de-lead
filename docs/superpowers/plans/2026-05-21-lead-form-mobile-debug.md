# Lead Form Mobile Debug Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar instrumentação temporária no `LeadForm` para diagnosticar erro mobile `An invalid form control with name='' is not focusable`, capturando estado React, DOM values, validity e contexto via 3 canais (console.warn, toast on-screen, tRPC mutation persistida em Vercel logs).

**Architecture:** Listener `onInvalid` no `<form>` + enriquecimento do `handleSubmit` com captura completa do contexto. Payload é enviado via tRPC mutation `debug.logFormDiagnostic` fire-and-forget, exibido em toast curto, e logado no console. Toda a instrumentação é temporária e será removida em commit dedicado após o diagnóstico (entrada criada em `docs/tech-debt.md`).

**Tech Stack:** Next.js 16, React 19, tRPC 11 (`@trpc/tanstack-react-query`), Zod, sonner (toast). Sem mudanças em DB, env vars ou schema.

**Spec:** `docs/superpowers/specs/2026-05-21-lead-form-mobile-debug-design.md`

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `packages/api/src/routers/debug.ts` (novo) | Router tRPC `debugRouter` com `logFormDiagnostic` mutation. Aceita payload Zod e faz `console.warn` estruturado (Vercel capta) |
| `packages/api/src/routers/index.ts` | Registrar `debug: debugRouter` no `appRouter` |
| `apps/web/src/components/lead-form.tsx` | Adicionar handler `onInvalid`, enriquecer `handleSubmit`, exibir toast com info debug, chamar mutation tRPC |
| `docs/tech-debt.md` | Nova entrada lembrando da remoção da instrumentação |

Sem arquivos de teste — instrumentação temporária. O fix definitivo (após diagnóstico) terá testes.

---

### Task 1: Criar router tRPC `debug.logFormDiagnostic` e registrar no `appRouter`

**Files:**
- Create: `packages/api/src/routers/debug.ts`
- Modify: `packages/api/src/routers/index.ts`

- [ ] **Step 1: Criar `packages/api/src/routers/debug.ts`**

```ts
import { z } from "zod";
import { publicProcedure, router } from "../index";

const formDiagnosticInput = z.object({
	source: z.enum(["onInvalid", "handleSubmit"]),
	ts: z.number(),
	userAgent: z.string().max(500),
	viewport: z.object({ w: z.number(), h: z.number() }),
	reactState: z.record(z.string(), z.unknown()),
	domValues: z.record(z.string(), z.string()),
	invalidField: z
		.object({
			id: z.string(),
			name: z.string().nullable(),
			validationMessage: z.string(),
			validity: z.record(z.string(), z.boolean()),
		})
		.optional(),
	checkValidity: z.boolean().optional(),
	invalidSelectors: z.array(z.string()).optional(),
	submitter: z.string().nullable().optional(),
});

export const debugRouter = router({
	logFormDiagnostic: publicProcedure
		.input(formDiagnosticInput)
		.mutation(({ input }) => {
			console.warn("[lead-form-debug]", JSON.stringify(input));
			return { ok: true };
		}),
});
```

- [ ] **Step 2: Registrar `debugRouter` em `packages/api/src/routers/index.ts`**

Estado atual (linhas 1-18):

```ts
import { protectedProcedure, publicProcedure, router } from "../index";
import { adminRouter } from "./admin/index";
import { leaderboardRouter } from "./leaderboard";
import { syncRouter } from "./sync";
import { whatsappRouter } from "./whatsapp";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => "OK"),
	privateData: protectedProcedure.query(({ ctx }) => ({
		message: "This is private",
		user: ctx.user,
	})),
	admin: adminRouter,
	leaderboard: leaderboardRouter,
	sync: syncRouter,
	whatsapp: whatsappRouter,
});
export type AppRouter = typeof appRouter;
```

Adicionar import + entrada do router:

```ts
import { protectedProcedure, publicProcedure, router } from "../index";
import { adminRouter } from "./admin/index";
import { debugRouter } from "./debug";
import { leaderboardRouter } from "./leaderboard";
import { syncRouter } from "./sync";
import { whatsappRouter } from "./whatsapp";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => "OK"),
	privateData: protectedProcedure.query(({ ctx }) => ({
		message: "This is private",
		user: ctx.user,
	})),
	admin: adminRouter,
	debug: debugRouter,
	leaderboard: leaderboardRouter,
	sync: syncRouter,
	whatsapp: whatsappRouter,
});
export type AppRouter = typeof appRouter;
```

- [ ] **Step 3: Rodar typecheck**

```bash
bun run check-types
```

Expected: PASS sem erros. O `AppRouter` agora expõe `debug.logFormDiagnostic`.

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/routers/debug.ts packages/api/src/routers/index.ts
git commit -m "feat: router tRPC debug.logFormDiagnostic"
```

---

### Task 2: Instrumentar `LeadForm` com `onInvalid` + handleSubmit enriquecido

**Files:**
- Modify: `apps/web/src/components/lead-form.tsx`

- [ ] **Step 1: Adicionar imports necessários no topo do arquivo**

No bloco de imports existente (linhas 1-21), adicionar `useMutation` ao import do tanstack (criar import novo) e import do `trpc`:

```ts
import { useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
```

Ambos os imports devem ficar em ordem alfabética. `useMutation` em sua própria linha (não há outro import de `@tanstack/react-query` no arquivo hoje). `trpc` pode ir junto dos outros `@/` imports.

- [ ] **Step 2: Adicionar helper `buildDiagnostic` e mask de telefone para PII no topo do arquivo (acima do componente, abaixo de `getInitialState`)**

Inserir após a função `getInitialState` (linha 59) e antes do `export default function LeadForm`:

```ts
function maskPhoneForLog(value: string): string {
	const digits = value.replace(/\D/g, "");
	if (digits.length <= 4) {
		return digits;
	}
	return `***${digits.slice(-4)}`;
}

function readDomValue(form: HTMLFormElement, id: string): string {
	const el = form.elements.namedItem(id);
	if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
		return el.value;
	}
	return "";
}

function collectInvalidSelectors(form: HTMLFormElement): string[] {
	const invalid = form.querySelectorAll(":invalid");
	return Array.from(invalid).map((el) => {
		const id = (el as HTMLElement).id;
		const tag = el.tagName.toLowerCase();
		return id ? `#${id}` : `<${tag}>`;
	});
}
```

- [ ] **Step 3: Adicionar a mutation tRPC dentro do componente, junto com os outros hooks (depois de `useRouter` e antes dos `useState`)**

Após a linha `const router = useRouter();` (linha 70), inserir:

```ts
const diagnosticMutation = useMutation(
	trpc.debug.logFormDiagnostic.mutationOptions({
		onError: () => {
			// silencioso — instrumentação não pode quebrar o fluxo
		},
	})
);
```

- [ ] **Step 4: Adicionar handler `handleInvalid` antes do `handleSubmit` (cerca da linha 147)**

Inserir uma função antes de `async function handleSubmit`:

```ts
function handleInvalid(e: React.FormEvent<HTMLFormElement>) {
	const target = e.target as HTMLInputElement;
	const form = e.currentTarget;
	const validity = target.validity;
	const payload = {
		source: "onInvalid" as const,
		ts: Date.now(),
		userAgent: navigator.userAgent.slice(0, 500),
		viewport: { w: window.innerWidth, h: window.innerHeight },
		reactState: {
			name,
			company,
			phone: maskPhoneForLog(phone),
			email,
			interestTag,
		},
		domValues: {
			"lead-name": readDomValue(form, "lead-name"),
			"lead-company": readDomValue(form, "lead-company"),
			"lead-phone": maskPhoneForLog(readDomValue(form, "lead-phone")),
			"lead-email": readDomValue(form, "lead-email"),
		},
		invalidField: {
			id: target.id || "",
			name: target.name || null,
			validationMessage: target.validationMessage,
			validity: {
				valueMissing: validity.valueMissing,
				typeMismatch: validity.typeMismatch,
				patternMismatch: validity.patternMismatch,
				tooShort: validity.tooShort,
				tooLong: validity.tooLong,
				badInput: validity.badInput,
				customError: validity.customError,
			},
		},
	};
	console.warn("[lead-form-debug]", payload);
	const truncatedMsg = `${target.id || "?"}: ${target.validationMessage}`.slice(
		0,
		120
	);
	toast.error(`Debug invalid → ${truncatedMsg}`, { duration: 6000 });
	diagnosticMutation.mutate(payload);
}
```

- [ ] **Step 5: Enriquecer `handleSubmit` para logar antes do `preventDefault`**

A função `handleSubmit` atual começa assim (linhas 147-150):

```ts
async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
	e.preventDefault();
	setErrors({});
```

Substituir o corpo inicial para capturar diagnóstico ANTES do `preventDefault`:

```ts
async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
	const form = e.currentTarget;
	const nativeEvent = e.nativeEvent as SubmitEvent;
	const submitterId =
		nativeEvent.submitter instanceof HTMLElement
			? nativeEvent.submitter.id || null
			: null;
	const handleSubmitPayload = {
		source: "handleSubmit" as const,
		ts: Date.now(),
		userAgent: navigator.userAgent.slice(0, 500),
		viewport: { w: window.innerWidth, h: window.innerHeight },
		reactState: {
			name,
			company,
			phone: maskPhoneForLog(phone),
			email,
			interestTag,
		},
		domValues: {
			"lead-name": readDomValue(form, "lead-name"),
			"lead-company": readDomValue(form, "lead-company"),
			"lead-phone": maskPhoneForLog(readDomValue(form, "lead-phone")),
			"lead-email": readDomValue(form, "lead-email"),
		},
		checkValidity: form.checkValidity(),
		invalidSelectors: collectInvalidSelectors(form),
		submitter: submitterId,
	};
	console.warn("[lead-form-debug]", handleSubmitPayload);
	diagnosticMutation.mutate(handleSubmitPayload);

	e.preventDefault();
	setErrors({});
```

O restante do `handleSubmit` (validação Zod, `setIsSubmitting`, etc.) permanece **igual**.

- [ ] **Step 6: Conectar `handleInvalid` no `<form>`**

Localizar o `<form>` (linhas 236-241):

```tsx
<form
    aria-busy={isSubmitting}
    className="flex flex-col gap-5 px-4"
    id="lead-form"
    onSubmit={handleSubmit}
>
```

Adicionar `onInvalid`:

```tsx
<form
    aria-busy={isSubmitting}
    className="flex flex-col gap-5 px-4"
    id="lead-form"
    onInvalid={handleInvalid}
    onSubmit={handleSubmit}
>
```

- [ ] **Step 7: Rodar typecheck e build no app web**

```bash
bun run check-types
```

Expected: PASS. Se falhar em `e.nativeEvent as SubmitEvent`, conferir que o cast está correto (React 19 + DOM lib types).

- [ ] **Step 8: Teste manual local (Chrome DevTools mobile emulation)**

```bash
bun run dev:web
```

Em outra aba:
1. Abrir `http://localhost:3001/leads/new`
2. Abrir DevTools (F12) → Toggle device toolbar (Ctrl+Shift+M) → escolher "iPhone 14"
3. Tentar submeter form vazio. Esperado:
   - Toast vermelho "Debug invalid → lead-name: Preencha este campo." (ou mensagem nativa em PT)
   - Console: `[lead-form-debug] {source: "onInvalid", ...}` com payload completo
   - Network: requisição POST para `/api/trpc/debug.logFormDiagnostic` retornando 200
4. Preencher todos campos e submeter. Esperado:
   - Console: `[lead-form-debug] {source: "handleSubmit", checkValidity: true, invalidSelectors: []}`
   - Lead salvo normalmente

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/components/lead-form.tsx
git commit -m "feat: instrumentar lead-form para diagnostico mobile"
```

---

### Task 3: Documentar pendência de remoção em `docs/tech-debt.md`

**Files:**
- Modify: `docs/tech-debt.md`

- [ ] **Step 1: Ler `docs/tech-debt.md` para identificar o padrão de entradas**

```bash
head -30 docs/tech-debt.md
```

Confirmar formato das entradas existentes (ID, título, descrição, status). Manter o mesmo padrão.

- [ ] **Step 2: Adicionar nova entrada no fim do arquivo**

Inserir uma entrada nova com o próximo ID disponível (sequência observada no arquivo). Conteúdo:

```markdown
### #XX — Remover instrumentação de debug do `LeadForm`

**Status**: aberto
**Origem**: spec `docs/superpowers/specs/2026-05-21-lead-form-mobile-debug-design.md`

Instrumentação temporária adicionada em `apps/web/src/components/lead-form.tsx` (handler `onInvalid`, logs `console.warn`, toast on-screen, mutation `trpc.debug.logFormDiagnostic`) e router `packages/api/src/routers/debug.ts` para diagnosticar erro `An invalid form control with name='' is not focusable` no mobile.

**Após o diagnóstico**:
1. Implementar o fix definitivo (provavelmente `noValidate` + atributo `name` nos inputs, mas depende do padrão observado).
2. Remover handler `onInvalid`, mutation, helpers `buildDiagnostic`/`maskPhoneForLog`/`readDomValue`/`collectInvalidSelectors` e imports relacionados em `lead-form.tsx`.
3. Remover router `debug` em `packages/api/src/routers/debug.ts` e desregistrar em `routers/index.ts` (a menos que outra feature passe a usá-lo).
4. Fechar esta entrada.
```

Substituir `#XX` pelo próximo ID em sequência (consultar o último ID no arquivo).

- [ ] **Step 3: Commit**

```bash
git add docs/tech-debt.md
git commit -m "docs: tech-debt para remover instrumentacao do lead-form"
```

---

## Cobertura do Spec

| Requisito do spec | Task |
|---|---|
| Listener `onInvalid` no form | Task 2, Steps 4 + 6 |
| Logs no `handleSubmit` antes do `preventDefault` | Task 2, Step 5 |
| Captura de DOM values vs React state | Task 2, Steps 2 + 4 + 5 (helpers + uso) |
| Captura de validity object | Task 2, Step 4 |
| `checkValidity()` + `:invalid` selectors | Task 2, Steps 2 + 5 |
| Identificar trigger (`event.submitter`) | Task 2, Step 5 |
| 3 canais: console + toast + tRPC | Task 1 (tRPC) + Task 2 (console + toast) |
| User agent + viewport | Task 2, Steps 4 + 5 |
| PII: truncar telefone | Task 2, Step 2 (`maskPhoneForLog`) |
| Sempre ativo em prod, sem gate | Task 2 — sem env check, sem query param |
| Remoção em commit dedicado | Task 3 (tech-debt entry) |

## Verificação final

Antes de mergear:
- [ ] `bun run check-types` passa
- [ ] `bun run check` (ultracite) passa
- [ ] Reprodução local com DevTools mobile emulation captura payload nos 3 canais
- [ ] Deploy preview na Vercel: testar `/leads/new` no celular real do usuário, confirmar toast aparece e mutation chega nos Vercel logs
- [ ] Avisar usuário para reproduzir o cenário "preenchi tudo mas falha" no celular para coletar o payload real
