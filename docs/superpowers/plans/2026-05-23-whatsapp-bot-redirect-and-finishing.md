# WhatsApp Bot — Redirect Flow + Finishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar o bot de sorteio Profills Fispal 2026 — adicionar (1) roteamento por keyword com fluxo de redirect pra clientes não-sorteio, (2) banner como image header da boas-vindas, (3) card visual gerado via Satori pro código, (4) painel admin em `/admin/sorteio`, e (5) script de QR Code — sobre o bot já parcialmente implementado em `packages/api/src/whatsapp/` e `apps/web/src/app/api/whatsapp/webhook/`.

**Architecture:** Webhook Next.js → state machine pura → DB Postgres (`whatsapp.*`) → Cloud API. Adicionamos novo state `NON_PARTICIPANT` pra clientes que não querem sorteio (recebem redirect com info do vendedor). Banner vai no header de interactive message (1 mensagem em vez de 2 separadas). Card do código é PNG gerado por `@vercel/og` em rota Next.js, enviado como image antes da mensagem de regras.

**Tech Stack:** Next.js 16 + React 19 + Drizzle ORM + Better Auth + Supabase + Vercel + `@vercel/og` (Satori) + `qrcode` lib + Vitest + Bun.

**Pré-requisitos de produto (não-bloqueantes pra dev, mas devem ser resolvidos antes do go-live):**
- Telefone + nome do vendedor pra redirect (envs `WHATSAPP_REDIRECT_VENDOR_NAME` + `WHATSAPP_REDIRECT_VENDOR_PHONE`)
- Links reais do regulamento + política de privacidade (já podem ser placeholder no código)
- Identidade visual Profills pro card Satori (paleta de cores, fonte)
- Decisão final do número (migrar atendimento atual ou chip novo) — independente do plano, só afeta config Meta

**Priorização:**
- **P0 (bloqueia evento):** Fase A, Fase B, Fase E (1, 2, 5)
- **P1 (alta prioridade, fazer se tempo):** Fase D, Fase C (4, 3)
- **Ordem recomendada:** A → B → E → D → C

---

## File Structure

### Arquivos NOVOS

| Arquivo | Responsabilidade |
|---|---|
| `packages/api/src/whatsapp/keyword.ts` | Detecção de keyword pra entrar no fluxo do sorteio (substring `sorteio` normalizado) |
| `packages/api/src/whatsapp/__tests__/keyword.test.ts` | Testes de detecção de keyword |
| `apps/web/src/app/api/whatsapp/code-card/route.tsx` | Endpoint Satori que renderiza card PNG do código |
| `apps/web/src/app/(app)/admin/sorteio/page.tsx` | Painel admin — lista de participantes |
| `apps/web/src/app/(app)/admin/sorteio/_components/participants-table.tsx` | Tabela client component com filtros |
| `apps/web/src/app/(app)/admin/sorteio/_components/stats-cards.tsx` | Cards de contadores |
| `apps/web/src/app/(app)/admin/sorteio/export/route.ts` | Endpoint CSV export |
| `scripts/generate-qr-code.ts` | Script Bun pra gerar PNG do QR Code |
| `packages/db/src/schema/migrations/<timestamp>_add_non_participant.sql` | Migration: adicionar coluna `redirect_sent_at` + permitir state `NON_PARTICIPANT` |

### Arquivos MODIFICADOS

| Arquivo | Mudança |
|---|---|
| `packages/api/src/whatsapp/state-machine.ts` | Adicionar `NON_PARTICIPANT` state, handlers de keyword routing, redirect com anti-loop |
| `packages/api/src/whatsapp/messages.ts` | Adicionar `redirect()` + suportar `header` opcional em `interactive()` |
| `packages/api/src/whatsapp/__tests__/state-machine.test.ts` | Atualizar testes pra novo comportamento (NEW + DECLINED roteiam por keyword) |
| `packages/db/src/schema/whatsapp.ts` | Adicionar coluna `redirectSentAt: timestamp` |
| `apps/web/src/app/api/whatsapp/webhook/route.ts` | Suportar `kind: "imageCard"` em outbounds (Fase C) |
| `packages/env/src/server.ts` | Adicionar `WHATSAPP_REDIRECT_VENDOR_NAME` + `_PHONE` |
| `apps/web/src/app/(app)/layout.tsx` (se existir) | Garantir link de navegação pro admin |
| `package.json` (root + apps/web) | Adicionar deps: `qrcode`, `@types/qrcode` |

---

## Fase A — Keyword Routing + Fluxo Redirect (P0)

### Task A1: Adicionar env vars do vendedor

**Files:**
- Modify: `packages/env/src/server.ts:5-26`

- [ ] **Step 1: Adicionar campos no schema do env**

Substituir o bloco WhatsApp Cloud API atual em `packages/env/src/server.ts:18-26` por:

```ts
		// WhatsApp Cloud API
		WHATSAPP_ACCESS_TOKEN: z.string().min(1),
		WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
		WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().min(1),
		WHATSAPP_APP_SECRET: z.string().min(1),
		WHATSAPP_VERIFY_TOKEN: z.string().min(1),
		WHATSAPP_API_VERSION: z.string().min(1).default("v25.0"),
		WHATSAPP_REDIRECT_VENDOR_NAME: z.string().min(1),
		WHATSAPP_REDIRECT_VENDOR_PHONE: z
			.string()
			.regex(/^\d{12,14}$/, "Telefone E.164 sem '+', ex: 5511999990000"),
		WHATSAPP_REDIRECT_EVENT_START: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD")
			.default("2026-05-26"),
		WHATSAPP_REDIRECT_EVENT_END: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD")
			.default("2026-05-29"),
		SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
		TERMS_VERSION: z.string().min(1).default("v1"),
```

- [ ] **Step 2: Adicionar valores placeholder em `apps/web/.env.example` (se existir; criar se não)**

```env
WHATSAPP_REDIRECT_VENDOR_NAME=Fulano Vendedor
WHATSAPP_REDIRECT_VENDOR_PHONE=5511999990000
WHATSAPP_REDIRECT_EVENT_START=2026-05-26
WHATSAPP_REDIRECT_EVENT_END=2026-05-29
```

- [ ] **Step 3: Commit**

```bash
git add packages/env/src/server.ts apps/web/.env.example
git commit -m "feat(env): vendor redirect envs para fluxo non-participant"
```

---

### Task A2: Helper de detecção de keyword (TDD)

**Files:**
- Create: `packages/api/src/whatsapp/keyword.ts`
- Test: `packages/api/src/whatsapp/__tests__/keyword.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Criar `packages/api/src/whatsapp/__tests__/keyword.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isSorteioKeyword } from "../keyword";

describe("isSorteioKeyword", () => {
	it("retorna true para 'Sorteio Profills Fispal 2026' (exato do wa.me)", () => {
		expect(isSorteioKeyword("Sorteio Profills Fispal 2026")).toBe(true);
	});

	it("retorna true para 'eu quero participar do sorteio'", () => {
		expect(isSorteioKeyword("eu quero participar do sorteio")).toBe(true);
	});

	it("retorna true para 'SORTEIO' (case-insensitive)", () => {
		expect(isSorteioKeyword("SORTEIO")).toBe(true);
	});

	it("retorna true para 'sortêio' (com acento)", () => {
		expect(isSorteioKeyword("sortêio")).toBe(true);
	});

	it("retorna true para 'quero participar'", () => {
		expect(isSorteioKeyword("quero participar")).toBe(true);
	});

	it("retorna false para 'oi tudo bem?'", () => {
		expect(isSorteioKeyword("oi tudo bem?")).toBe(false);
	});

	it("retorna false para texto vazio", () => {
		expect(isSorteioKeyword("")).toBe(false);
	});

	it("retorna false para apenas espaços", () => {
		expect(isSorteioKeyword("   ")).toBe(false);
	});

	it("retorna false para null/undefined-like (não-string)", () => {
		expect(isSorteioKeyword(null as unknown as string)).toBe(false);
	});

	it("retorna true para 'PaRtIcIpAr' isolado (case+substring)", () => {
		expect(isSorteioKeyword("PaRtIcIpAr")).toBe(true);
	});
});
```

- [ ] **Step 2: Rodar pra verificar que falha**

```bash
cd /home/othavio/Work/sistema-coleta-de-lead
bun test packages/api/src/whatsapp/__tests__/keyword.test.ts
```

Expected: FAIL com "Cannot find module '../keyword'"

- [ ] **Step 3: Implementar `keyword.ts`**

Criar `packages/api/src/whatsapp/keyword.ts`:

```ts
/**
 * Detecta se uma mensagem do usuário deve disparar o fluxo do sorteio.
 *
 * Match por substring após normalização (lowercase + remoção de diacríticos + trim).
 * Triggers: "sorteio" OR "participar" — cobre tanto o texto pré-preenchido do
 * wa.me ("Sorteio Profills Fispal 2026") quanto frases livres do usuário
 * ("quero participar", "vim pelo sorteio").
 */
export function isSorteioKeyword(text: unknown): boolean {
	if (typeof text !== "string") {
		return false;
	}
	const normalized = text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.trim();
	if (normalized.length === 0) {
		return false;
	}
	return normalized.includes("sorteio") || normalized.includes("participar");
}
```

- [ ] **Step 4: Rodar testes pra verificar que passam**

```bash
bun test packages/api/src/whatsapp/__tests__/keyword.test.ts
```

Expected: PASS (10 testes)

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/whatsapp/keyword.ts packages/api/src/whatsapp/__tests__/keyword.test.ts
git commit -m "feat(whatsapp): helper isSorteioKeyword com normalizacao"
```

---

### Task A3: Adicionar coluna `redirect_sent_at` no schema

**Files:**
- Modify: `packages/db/src/schema/whatsapp.ts:13-41`

- [ ] **Step 1: Adicionar coluna no schema Drizzle**

Em `packages/db/src/schema/whatsapp.ts`, dentro do `participants.table(...)`, adicionar antes de `createdAt`:

```ts
		redirectSentAt: timestamp("redirect_sent_at", {
			withTimezone: true,
			mode: "date",
		}),
```

- [ ] **Step 2: Gerar migration**

```bash
cd /home/othavio/Work/sistema-coleta-de-lead
bun db:generate
```

Expected: arquivo `.sql` novo em `packages/db/src/schema/migrations/` com `ALTER TABLE whatsapp.participants ADD COLUMN redirect_sent_at TIMESTAMP WITH TIME ZONE`.

- [ ] **Step 3: Aplicar migration localmente**

```bash
bun db:push
```

Expected: apply OK sem erros.

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/schema/whatsapp.ts packages/db/src/schema/migrations/
git commit -m "feat(db): coluna redirect_sent_at em whatsapp.participants"
```

---

### Task A4: Adicionar mensagem `redirect()` em messages.ts

**Files:**
- Modify: `packages/api/src/whatsapp/messages.ts:1-194`

- [ ] **Step 1: Adicionar suporte a `header` em `InteractiveMessage`**

Em `packages/api/src/whatsapp/messages.ts:21-28`, substituir interface por:

```ts
interface InteractiveMessage {
	interactive: {
		type: "button";
		header?: { type: "image"; image: { link: string } };
		body: { text: string };
		footer?: { text: string };
		action: { buttons: InteractiveButton[] };
	};
	type: "interactive";
}
```

- [ ] **Step 2: Atualizar helper `interactive()` para aceitar header/footer opcionais**

Substituir função `interactive` (linhas ~40-57) por:

```ts
function interactive(
	bodyText: string,
	buttons: Array<{ id: string; title: string }>,
	options?: {
		header?: { type: "image"; image: { link: string } };
		footer?: { text: string };
	}
): InteractiveMessage {
	const interactive: InteractiveMessage["interactive"] = {
		type: "button",
		body: { text: bodyText },
		action: {
			buttons: buttons.map((b) => ({
				type: "reply",
				reply: { id: b.id, title: b.title },
			})),
		},
	};
	if (options?.header) {
		interactive.header = options.header;
	}
	if (options?.footer) {
		interactive.footer = options.footer;
	}
	return { type: "interactive", interactive };
}
```

- [ ] **Step 3: Adicionar `REDIRECT_BUTTONS` constante após `CONSENT_BUTTONS` (linha ~62)**

```ts
const REDIRECT_BUTTONS = [
	{ id: "want_to_participate", title: "Participar do sorteio" },
	{ id: "already_registered", title: "Ja me cadastrei" },
];
```

Nota: títulos máx 20 chars. "Participar do sorteio" = 21 chars — usar "Participar sorteio" (18) ou abreviar. Verificado: "Participar sorteio" cabe.

Ajustar:

```ts
const REDIRECT_BUTTONS = [
	{ id: "want_to_participate", title: "Participar sorteio" },
	{ id: "already_registered", title: "Ja me cadastrei" },
];
```

- [ ] **Step 4: Adicionar função `redirect()` no final do arquivo (antes do export type)**

```ts
export function redirect({
	vendorName,
	vendorPhone,
	eventStart,
	eventEnd,
}: {
	vendorName: string;
	vendorPhone: string;
	eventStart: string; // formato "DD/MM"
	eventEnd: string; // formato "DD/MM"
}): InteractiveMessage {
	return interactive(
		`👋 Olá!\n\n` +
			`A *Profills* está participando da *Fispal 2026* ` +
			`nesta semana (*${eventStart} a ${eventEnd}*).\n\n` +
			`Durante o evento, o atendimento comercial está ` +
			`temporariamente neste contato:\n\n` +
			`📱 *${vendorName}*\n` +
			`▸ wa.me/${vendorPhone}\n\n` +
			`Voltamos ao atendimento normal neste número ` +
			`logo após o evento.\n\n` +
			`━━━━━━━━━━━━━━━━━━━\n\n` +
			`*Veio pelo sorteio da Profills no Fispal?*`,
		REDIRECT_BUTTONS
	);
}
```

- [ ] **Step 5: Atualizar `welcome()` para receber `imageUrl` opcional e usar como header**

Substituir `welcome` (linhas ~68-83) por:

```ts
export function welcome({
	eventName,
	imageUrl,
}: {
	eventName: string;
	imageUrl?: string;
}): InteractiveMessage {
	const bodyText =
		"Olá! Bem-vindo ao *Sorteio Profills Fispal 2026* 🎉\n\n" +
		"Participe e concorra a 3 prêmios incríveis:\n" +
		`• TV 65"\n` +
		"• Churrasqueira Champions Grill\n" +
		"• Cooler Profills\n\n" +
		`Evento: *${eventName}*\n\n` +
		"📋 *LGPD:* Ao aceitar, você autoriza a Profills a usar seu telefone, nome e empresa apenas para o sorteio e contato comercial relacionado.";

	return interactive(
		bodyText,
		CONSENT_BUTTONS,
		imageUrl
			? { header: { type: "image", image: { link: imageUrl } } }
			: undefined
	);
}
```

- [ ] **Step 6: Verificar que tipos compilam**

```bash
bun run check-types
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/whatsapp/messages.ts
git commit -m "feat(whatsapp): redirect message + image header em interactive"
```

---

### Task A5: Atualizar state machine — NON_PARTICIPANT + keyword routing

**Files:**
- Modify: `packages/api/src/whatsapp/state-machine.ts`

- [ ] **Step 1: Atualizar `ParticipantState` type pra incluir NON_PARTICIPANT**

`packages/api/src/whatsapp/state-machine.ts:29-35`:

```ts
export type ParticipantState =
	| "NEW"
	| "NON_PARTICIPANT"
	| "AWAITING_CONSENT"
	| "AWAITING_NAME"
	| "AWAITING_COMPANY"
	| "COMPLETED"
	| "DECLINED";
```

- [ ] **Step 2: Atualizar `ParticipantPatch` pra incluir `redirectSentAt`**

`packages/api/src/whatsapp/state-machine.ts:39-48`:

```ts
export type ParticipantPatch = Partial<{
	state: ParticipantState;
	name: string | null;
	company: string | null;
	consentAt: Date;
	declinedAt: Date | null;
	termsVersion: string;
	retryCount: number;
	raffleCode: string;
	redirectSentAt: Date | null;
}>;
```

- [ ] **Step 3: Atualizar `StateMachineConfig` pra incluir dados do vendor**

`packages/api/src/whatsapp/state-machine.ts:56-61`:

```ts
export interface StateMachineConfig {
	eventName: string;
	raffleDate?: string;
	termsVersion: string;
	welcomeImageUrl?: string;
	vendorName: string;
	vendorPhone: string;
	eventStartBR: string; // "26/05"
	eventEndBR: string; // "29/05"
	redirectCooldownMs?: number; // default 4h
}
```

- [ ] **Step 4: Importar `redirect` e `isSorteioKeyword`**

Em `packages/api/src/whatsapp/state-machine.ts:9-22`, adicionar imports:

```ts
import { isSorteioKeyword } from "./keyword";
import {
	alreadyParticipated,
	askCompany,
	askName,
	companyInvalid,
	declined,
	help,
	invalidConsentRetry,
	nameInvalid,
	redirect,
	reoffer,
	status,
	welcome,
} from "./messages";
```

- [ ] **Step 5: Refatorar `handleNew` pra rotear por keyword**

Substituir função `handleNew` (linhas ~134-154) por:

```ts
function handleNew(args: {
	message: InboundMessage;
	config: StateMachineConfig;
}): HandleResult {
	const { message, config } = args;
	const waId = message.from;
	const body = getTextBody(message);

	// Botão de redirect: cliente clicou "Participar do sorteio" ou "Já me cadastrei" sem ter participant
	if (
		isButtonReply(message, "want_to_participate") ||
		isButtonReply(message, "already_registered")
	) {
		return {
			participantPatch: null,
			createParticipant: { waId, state: "AWAITING_CONSENT" },
			outbounds: [
				toInteractiveAction(
					welcome({
						eventName: config.eventName,
						imageUrl: config.welcomeImageUrl,
					})
				),
			],
		};
	}

	// Keyword detectada → fluxo do sorteio
	if (body !== null && isSorteioKeyword(body)) {
		return {
			participantPatch: null,
			createParticipant: { waId, state: "AWAITING_CONSENT" },
			outbounds: [
				toInteractiveAction(
					welcome({
						eventName: config.eventName,
						imageUrl: config.welcomeImageUrl,
					})
				),
			],
		};
	}

	// Não-keyword: cria participant NON_PARTICIPANT e envia redirect
	return {
		participantPatch: null,
		createParticipant: { waId, state: "NON_PARTICIPANT" },
		outbounds: [
			toInteractiveAction(
				redirect({
					vendorName: config.vendorName,
					vendorPhone: config.vendorPhone,
					eventStart: config.eventStartBR,
					eventEnd: config.eventEndBR,
				})
			),
		],
	};
}
```

> **Nota:** o webhook precisa setar `redirectSentAt = NOW()` no patch quando o outbound é redirect. Ver Task A6.

- [ ] **Step 6: Adicionar handler `handleNonParticipant`**

Adicionar nova função antes de `handleCompleted`:

```ts
function handleNonParticipant(args: {
	participant: Participant;
	message: InboundMessage;
	config: StateMachineConfig;
}): HandleResult {
	const { participant, message, config } = args;
	const body = getTextBody(message);

	// Botão "Participar do sorteio" → entra no fluxo
	if (isButtonReply(message, "want_to_participate")) {
		return {
			participantPatch: {
				state: "AWAITING_CONSENT",
				retryCount: 0,
				redirectSentAt: null,
			},
			outbounds: [
				toInteractiveAction(
					welcome({
						eventName: config.eventName,
						imageUrl: config.welcomeImageUrl,
					})
				),
			],
		};
	}

	// Botão "Já me cadastrei" → checa se tem código; se não tem, entra no fluxo
	if (isButtonReply(message, "already_registered")) {
		if (participant.raffleCode && participant.name) {
			return {
				participantPatch: null,
				outbounds: [
					toTextAction(
						alreadyParticipated({
							name: participant.name,
							raffleCode: participant.raffleCode,
						})
					),
				],
			};
		}
		return {
			participantPatch: {
				state: "AWAITING_CONSENT",
				retryCount: 0,
				redirectSentAt: null,
			},
			outbounds: [
				toInteractiveAction(
					welcome({
						eventName: config.eventName,
						imageUrl: config.welcomeImageUrl,
					})
				),
			],
		};
	}

	// Keyword detectada → entra no fluxo
	if (body !== null && isSorteioKeyword(body)) {
		return {
			participantPatch: {
				state: "AWAITING_CONSENT",
				retryCount: 0,
				redirectSentAt: null,
			},
			outbounds: [
				toInteractiveAction(
					welcome({
						eventName: config.eventName,
						imageUrl: config.welcomeImageUrl,
					})
				),
			],
		};
	}

	// Outra mensagem: aplica anti-loop (4h cooldown padrão)
	const cooldownMs = config.redirectCooldownMs ?? 4 * 60 * 60 * 1000;
	const lastSent = participant.redirectSentAt;
	if (lastSent && Date.now() - lastSent.getTime() < cooldownMs) {
		return {
			participantPatch: null,
			outbounds: [],
		};
	}

	return {
		participantPatch: null, // redirectSentAt setado pelo webhook após enviar
		outbounds: [
			toInteractiveAction(
				redirect({
					vendorName: config.vendorName,
					vendorPhone: config.vendorPhone,
					eventStart: config.eventStartBR,
					eventEnd: config.eventEndBR,
				})
			),
		],
	};
}
```

- [ ] **Step 7: Refatorar `handleDeclined` — keyword routing**

Substituir função `handleDeclined` (linhas ~311-320) por:

```ts
function handleDeclined(args: {
	participant: Participant;
	message: InboundMessage;
	config: StateMachineConfig;
}): HandleResult {
	const { participant, message, config } = args;
	const body = getTextBody(message);

	// Keyword OR botão "Participar do sorteio" → reoferta
	if (
		(body !== null && isSorteioKeyword(body)) ||
		isButtonReply(message, "want_to_participate")
	) {
		return {
			participantPatch: {
				state: "AWAITING_CONSENT",
				declinedAt: null,
				retryCount: 0,
			},
			outbounds: [toInteractiveAction(reoffer())],
		};
	}

	// Outra mensagem: silêncio (cliente já optou por não participar)
	// Aplicar anti-loop opcional via redirectSentAt
	const cooldownMs = config.redirectCooldownMs ?? 4 * 60 * 60 * 1000;
	const lastSent = participant.redirectSentAt;
	if (lastSent && Date.now() - lastSent.getTime() < cooldownMs) {
		return { participantPatch: null, outbounds: [] };
	}

	return {
		participantPatch: null,
		outbounds: [
			toInteractiveAction(
				redirect({
					vendorName: config.vendorName,
					vendorPhone: config.vendorPhone,
					eventStart: config.eventStartBR,
					eventEnd: config.eventEndBR,
				})
			),
		],
	};
}
```

- [ ] **Step 8: Atualizar switch principal `handleInbound`**

`packages/api/src/whatsapp/state-machine.ts:326-363`:

```ts
export function handleInbound(args: {
	participant: Participant | null;
	message: InboundMessage;
	config: StateMachineConfig;
}): HandleResult {
	const { participant, message, config } = args;

	if (participant === null) {
		return handleNew({ message, config });
	}

	const state = participant.state as ParticipantState;

	switch (state) {
		case "NEW":
			return handleNew({ message, config });

		case "NON_PARTICIPANT":
			return handleNonParticipant({ participant, message, config });

		case "AWAITING_CONSENT":
			return handleAwaitingConsent({ participant, message, config });

		case "AWAITING_NAME":
			return handleAwaitingName({ message });

		case "AWAITING_COMPANY":
			return handleAwaitingCompany({ message });

		case "COMPLETED":
			return handleCompleted({ participant, message });

		case "DECLINED":
			return handleDeclined({ participant, message, config });

		default: {
			const _exhaustive: never = state as never;
			return _exhaustive;
		}
	}
}
```

- [ ] **Step 9: Remover handleNew separado pra image (banner agora é header)**

Já feito implicitamente acima — o novo `handleNew` não mais empurra `{ kind: "image" }`. Verificar que não há código residual de `welcomeImageUrl` empurrando image separado.

- [ ] **Step 10: Verificar compilação**

```bash
bun run check-types
```

Expected: PASS (provavelmente vai falhar em testes — vamos atualizar na próxima task).

- [ ] **Step 11: Commit (parcial — testes na próxima task)**

```bash
git add packages/api/src/whatsapp/state-machine.ts
git commit -m "feat(whatsapp): keyword routing + NON_PARTICIPANT state + redirect"
```

---

### Task A6: Webhook seta `redirectSentAt` após enviar redirect

**Files:**
- Modify: `apps/web/src/app/api/whatsapp/webhook/route.ts:104-230` (`processMessage` function)

- [ ] **Step 1: Adicionar lógica de setar `redirectSentAt` após outbound de redirect**

Em `processMessage`, após o loop de outbounds (linha ~207), adicionar:

```ts
// Se enviamos redirect (NON_PARTICIPANT ou DECLINED), registra timestamp
const sentRedirect = result.outbounds.some(
	(a) => a.kind === "interactive" && isRedirectInteractive(a.interactive)
);
if (sentRedirect && participant !== null) {
	await db
		.update(participants)
		.set({ redirectSentAt: new Date() })
		.where(eq(participants.id, participant.id));
}
```

Adicionar helper no topo do arquivo (após imports):

```ts
function isRedirectInteractive(
	interactive: { action: { buttons: Array<{ reply: { id: string } }> } }
): boolean {
	return interactive.action.buttons.some(
		(b) => b.reply.id === "want_to_participate"
	);
}
```

- [ ] **Step 2: Atualizar config passada ao state machine**

`apps/web/src/app/api/whatsapp/webhook/route.ts:155-161` — substituir bloco `config` por:

```ts
function formatBR(isoDate: string): string {
	const [, m, d] = isoDate.split("-");
	return `${d}/${m}`;
}

// ... dentro de processMessage:
const config: StateMachineConfig = {
	eventName:
		webEnv.NEXT_PUBLIC_EVENT_NAME ?? "Sorteio Profills Fispal 2026",
	raffleDate: webEnv.NEXT_PUBLIC_RAFFLE_DATE,
	termsVersion: env.TERMS_VERSION,
	welcomeImageUrl: webEnv.NEXT_PUBLIC_WHATSAPP_WELCOME_IMAGE_URL,
	vendorName: env.WHATSAPP_REDIRECT_VENDOR_NAME,
	vendorPhone: env.WHATSAPP_REDIRECT_VENDOR_PHONE,
	eventStartBR: formatBR(env.WHATSAPP_REDIRECT_EVENT_START),
	eventEndBR: formatBR(env.WHATSAPP_REDIRECT_EVENT_END),
};
```

Mover `formatBR` pra fora da função `processMessage` (helper module-level).

- [ ] **Step 3: Verificar compilação**

```bash
bun run check-types
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/whatsapp/webhook/route.ts
git commit -m "feat(whatsapp/webhook): setar redirectSentAt + config completa"
```

---

### Task A7: Atualizar testes do state machine

**Files:**
- Modify: `packages/api/src/whatsapp/__tests__/state-machine.test.ts`

- [ ] **Step 1: Atualizar `BASE_CONFIG` com novos campos**

Substituir `BASE_CONFIG` (linha ~10) por:

```ts
const BASE_CONFIG: StateMachineConfig = {
	eventName: "Sorteio Profills Fispal 2026",
	raffleDate: "05/06/2026",
	termsVersion: "v1",
	vendorName: "Fulano Vendedor",
	vendorPhone: "5511999990000",
	eventStartBR: "26/05",
	eventEndBR: "29/05",
};

const CONFIG_WITH_IMAGE: StateMachineConfig = {
	...BASE_CONFIG,
	welcomeImageUrl: "https://example.com/banner.jpg",
};
```

- [ ] **Step 2: Atualizar `makeParticipant` para incluir `redirectSentAt`**

```ts
function makeParticipant(overrides: Partial<Participant> = {}): Participant {
	return {
		id: "00000000-0000-0000-0000-000000000001",
		waId: "5511999990001",
		state: "AWAITING_CONSENT",
		name: null,
		company: null,
		raffleCode: null,
		consentAt: null,
		declinedAt: null,
		termsVersion: null,
		retryCount: 0,
		redirectSentAt: null,
		createdAt: new Date("2026-01-01T00:00:00Z"),
		updatedAt: new Date("2026-01-01T00:00:00Z"),
		...overrides,
	};
}
```

- [ ] **Step 3: Reescrever o describe "participant=null (first inbound)"**

Substituir o bloco describe inteiro (linhas ~72-102) por:

```ts
describe("handleInbound — participant=null (first inbound)", () => {
	it("texto 'Sorteio Profills Fispal 2026' (keyword) → cria AWAITING_CONSENT + welcome", () => {
		const result = handleInbound({
			participant: null,
			message: textMsg("Sorteio Profills Fispal 2026"),
			config: BASE_CONFIG,
		});

		expect(result.createParticipant?.state).toBe("AWAITING_CONSENT");
		expect(result.outbounds).toHaveLength(1);
		expect(result.outbounds[0]?.kind).toBe("interactive");
	});

	it("texto 'oi' (não-keyword) → cria NON_PARTICIPANT + redirect", () => {
		const result = handleInbound({
			participant: null,
			message: textMsg("oi"),
			config: BASE_CONFIG,
		});

		expect(result.createParticipant?.state).toBe("NON_PARTICIPANT");
		expect(result.outbounds).toHaveLength(1);
		expect(result.outbounds[0]?.kind).toBe("interactive");
		// Confirmar que é o redirect (button id want_to_participate)
		const action = result.outbounds[0] as {
			kind: "interactive";
			interactive: { action: { buttons: Array<{ reply: { id: string } }> } };
		};
		expect(action.interactive.action.buttons[0]?.reply.id).toBe(
			"want_to_participate"
		);
	});

	it("welcome com imageUrl tem header.image.link (single message)", () => {
		const result = handleInbound({
			participant: null,
			message: textMsg("sorteio"),
			config: CONFIG_WITH_IMAGE,
		});

		expect(result.outbounds).toHaveLength(1);
		const action = result.outbounds[0] as {
			kind: "interactive";
			interactive: { header?: { image: { link: string } } };
		};
		expect(action.interactive.header?.image.link).toBe(
			"https://example.com/banner.jpg"
		);
	});

	it("botão want_to_participate (vindo de redirect) → AWAITING_CONSENT", () => {
		const result = handleInbound({
			participant: null,
			message: buttonReplyMsg("want_to_participate", "Participar sorteio"),
			config: BASE_CONFIG,
		});

		expect(result.createParticipant?.state).toBe("AWAITING_CONSENT");
	});
});
```

- [ ] **Step 4: Adicionar describe novo "state=NON_PARTICIPANT"**

Adicionar antes do describe DECLINED:

```ts
describe("handleInbound — state=NON_PARTICIPANT", () => {
	it("botão want_to_participate → AWAITING_CONSENT + welcome", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "NON_PARTICIPANT" }),
			message: buttonReplyMsg("want_to_participate", "Participar sorteio"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("AWAITING_CONSENT");
		expect(result.outbounds[0]?.kind).toBe("interactive");
	});

	it("botão already_registered sem código → AWAITING_CONSENT + welcome", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "NON_PARTICIPANT" }),
			message: buttonReplyMsg("already_registered", "Ja me cadastrei"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("AWAITING_CONSENT");
	});

	it("botão already_registered COM código → alreadyParticipated", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "NON_PARTICIPANT",
				name: "João",
				raffleCode: "PROFILLS-1234",
			}),
			message: buttonReplyMsg("already_registered", "Ja me cadastrei"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch).toBeNull();
		expect(result.outbounds[0]?.kind).toBe("text");
	});

	it("keyword 'sorteio' → AWAITING_CONSENT", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "NON_PARTICIPANT" }),
			message: textMsg("vim pelo sorteio"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("AWAITING_CONSENT");
	});

	it("outra mensagem SEM cooldown → reenvia redirect", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "NON_PARTICIPANT",
				redirectSentAt: null,
			}),
			message: textMsg("ainda estou aqui"),
			config: BASE_CONFIG,
		});

		expect(result.outbounds).toHaveLength(1);
		expect(result.outbounds[0]?.kind).toBe("interactive");
	});

	it("outra mensagem DENTRO do cooldown → silêncio", () => {
		const recentSent = new Date(Date.now() - 60_000); // 1 min ago
		const result = handleInbound({
			participant: makeParticipant({
				state: "NON_PARTICIPANT",
				redirectSentAt: recentSent,
			}),
			message: textMsg("oi"),
			config: BASE_CONFIG,
		});

		expect(result.outbounds).toHaveLength(0);
	});

	it("outra mensagem FORA do cooldown → reenvia redirect", () => {
		const oldSent = new Date(Date.now() - 5 * 60 * 60 * 1000); // 5h ago
		const result = handleInbound({
			participant: makeParticipant({
				state: "NON_PARTICIPANT",
				redirectSentAt: oldSent,
			}),
			message: textMsg("oi"),
			config: BASE_CONFIG,
		});

		expect(result.outbounds).toHaveLength(1);
	});
});
```

- [ ] **Step 5: Atualizar describe "state=DECLINED" para novo comportamento**

Substituir o describe DECLINED (linhas ~596-625) por:

```ts
describe("handleInbound — state=DECLINED", () => {
	it("keyword 'sorteio' → reset para AWAITING_CONSENT + reoffer", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "DECLINED",
				declinedAt: new Date("2026-01-01T12:00:00Z"),
				retryCount: 1,
			}),
			message: textMsg("quero participar do sorteio"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("AWAITING_CONSENT");
		expect(result.participantPatch?.declinedAt).toBeNull();
		expect(result.outbounds[0]?.kind).toBe("interactive");
	});

	it("botão want_to_participate → reset para AWAITING_CONSENT + reoffer", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "DECLINED" }),
			message: buttonReplyMsg("want_to_participate", "Participar sorteio"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("AWAITING_CONSENT");
	});

	it("mensagem não-keyword SEM cooldown → envia redirect (não reoffer)", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "DECLINED",
				redirectSentAt: null,
			}),
			message: textMsg("oi"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch).toBeNull();
		expect(result.outbounds).toHaveLength(1);
	});

	it("mensagem não-keyword DENTRO do cooldown → silêncio", () => {
		const recentSent = new Date(Date.now() - 60_000);
		const result = handleInbound({
			participant: makeParticipant({
				state: "DECLINED",
				redirectSentAt: recentSent,
			}),
			message: textMsg("oi"),
			config: BASE_CONFIG,
		});

		expect(result.outbounds).toHaveLength(0);
	});
});
```

- [ ] **Step 6: Rodar todos os testes**

```bash
bun test packages/api/src/whatsapp/__tests__/
```

Expected: PASS (todos os testes — incluindo os antigos que não mudaram)

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/whatsapp/__tests__/state-machine.test.ts
git commit -m "test(whatsapp): cobertura para NON_PARTICIPANT + DECLINED redirect"
```

---

### Task A8: Smoke test manual local com ngrok

- [ ] **Step 1: Subir Postgres local + bot dev**

```bash
cd /home/othavio/Work/sistema-coleta-de-lead
bun dev:web
```

Em outro terminal:

```bash
ngrok http 3000
```

- [ ] **Step 2: Atualizar Callback URL no Meta dashboard para a URL ngrok**

Manual: Meta dashboard → App → WhatsApp → Configuration → `https://<ngrok-id>.ngrok-free.app/api/whatsapp/webhook`

- [ ] **Step 3: Testar fluxos**

Do celular (tester pré-cadastrado no app dev mode), enviar:

1. **Fluxo sorteio:** mensagem "Sorteio Profills Fispal 2026" → deve receber boas-vindas com banner header
2. **Fluxo redirect:** outra mensagem "oi tudo bem" → deve receber redirect com botões
3. **Botão "Participar sorteio":** → entra no fluxo
4. **Anti-loop:** outra mensagem qualquer dentro de 4h → silêncio

- [ ] **Step 4: Verificar logs Vercel/Next**

```bash
# em outro terminal já rodando bun dev:web, verificar console logs
# expected: tag="whatsapp:webhook" event="processed" outboundsCount=N
```

Não há commit nesta task.

---

## Fase B — Banner como Image Header (P0)

> ✅ Já implementado dentro da Fase A (Task A4 step 5). Esta fase serve apenas como checklist de validação extra.

### Task B1: Validar visual no WhatsApp real

- [ ] **Step 1:** Após Task A8 estar OK, verificar visual no celular tester: o banner deve aparecer **uma única vez no topo** da mensagem interativa (não como mensagem separada). Botões devem ficar logo abaixo do body. Largura do banner deve estar OK (Cloud API redimensiona automaticamente).

- [ ] **Step 2:** Se o banner aparecer cortado ou desproporcional, ajustar aspect ratio do `banner-sorteio.png` (recomendado 1.91:1 ou 1:1) e re-deploy.

---

## Fase C — Card Satori para o Código (P1)

### Task C1: Criar endpoint /api/whatsapp/code-card

**Files:**
- Create: `apps/web/src/app/api/whatsapp/code-card/route.tsx`

- [ ] **Step 1: Verificar disponibilidade do `next/og`**

```bash
cd /home/othavio/Work/sistema-coleta-de-lead
grep -r "next/og" apps/web/ 2>/dev/null | head
```

Se já existe uso, ótimo. Se não, está embutido em `next` (versão 16) — não precisa instalar.

- [ ] **Step 2: Criar `route.tsx`**

```tsx
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const CANVAS = { width: 1080, height: 1080 };

export function GET(request: NextRequest): ImageResponse | Response {
	const { searchParams } = new URL(request.url);
	const code = searchParams.get("code");
	const name = searchParams.get("name") ?? "";
	const company = searchParams.get("company") ?? "";
	const date = searchParams.get("date") ?? "";

	if (!code) {
		return new Response("code required", { status: 400 });
	}

	return new ImageResponse(
		(
			<div
				style={{
					width: "100%",
					height: "100%",
					display: "flex",
					flexDirection: "column",
					backgroundColor: "#0E1A2B",
					color: "#FFFFFF",
					padding: 80,
					fontFamily: "sans-serif",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						fontSize: 36,
						opacity: 0.7,
					}}
				>
					<div>PROFILLS</div>
					<div>FISPAL 2026</div>
				</div>

				<div
					style={{
						flex: 1,
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						gap: 40,
					}}
				>
					<div style={{ fontSize: 48, opacity: 0.85 }}>
						CÓDIGO DE PARTICIPAÇÃO
					</div>
					<div
						style={{
							padding: "40px 80px",
							border: "6px solid #FF7A1A",
							borderRadius: 32,
							fontSize: 180,
							fontWeight: 900,
							letterSpacing: 8,
						}}
					>
						{code}
					</div>
				</div>

				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 12,
						fontSize: 36,
						borderTop: "2px solid rgba(255,255,255,0.2)",
						paddingTop: 40,
					}}
				>
					<div>
						<span style={{ opacity: 0.6 }}>Participante: </span>
						<span style={{ fontWeight: 700 }}>{name}</span>
					</div>
					<div>
						<span style={{ opacity: 0.6 }}>Empresa: </span>
						<span style={{ fontWeight: 700 }}>{company}</span>
					</div>
					{date ? (
						<div>
							<span style={{ opacity: 0.6 }}>Cadastrado em: </span>
							<span style={{ fontWeight: 700 }}>{date}</span>
						</div>
					) : null}
				</div>

				<div
					style={{
						marginTop: 40,
						fontSize: 28,
						textAlign: "center",
						opacity: 0.6,
					}}
				>
					Sorteio: 05/06/2026 — profills.com.br
				</div>
			</div>
		),
		{ width: CANVAS.width, height: CANVAS.height }
	);
}
```

- [ ] **Step 3: Testar localmente**

Com `bun dev:web` rodando:

```bash
curl -o /tmp/test-card.png "http://localhost:3000/api/whatsapp/code-card?code=PROFILLS-1234&name=João%20Silva&company=Indústria%20ABC&date=28/05/2026"
```

Abrir `/tmp/test-card.png` no visualizador de imagens.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/whatsapp/code-card/route.tsx
git commit -m "feat(whatsapp): endpoint Satori para card do codigo"
```

---

### Task C2: Webhook envia card + texto no generateAndSendCode

**Files:**
- Modify: `apps/web/src/app/api/whatsapp/webhook/route.ts:266-315` (`generateAndSendCode` branch)

- [ ] **Step 1: Substituir bloco do `generateAndSendCode`**

No `handleOutboundAction`, no branch `generateAndSendCode`, após `assignCodeWithRetry`, substituir o envio de texto único por: image card primeiro + texto com regras.

```ts
} else if (action.kind === "generateAndSendCode") {
	if (participant === null) {
		console.error(
			JSON.stringify({
				tag: "whatsapp:webhook",
				event: "error",
				err: "generateAndSendCode called with null participant",
				waId,
			})
		);
		return;
	}
	const raffleCode = await assignCodeWithRetry(db, participant.id);
	if (raffleCode === null) {
		console.error(
			JSON.stringify({
				tag: "whatsapp:webhook",
				event: "code_generation_exhausted",
				waId,
				participantId: participant.id,
			})
		);
		await loggedSend(
			waId,
			() =>
				sendText(
					waId,
					"Tivemos um problema ao gerar seu codigo. Tente novamente em alguns minutos."
				),
			participant,
			"text",
			{ body: "fallback_code_error" }
		);
		return;
	}

	const name = participant.name ?? "";
	const company = participant.company ?? "";
	const dateBR = new Date().toLocaleDateString("pt-BR");
	const cardUrl = new URL(
		"/api/whatsapp/code-card",
		webEnv.NEXT_PUBLIC_BETTER_AUTH_URL
	);
	cardUrl.searchParams.set("code", raffleCode);
	cardUrl.searchParams.set("name", name);
	cardUrl.searchParams.set("company", company);
	cardUrl.searchParams.set("date", dateBR);

	// 1. Envia card como imagem
	await loggedSend(
		waId,
		() => sendImage(waId, cardUrl.toString(), "🎫 Seu código de participação"),
		participant,
		"image",
		{ link: cardUrl.toString(), raffleCode }
	);

	// 2. Envia texto com regras
	const codeMsgBody = codeGenerated({
		name,
		raffleCode,
		raffleDate: config.raffleDate,
	}).body;
	await loggedSend(
		waId,
		() => sendText(waId, codeMsgBody),
		participant,
		"text",
		{ body: codeMsgBody, raffleCode }
	);
}
```

- [ ] **Step 2: Verificar compilação**

```bash
bun run check-types
```

- [ ] **Step 3: Smoke test**

Repetir Task A8: completar fluxo até receber código. Deve receber: (1) imagem do card + (2) texto com regras.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/whatsapp/webhook/route.ts
git commit -m "feat(whatsapp): envia card Satori antes do texto do codigo"
```

---

## Fase D — Painel Admin `/admin/sorteio` (P1)

### Task D1: Página server component com lista e contadores

**Files:**
- Create: `apps/web/src/app/(app)/admin/sorteio/page.tsx`
- Create: `apps/web/src/app/(app)/admin/sorteio/_components/stats-cards.tsx`
- Create: `apps/web/src/app/(app)/admin/sorteio/_components/participants-table.tsx`

- [ ] **Step 1: Criar page.tsx com guard de role admin**

```tsx
import { auth } from "@dashboard-leads-profills/auth";
import { db } from "@dashboard-leads-profills/db";
import { participants } from "@dashboard-leads-profills/db/schema/whatsapp";
import { count, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ParticipantsTable } from "./_components/participants-table";
import { StatsCards } from "./_components/stats-cards";

export const dynamic = "force-dynamic";

export default async function SorteioAdminPage() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user || session.user.role !== "admin") {
		redirect("/");
	}

	const [stats, rows] = await Promise.all([
		db
			.select({ state: participants.state, total: count() })
			.from(participants)
			.groupBy(participants.state),
		db
			.select()
			.from(participants)
			.orderBy(desc(participants.createdAt))
			.limit(500),
	]);

	const totals = {
		total: stats.reduce((acc, s) => acc + s.total, 0),
		completed: stats.find((s) => s.state === "COMPLETED")?.total ?? 0,
		declined: stats.find((s) => s.state === "DECLINED")?.total ?? 0,
		nonParticipant:
			stats.find((s) => s.state === "NON_PARTICIPANT")?.total ?? 0,
		inProgress: stats
			.filter((s) =>
				["AWAITING_CONSENT", "AWAITING_NAME", "AWAITING_COMPANY"].includes(
					s.state
				)
			)
			.reduce((acc, s) => acc + s.total, 0),
	};

	return (
		<div className="mx-auto max-w-7xl px-4 py-8">
			<div className="mb-6">
				<h1 className="text-3xl font-bold">Sorteio Profills Fispal 2026</h1>
				<p className="text-sm text-muted-foreground">
					Monitoramento e exportação de participantes
				</p>
			</div>

			<StatsCards totals={totals} />

			<div className="mt-8">
				<ParticipantsTable rows={rows} />
			</div>
		</div>
	);
}
```

- [ ] **Step 2: Criar `_components/stats-cards.tsx`**

```tsx
interface Totals {
	total: number;
	completed: number;
	declined: number;
	nonParticipant: number;
	inProgress: number;
}

export function StatsCards({ totals }: { totals: Totals }) {
	const cards = [
		{ label: "Total de interações", value: totals.total, tone: "default" },
		{ label: "Inscrições completas", value: totals.completed, tone: "success" },
		{ label: "Em andamento", value: totals.inProgress, tone: "warning" },
		{ label: "Recusados (LGPD)", value: totals.declined, tone: "muted" },
		{
			label: "Não-participantes (redirect)",
			value: totals.nonParticipant,
			tone: "muted",
		},
	];

	return (
		<div className="grid grid-cols-2 gap-4 md:grid-cols-5">
			{cards.map((c) => (
				<div
					key={c.label}
					className="rounded-lg border bg-card p-4 shadow-sm"
				>
					<div className="text-sm text-muted-foreground">{c.label}</div>
					<div className="mt-2 text-3xl font-bold">{c.value}</div>
				</div>
			))}
		</div>
	);
}
```

- [ ] **Step 3: Criar `_components/participants-table.tsx`**

```tsx
"use client";

import { Button } from "@dashboard-leads-profills/ui/components/button";
import { Input } from "@dashboard-leads-profills/ui/components/input";
import { useMemo, useState } from "react";

type Row = {
	id: string;
	waId: string;
	state: string;
	name: string | null;
	company: string | null;
	raffleCode: string | null;
	createdAt: Date;
};

const STATE_BADGES: Record<string, string> = {
	NEW: "bg-gray-200 text-gray-700",
	NON_PARTICIPANT: "bg-blue-100 text-blue-700",
	AWAITING_CONSENT: "bg-amber-100 text-amber-700",
	AWAITING_NAME: "bg-amber-100 text-amber-700",
	AWAITING_COMPANY: "bg-amber-100 text-amber-700",
	COMPLETED: "bg-emerald-100 text-emerald-700",
	DECLINED: "bg-rose-100 text-rose-700",
};

export function ParticipantsTable({ rows }: { rows: Row[] }) {
	const [query, setQuery] = useState("");
	const [stateFilter, setStateFilter] = useState<string>("all");

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return rows.filter((r) => {
			if (stateFilter !== "all" && r.state !== stateFilter) {
				return false;
			}
			if (!q) {
				return true;
			}
			return [r.name, r.company, r.waId, r.raffleCode]
				.filter(Boolean)
				.some((v) => v!.toLowerCase().includes(q));
		});
	}, [rows, query, stateFilter]);

	return (
		<div>
			<div className="mb-4 flex flex-wrap items-center gap-3">
				<Input
					placeholder="Buscar por nome, empresa, código ou telefone"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					className="max-w-md"
				/>
				<select
					value={stateFilter}
					onChange={(e) => setStateFilter(e.target.value)}
					className="rounded-md border px-3 py-2 text-sm"
				>
					<option value="all">Todos os estados</option>
					<option value="COMPLETED">Completados</option>
					<option value="DECLINED">Recusados</option>
					<option value="NON_PARTICIPANT">Não-participantes</option>
					<option value="AWAITING_CONSENT">Aguardando aceite</option>
					<option value="AWAITING_NAME">Aguardando nome</option>
					<option value="AWAITING_COMPANY">Aguardando empresa</option>
				</select>
				<a href="/admin/sorteio/export" className="ml-auto">
					<Button variant="outline">Exportar CSV</Button>
				</a>
			</div>

			<div className="overflow-x-auto rounded-lg border">
				<table className="w-full text-sm">
					<thead className="bg-muted text-left">
						<tr>
							<th className="px-3 py-2">Cadastrado</th>
							<th className="px-3 py-2">Nome</th>
							<th className="px-3 py-2">Empresa</th>
							<th className="px-3 py-2">Telefone</th>
							<th className="px-3 py-2">Código</th>
							<th className="px-3 py-2">Estado</th>
							<th className="px-3 py-2">Ação</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((r) => (
							<tr key={r.id} className="border-t">
								<td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
									{new Date(r.createdAt).toLocaleString("pt-BR")}
								</td>
								<td className="px-3 py-2">{r.name ?? "—"}</td>
								<td className="px-3 py-2">{r.company ?? "—"}</td>
								<td className="px-3 py-2 font-mono text-xs">{r.waId}</td>
								<td className="px-3 py-2 font-mono">{r.raffleCode ?? "—"}</td>
								<td className="px-3 py-2">
									<span
										className={`rounded-full px-2 py-0.5 text-xs ${STATE_BADGES[r.state] ?? "bg-gray-100"}`}
									>
										{r.state}
									</span>
								</td>
								<td className="px-3 py-2">
									<a
										href={`https://wa.me/${r.waId}`}
										target="_blank"
										rel="noopener noreferrer"
										className="text-primary hover:underline"
									>
										Abrir WhatsApp
									</a>
								</td>
							</tr>
						))}
					</tbody>
				</table>
				{filtered.length === 0 ? (
					<div className="py-12 text-center text-muted-foreground">
						Nenhum participante encontrado.
					</div>
				) : null}
			</div>
		</div>
	);
}
```

- [ ] **Step 4: Verificar imports do shadcn**

```bash
grep -r "components/button" apps/web/src/ packages/ui/src/ 2>/dev/null | head -3
```

Ajustar paths de import dos componentes Button/Input conforme padrão do projeto (`@dashboard-leads-profills/ui/components/...` ou direto via `~/components/...`).

- [ ] **Step 5: Smoke test no browser**

```bash
bun dev:web
```

Acessar `http://localhost:3000/admin/sorteio` logado como admin.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/\(app\)/admin/sorteio/
git commit -m "feat(admin): painel /admin/sorteio com lista e contadores"
```

---

### Task D2: Endpoint export CSV

**Files:**
- Create: `apps/web/src/app/(app)/admin/sorteio/export/route.ts`

- [ ] **Step 1: Criar route handler**

```ts
import { auth } from "@dashboard-leads-profills/auth";
import { db } from "@dashboard-leads-profills/db";
import { participants } from "@dashboard-leads-profills/db/schema/whatsapp";
import { desc } from "drizzle-orm";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function csvEscape(v: unknown): string {
	const s = v === null || v === undefined ? "" : String(v);
	if (s.includes(",") || s.includes('"') || s.includes("\n")) {
		return `"${s.replace(/"/g, '""')}"`;
	}
	return s;
}

export async function GET(): Promise<Response> {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user || session.user.role !== "admin") {
		return new Response("Forbidden", { status: 403 });
	}

	const rows = await db
		.select()
		.from(participants)
		.orderBy(desc(participants.createdAt));

	const header = [
		"wa_id",
		"name",
		"company",
		"raffle_code",
		"state",
		"consent_at",
		"declined_at",
		"created_at",
	].join(",");

	const body = rows
		.map((r) =>
			[
				csvEscape(r.waId),
				csvEscape(r.name),
				csvEscape(r.company),
				csvEscape(r.raffleCode),
				csvEscape(r.state),
				csvEscape(r.consentAt?.toISOString() ?? ""),
				csvEscape(r.declinedAt?.toISOString() ?? ""),
				csvEscape(r.createdAt.toISOString()),
			].join(",")
		)
		.join("\n");

	const csv = `${header}\n${body}\n`;

	return new Response(csv, {
		status: 200,
		headers: {
			"content-type": "text/csv; charset=utf-8",
			"content-disposition": `attachment; filename="sorteio-profills-fispal-${new Date().toISOString().slice(0, 10)}.csv"`,
		},
	});
}
```

- [ ] **Step 2: Smoke test**

Acessar `http://localhost:3000/admin/sorteio/export` → deve baixar `.csv`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/\(app\)/admin/sorteio/export/
git commit -m "feat(admin): export CSV dos participantes"
```

---

## Fase E — QR Code + Deploy (P0)

### Task E1: Script gerar QR Code

**Files:**
- Create: `scripts/generate-qr-code.ts`

- [ ] **Step 1: Adicionar dep `qrcode`**

```bash
cd /home/othavio/Work/sistema-coleta-de-lead
bun add -D qrcode @types/qrcode
```

- [ ] **Step 2: Criar script**

```ts
#!/usr/bin/env bun
/**
 * Gera PNG do QR Code apontando para wa.me com texto pré-preenchido.
 *
 * Uso:
 *   bun scripts/generate-qr-code.ts
 *
 * Variáveis lidas de apps/web/.env (mesmo arquivo do bot):
 *   - NEXT_PUBLIC_EVENT_WHATSAPP_NUMBER (E.164 sem +)
 *   - NEXT_PUBLIC_EVENT_NAME
 */
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "dotenv";
import qrcode from "qrcode";

config({ path: resolve(import.meta.dirname, "../apps/web/.env") });

const number = process.env.NEXT_PUBLIC_EVENT_WHATSAPP_NUMBER;
const eventName =
	process.env.NEXT_PUBLIC_EVENT_NAME ?? "Sorteio Profills Fispal 2026";

if (!number) {
	console.error(
		"Falta NEXT_PUBLIC_EVENT_WHATSAPP_NUMBER em apps/web/.env (formato E.164 sem +, ex: 5511999990000)"
	);
	process.exit(1);
}

const text = encodeURIComponent(eventName);
const url = `https://wa.me/${number}?text=${text}`;

const outputPath = resolve(import.meta.dirname, "../qr-code-sorteio.png");

await qrcode.toFile(outputPath, url, {
	width: 1024,
	margin: 2,
	errorCorrectionLevel: "H",
	color: { dark: "#0E1A2B", light: "#FFFFFF" },
});

console.log(`QR Code gerado em: ${outputPath}`);
console.log(`URL embarcada: ${url}`);
```

- [ ] **Step 3: Rodar**

```bash
bun scripts/generate-qr-code.ts
```

Expected: arquivo `qr-code-sorteio.png` criado na raiz do projeto.

- [ ] **Step 4: Validar — escanear com celular**

Abrir `qr-code-sorteio.png`, escanear com câmera do celular. Deve abrir WhatsApp com texto "Sorteio Profills Fispal 2026" pré-preenchido pro número configurado.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-qr-code.ts package.json bun.lock
git commit -m "feat: script gera QR Code para wa.me do sorteio"
```

---

### Task E2: Atualizar deploy doc com vars novas e checklist final

**Files:**
- Modify: `docs/whatsapp-bot-deploy.md:11-23`

- [ ] **Step 1: Adicionar envs novas na seção 1**

Substituir o bloco de envs por:

```
WHATSAPP_ACCESS_TOKEN=<System User Access Token, NUNCA o temporary>
WHATSAPP_PHONE_NUMBER_ID=1195256440329092
WHATSAPP_BUSINESS_ACCOUNT_ID=1702967640743484
WHATSAPP_APP_SECRET=<app secret da app Meta>
WHATSAPP_VERIFY_TOKEN=<string aleatória, ex: openssl rand -hex 32>
WHATSAPP_API_VERSION=v25.0
WHATSAPP_REDIRECT_VENDOR_NAME=<nome do vendedor que assume atendimento>
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

- [ ] **Step 2: Adicionar nova seção "10. Offboarding seguro pós-evento"**

```markdown
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
```

- [ ] **Step 3: Commit**

```bash
git add docs/whatsapp-bot-deploy.md
git commit -m "docs(deploy): vars de redirect + offboarding seguro"
```

---

### Task E3: Configurar envs no Vercel + smoke test produção

**(Manual — não há código a escrever)**

- [ ] **Step 1:** No painel Vercel → Project lead-profills → Settings → Environment Variables, adicionar todas as 4 envs novas (`WHATSAPP_REDIRECT_*`).

- [ ] **Step 2:** Trigger redeploy (push commit ou redeploy manual).

- [ ] **Step 3:** Rodar `./scripts/setup-whatsapp-meta.sh` pra confirmar webhook ativo.

- [ ] **Step 4:** Executar checklist de smoke test da seção 6 do deploy doc + verificar:
  - Fluxo sorteio completo: keyword → boas-vindas com banner → aceite → nome → empresa → card Satori + texto regras
  - Fluxo redirect: outra mensagem → recebe redirect com botões
  - Botão "Participar sorteio" → entra no fluxo
  - Anti-loop: segunda mensagem qualquer dentro de 4h → silêncio
  - Painel admin: `https://lead.profills.com/admin/sorteio` lista entradas
  - Export CSV: download funciona, abre no Excel/Google Sheets

---

## Self-Review

**1. Spec coverage:**
- ✅ Keyword routing (Fase A)
- ✅ Redirect com vendor + anti-loop (Fase A)
- ✅ Banner como image header (Fase A integrado, Fase B é validação)
- ✅ Satori card pro código (Fase C)
- ✅ Painel admin com lista + filtros + CSV (Fase D)
- ✅ QR Code gerador (Fase E)
- ✅ Offboarding seguro documentado (Fase E)

**2. Placeholder scan:**
- Nenhum "TODO", "implement later", ou código incompleto encontrado nas tasks.
- Wording dos placeholders de env (`<nome do vendedor...>`) é explícito sobre formato esperado.

**3. Type consistency:**
- `ParticipantState` inclui `NON_PARTICIPANT` em todos os lugares (state-machine + tests + schema).
- `redirectSentAt` consistente entre DB schema (`redirect_sent_at`), Drizzle type (`redirectSentAt`), patch type, e uso no webhook.
- `StateMachineConfig` ampliado com `vendorName`, `vendorPhone`, `eventStartBR`, `eventEndBR`, `redirectCooldownMs?` — usado consistentemente em handlers e webhook.
- Função `formatBR(isoDate)` definida no webhook, recebe `WHATSAPP_REDIRECT_EVENT_START/END` que são `YYYY-MM-DD` validados via regex.

**4. Riscos residuais:**
- Card Satori (Fase C) depende de `next/og` rodar em runtime edge — Next 16 suporta nativamente, mas o monorepo pode ter config que conflita. Caso falhe, fallback é manter texto puro (degradação graciosa, não bloqueia evento).
- Wording do `redirect()` usa caractere "▸" e "━" — testar visual no WhatsApp real (Task B1 cobre).
- Limite de 20 chars em botão verificado nos botões propostos (`Participar sorteio` = 18 chars OK).
