# Admin Sorteio Inscritos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `/admin/sorteio` from an in-system winner drawing panel into an operational participant list for an externally-run raffle.

**Architecture:** Keep the WhatsApp registration flow and `raffle_code` intact. Remove the winner/prize surface from API, schema, UI, bot winner messages, and docs. The admin page becomes a compact table-driven workflow for filtering, exporting, and manually opening WhatsApp contact links.

**Tech Stack:** Next.js 16 App Router, React 19, tRPC 11, Drizzle ORM, PostgreSQL, Vitest, Tailwind/shadcn UI primitives.

---

## File Structure

- Modify: `packages/api/src/routers/whatsapp.ts`
  - Keep `list`, `stats`, `exportCsv`.
  - Remove winner-only inputs, winner stats, draw/mark/unmark/notify mutations.
- Create: `packages/api/src/__tests__/whatsapp-router.test.ts`
  - Lock the public admin router contract and CSV shape without hitting a real DB.
- Modify: `packages/db/src/schema/whatsapp.ts`
  - Remove `winnerOf`, `winnerAt`, `notifiedAt`, and winner index.
- Keep/review: `packages/db/src/migrations/0006_ambiguous_tyrannus.sql`
  - Migration should drop winner columns and indexes only.
- Modify: `apps/web/src/app/(app)/admin/sorteio/page.tsx`
  - Rename page copy to participant management.
- Modify: `apps/web/src/app/(app)/admin/sorteio/_components/sorteio-client.tsx`
  - Remove prize cards and winner mutations.
  - Render stats, filters, table, CSV export, and manual WhatsApp action.
- Modify: `packages/api/src/whatsapp/messages.ts`
  - Remove winner message helpers.
  - Adjust copy that implies automated winner notification.
- Modify: `packages/api/src/whatsapp/__tests__/state-machine.test.ts`
  - Remove stale winner fields from participant fixture.
  - Update expected copy only if assertions inspect changed strings.
- Modify: `docs/whatsapp-bot-deploy.md`
  - Remove operational steps that tell admins to test the in-system draw button.

---

### Task 1: Lock WhatsApp Router Contract

**Files:**
- Create: `packages/api/src/__tests__/whatsapp-router.test.ts`
- Modify after failing test: `packages/api/src/routers/whatsapp.ts`

- [ ] **Step 1: Add failing router contract tests**

Create `packages/api/src/__tests__/whatsapp-router.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@dashboard-leads-profills/env/server", () => ({
	env: {
		DATABASE_URL: "postgresql://test:test@localhost:5432/test",
		NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
		NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
		BETTER_AUTH_SECRET: "test-better-auth-secret-min-32-chars-long",
		BETTER_AUTH_URL: "http://localhost:3001",
		GOOGLE_CLIENT_ID: "test-google-client-id",
		GOOGLE_CLIENT_SECRET: "test-google-client-secret",
		NODE_ENV: "test",
		WHATSAPP_ACCESS_TOKEN: "test",
		WHATSAPP_PHONE_NUMBER_ID: "test",
		WHATSAPP_BUSINESS_ACCOUNT_ID: "test",
		WHATSAPP_APP_SECRET: "test",
		WHATSAPP_VERIFY_TOKEN: "test",
		TERMS_VERSION: "v1",
	},
}));

interface ParticipantRow {
	company: string | null;
	consentAt: Date | null;
	createdAt: Date;
	declinedAt: Date | null;
	id: string;
	name: string | null;
	raffleCode: string | null;
	state: string;
	termsVersion: string | null;
	waId: string;
}

async function loadWhatsappRouter(rows: ParticipantRow[]) {
	const orderBy = vi.fn(async () => rows);
	const offset = vi.fn(() => ({ orderBy }));
	const limit = vi.fn(() => ({ offset }));
	const where = vi.fn(() => ({ orderBy, limit, offset }));
	const from = vi.fn(() => ({ where, orderBy }));
	const select = vi.fn(() => ({ from }));

	vi.doMock("@dashboard-leads-profills/db", () => ({
		db: { select },
	}));

	vi.doMock("@dashboard-leads-profills/db/schema/whatsapp", () => ({
		participants: {
			id: "id-column",
			waId: "wa-id-column",
			state: "state-column",
			name: "name-column",
			company: "company-column",
			raffleCode: "raffle-code-column",
			consentAt: "consent-at-column",
			declinedAt: "declined-at-column",
			termsVersion: "terms-version-column",
			createdAt: "created-at-column",
		},
	}));

	vi.doMock("drizzle-orm", () => ({
		and: (...conditions: unknown[]) => ({ kind: "and", conditions }),
		desc: (col: unknown) => ({ kind: "desc", col }),
		eq: (left: unknown, right: unknown) => ({ kind: "eq", left, right }),
		like: (left: unknown, right: unknown) => ({ kind: "like", left, right }),
		or: (...conditions: unknown[]) => ({ kind: "or", conditions }),
		sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
			kind: "sql",
			text: strings.join("?"),
			values,
		}),
	}));

	const module = await import("../routers/whatsapp");
	return { whatsappRouter: module.whatsappRouter, spies: { select } };
}

describe("whatsappRouter admin raffle participants", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it("exposes participant operations and no in-system winner mutations", async () => {
		const { whatsappRouter } = await loadWhatsappRouter([]);

		expect(whatsappRouter.list).toBeDefined();
		expect(whatsappRouter.stats).toBeDefined();
		expect(whatsappRouter.exportCsv).toBeDefined();
		expect("drawRaffle" in whatsappRouter).toBe(false);
		expect("markWinner" in whatsappRouter).toBe(false);
		expect("unmarkWinner" in whatsappRouter).toBe(false);
		expect("notifyWinner" in whatsappRouter).toBe(false);
	});

	it("exports participant CSV without winner columns", async () => {
		const rows: ParticipantRow[] = [
			{
				id: "00000000-0000-0000-0000-000000000001",
				waId: "5511999990001",
				state: "COMPLETED",
				name: "Ana",
				company: "Profills",
				raffleCode: "PROFILLS-1234",
				createdAt: new Date("2026-05-22T10:00:00.000Z"),
				consentAt: new Date("2026-05-22T10:01:00.000Z"),
				declinedAt: null,
				termsVersion: "v1",
			},
		];
		const { whatsappRouter } = await loadWhatsappRouter(rows);
		const caller = whatsappRouter.createCaller({
			user: { id: "admin-user" } as never,
			headers: new Headers(),
			session: null,
			userRole: "admin",
		});

		const result = await caller.exportCsv();

		expect(result.csv.split("\n")[0]).toBe(
			"state,wa_id,name,company,raffle_code,created_at,consent_at,declined_at,terms_version"
		);
		expect(result.csv).toContain("PROFILLS-1234");
		expect(result.csv).not.toContain("winner_of");
		expect(result.csv).not.toContain("notified_at");
	});
});
```

- [ ] **Step 2: Run test to verify failure or current partial state**

Run:

```bash
bun --cwd packages/api test src/__tests__/whatsapp-router.test.ts
```

Expected before implementation is either a type/runtime failure from stale router fields or test pass if the previous agent already completed this backend slice. If it passes, continue to Task 2 without changing backend behavior.

- [ ] **Step 3: Ensure router implementation matches the contract**

In `packages/api/src/routers/whatsapp.ts`, the router should contain this shape:

```ts
export const whatsappRouter = router({
	list: adminProcedure
		.input(
			z.object({
				state: z.enum(PARTICIPANT_STATES).optional(),
				search: z.string().optional(),
				limit: z.number().int().min(1).max(200).default(50),
				offset: z.number().int().min(0).default(0),
			})
		)
		.query(async ({ input }) => {
			// keep existing list implementation selecting participant fields only
		}),

	stats: adminProcedure.query(async () => {
		// keep existing total/completed/declined/inProgress aggregation only
	}),

	exportCsv: adminProcedure.query(async () => {
		// keep existing CSV implementation without winner columns
	}),
});
```

Remove imports for `TRPCError`, `sendText`, winner message helpers, `messagesTable`, `isNull`, `isNotNull`, and all procedures named `drawRaffle`, `markWinner`, `unmarkWinner`, `notifyWinner`.

- [ ] **Step 4: Re-run focused test**

Run:

```bash
bun --cwd packages/api test src/__tests__/whatsapp-router.test.ts
```

Expected: PASS.

---

### Task 2: Finish Schema and Test Fixture Cleanup

**Files:**
- Modify: `packages/db/src/schema/whatsapp.ts`
- Review: `packages/db/src/migrations/0006_ambiguous_tyrannus.sql`
- Modify: `packages/api/src/whatsapp/__tests__/state-machine.test.ts`

- [ ] **Step 1: Remove winner fields from the Drizzle schema**

In `packages/db/src/schema/whatsapp.ts`, the `participants` table must not define these fields:

```ts
winnerOf: text("winner_of"),
winnerAt: timestamp("winner_at", { withTimezone: true, mode: "date" }),
notifiedAt: timestamp("notified_at", { withTimezone: true, mode: "date" }),
```

The table index callback must be:

```ts
(table) => [index("participants_state_idx").on(table.state)]
```

- [ ] **Step 2: Verify migration only removes winner persistence**

Open `packages/db/src/migrations/0006_ambiguous_tyrannus.sql`. It should contain:

```sql
DROP INDEX IF EXISTS "whatsapp"."winner_of_unique";--> statement-breakpoint
DROP INDEX "whatsapp"."participants_winner_of_idx";--> statement-breakpoint
ALTER TABLE "whatsapp"."participants" DROP COLUMN "winner_of";--> statement-breakpoint
ALTER TABLE "whatsapp"."participants" DROP COLUMN "winner_at";--> statement-breakpoint
ALTER TABLE "whatsapp"."participants" DROP COLUMN "notified_at";
```

If the migration contains unrelated drops or table changes, stop and resolve before continuing.

- [ ] **Step 3: Update the state-machine fixture**

In `packages/api/src/whatsapp/__tests__/state-machine.test.ts`, remove these properties from `makeParticipant()`:

```ts
winnerOf: null,
winnerAt: null,
notifiedAt: null,
```

- [ ] **Step 4: Run WhatsApp tests**

Run:

```bash
bun --cwd packages/api test src/whatsapp
```

Expected: PASS.

---

### Task 3: Rebuild Admin UI as Participant Operations

**Files:**
- Modify: `apps/web/src/app/(app)/admin/sorteio/page.tsx`
- Modify: `apps/web/src/app/(app)/admin/sorteio/_components/sorteio-client.tsx`

- [ ] **Step 1: Update page header copy**

In `apps/web/src/app/(app)/admin/sorteio/page.tsx`, use:

```tsx
<PageHeader
	eyebrow="Admin"
	subtitle="Acompanhe inscritos, exporte a base e abra contatos para operação manual. O sorteio será realizado fora do sistema."
	title="Inscritos do sorteio"
/>
```

- [ ] **Step 2: Remove prize/winner UI state and imports**

In `sorteio-client.tsx`, remove:

```ts
AlertDialog,
AlertDialogAction,
AlertDialogCancel,
AlertDialogContent,
AlertDialogDescription,
AlertDialogFooter,
AlertDialogHeader,
AlertDialogTitle,
Card,
CardContent,
CardFooter,
CardHeader,
CardTitle,
Bell,
RefreshCw,
Shuffle,
type Prize,
PRIZES,
PrizeCard,
prizeLabel,
handleDrawError,
winnersQuery,
getWinnerFor,
drawMutation,
notifyMutation,
unmarkMutation,
```

Keep `Download`, `Search`, `Button`, table components, inputs, select, skeletons, `toast`, `useQuery`, `useQueryClient`, `useRef`, `useState`.

- [ ] **Step 3: Update participant type**

Replace `Participant` with:

```ts
interface Participant {
	company: string | null;
	consentAt: string | null;
	createdAt: string;
	declinedAt: string | null;
	id: string;
	name: string | null;
	raffleCode: string | null;
	state: string;
	termsVersion: string | null;
	waId: string | null;
}
```

- [ ] **Step 4: Add WhatsApp link helpers**

Add:

```ts
function normalizeWaId(waId: string): string {
	return waId.replace(/\D/g, "");
}

function whatsappHref(waId: string): string {
	return `https://wa.me/${normalizeWaId(waId)}`;
}
```

- [ ] **Step 5: Remove winner count from stats**

Change `StatsRow` data type to:

```ts
data?: {
	completed: number;
	declined: number;
	inProgress: number;
	total: number;
};
```

Render four cards only:

```tsx
<StatCard label="Total" value={data?.total ?? 0} />
<StatCard label="Completos" value={data?.completed ?? 0} />
<StatCard label="Recusas" value={data?.declined ?? 0} />
<StatCard label="Em andamento" value={data?.inProgress ?? 0} />
```

Change the grid class to:

```tsx
<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
```

- [ ] **Step 6: Replace participant row action**

Replace `ParticipantRow` with:

```tsx
function ParticipantRow({ participant }: { participant: Participant }) {
	return (
		<TableRow key={participant.id}>
			<TableCell>
				<Badge variant={stateBadgeVariant(participant.state)}>
					{stateLabel(participant.state)}
				</Badge>
			</TableCell>
			<TableCell className="font-mono text-xs">
				{participant.raffleCode ?? "-"}
			</TableCell>
			<TableCell className="font-medium">{participant.name ?? "-"}</TableCell>
			<TableCell>{participant.company ?? "-"}</TableCell>
			<TableCell className="font-mono text-xs">
				{participant.waId ? maskWaId(participant.waId) : "-"}
			</TableCell>
			<TableCell className="text-sm">
				{formatDateTime(participant.createdAt)}
			</TableCell>
			<TableCell className="text-sm">{participant.termsVersion ?? "-"}</TableCell>
			<TableCell className="text-right">
				{participant.waId ? (
					<Button asChild size="sm" type="button" variant="outline">
						<a
							href={whatsappHref(participant.waId)}
							rel="noreferrer"
							target="_blank"
						>
							Contato
						</a>
					</Button>
				) : (
					"-"
				)}
			</TableCell>
		</TableRow>
	);
}
```

- [ ] **Step 7: Remove prize card section and stale queries**

Delete the whole render block headed by `/* Prize cards */`.

Delete this query:

```ts
const winnersQuery = useQuery(
	trpc.whatsapp.list.queryOptions({
		onlyWinners: true,
		limit: 10,
		offset: 0,
	})
);
```

- [ ] **Step 8: Update table headers and row usage**

Use headers:

```tsx
<TableHead>Estado</TableHead>
<TableHead>Código</TableHead>
<TableHead>Nome</TableHead>
<TableHead>Empresa</TableHead>
<TableHead>WhatsApp</TableHead>
<TableHead>Inscrição</TableHead>
<TableHead>Termos</TableHead>
<TableHead className="text-right">Ação</TableHead>
```

Render rows with:

```tsx
{listQuery.data.items.map((participant) => (
	<ParticipantRow key={participant.id} participant={participant} />
))}
```

- [ ] **Step 9: Run typecheck for stale tRPC calls**

Run:

```bash
bun run check-types
```

Expected: no references to `drawRaffle`, `notifyWinner`, `unmarkWinner`, `onlyWinners`, or `winnerOf`.

---

### Task 4: Adjust Bot Copy and Operational Docs

**Files:**
- Modify: `packages/api/src/whatsapp/messages.ts`
- Modify: `docs/whatsapp-bot-deploy.md`

- [ ] **Step 1: Remove winner message helpers**

Ensure `packages/api/src/whatsapp/messages.ts` has no exported functions named:

```ts
winnerTv
winnerChurrasqueira
winnerCooler
```

- [ ] **Step 2: Change regulation text that implies automated winner notification**

In `regulamento()`, replace:

```ts
"• Os vencedores serão notificados por este WhatsApp.\n" +
```

with:

```ts
"• A equipe Profills entrará em contato manualmente com os sorteados quando necessário.\n" +
```

- [ ] **Step 3: Update deployment doc operation steps**

In `docs/whatsapp-bot-deploy.md`, replace any instruction to test the `Sortear` button with:

```md
# 6. Painel: https://lead.profills.com/admin/sorteio (logado como admin)
#    - Confira inscritos completos
#    - Teste filtros e busca
#    - Exporte o CSV para o sorteio externo
#    - Abra um contato de teste pelo botão WhatsApp
```

- [ ] **Step 4: Run focused WhatsApp tests**

Run:

```bash
bun --cwd packages/api test src/whatsapp
```

Expected: PASS.

---

### Task 5: Final Verification

**Files:**
- Runtime code and docs touched above.

- [ ] **Step 1: Search for stale runtime references**

Run:

```bash
rtk rg -n "drawRaffle|notifyWinner|unmarkWinner|markWinner|onlyWinners|onlyEligibleForRaffle|winnerOf|winnerAt|notifiedAt|winner_of|winner_at|notified_at" apps packages docs --glob '!packages/db/src/migrations/0005_*' --glob '!packages/db/src/migrations/meta/0005_snapshot.json'
```

Expected allowed hits:

```text
packages/db/src/migrations/0006_ambiguous_tyrannus.sql
packages/db/src/migrations/meta/0006_snapshot.json
docs/superpowers/specs/2026-05-22-admin-sorteio-inscritos-design.md
docs/superpowers/plans/2026-05-22-admin-sorteio-inscritos.md
```

Any runtime hit under `apps/` or `packages/api/src/routers` must be fixed.

- [ ] **Step 2: Run API tests**

Run:

```bash
bun --cwd packages/api test
```

Expected: PASS.

- [ ] **Step 3: Run repository typecheck**

Run:

```bash
bun run check-types
```

Expected: PASS.

- [ ] **Step 4: Run whitespace check**

Run:

```bash
rtk git diff --check
```

Expected: no output.

- [ ] **Step 5: Inspect final diff**

Run:

```bash
rtk git diff --stat
rtk git diff -- 'apps/web/src/app/(app)/admin/sorteio' packages/api/src/routers/whatsapp.ts packages/api/src/whatsapp/messages.ts packages/api/src/whatsapp/__tests__/state-machine.test.ts packages/api/src/__tests__/whatsapp-router.test.ts packages/db/src/schema/whatsapp.ts docs/whatsapp-bot-deploy.md
```

Expected: changes are limited to the approved participant-panel cleanup plus already-approved migration files. Do not revert unrelated dirty admin files from the prior agent.

---

## Self-Review

- Spec coverage: The plan covers route copy, stats, filters, table, manual WhatsApp contact, CSV export, API removals, schema removals, bot copy, docs, and verification.
- Placeholder scan: No `TBD`, generic "add tests", or unresolved implementation placeholders are used as required work. The router step references preserving existing list/stat/export internals because those are already implemented and not part of the new behavior.
- Type consistency: Removed fields are consistently named `winnerOf`, `winnerAt`, `notifiedAt` in TypeScript and `winner_of`, `winner_at`, `notified_at` in SQL. The UI participant type matches the selected router fields.
