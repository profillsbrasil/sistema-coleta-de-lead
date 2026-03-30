# Remove Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the follow-up feature entirely from all layers (DB, API, frontend, offline) to keep the system focused on quick lead collection during events.

**Architecture:** Surgical removal across 4 layers — database schema first (Drizzle), then API routers (tRPC), then frontend (React components, forms, dashboard), and finally client-side offline storage (Dexie). Each task is self-contained and produces a compilable state.

**Tech Stack:** Drizzle ORM, tRPC, React 19, Dexie, Vitest, Zod

---

## File Map

**Delete:**
- `apps/web/src/components/follow-up-selector.tsx`
- `apps/web/src/app/(app)/dashboard/funnel-tab.tsx`

**Modify:**
- `packages/db/src/schema/leads.ts` — remove enum + column
- `packages/api/src/routers/sync.ts` — remove from allowed fields + create block
- `packages/api/src/routers/admin/leads.ts` — remove from update input
- `apps/web/src/lib/db/types.ts` — remove type + interface field
- `apps/web/src/lib/db/index.ts` — version 5 migration
- `apps/web/src/lib/lead/validation.ts` — remove from Zod schema
- `apps/web/src/lib/lead/save-lead.ts` — remove from Dexie add + sync payload
- `apps/web/src/lib/lead/update-lead.ts` — remove from Dexie update + sync payload
- `apps/web/src/lib/lead/export-csv.ts` — remove labels, header column, serialization
- `apps/web/src/lib/lead/export-csv.test.ts` — update test data + assertions
- `apps/web/src/components/lead-form.tsx` — remove state, import, form section
- `apps/web/src/components/lead-card.tsx` — remove config + badge rendering
- `apps/web/src/app/(app)/admin/leads/admin-lead-card.tsx` — remove config + badge rendering
- `apps/web/src/app/(app)/dashboard/dashboard.tsx` — remove Funil tab

---

### Task 1: Remove follow-up from database schema

**Files:**
- Modify: `packages/db/src/schema/leads.ts`

- [ ] **Step 1: Remove the `followUpStatusEnum` definition**

In `packages/db/src/schema/leads.ts`, remove lines 17-23 (the entire enum block):

```typescript
// DELETE this entire block:
export const followUpStatusEnum = pgEnum("follow_up_status", [
	"pendente",
	"contatado",
	"em_negociacao",
	"convertido",
	"perdido",
]);
```

- [ ] **Step 2: Remove the `followUpStatus` column from the leads table**

In the same file, remove lines 39-41 (the column definition inside the `leads` pgTable):

```typescript
// DELETE these lines from the table definition:
		followUpStatus: followUpStatusEnum("follow_up_status")
			.notNull()
			.default("pendente"),
```

- [ ] **Step 3: Remove unused `pgEnum` import if no other enums use it**

Check if `interestTagEnum` still uses `pgEnum`. It does (line 11), so keep the import. No change needed here.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `bun run check-types`
Expected: May show errors in downstream files (API routers) — that's expected, we fix those in Task 2.

---

### Task 2: Remove follow-up from API routers

**Files:**
- Modify: `packages/api/src/routers/sync.ts`
- Modify: `packages/api/src/routers/admin/leads.ts`

- [ ] **Step 1: Remove `followUpStatus` from `ALLOWED_LEAD_FIELDS` in sync.ts**

In `packages/api/src/routers/sync.ts`, edit the `ALLOWED_LEAD_FIELDS` Set (lines 23-34). Remove the `"followUpStatus"` entry:

```typescript
const ALLOWED_LEAD_FIELDS = new Set([
	"name",
	"phone",
	"email",
	"company",
	"position",
	"segment",
	"notes",
	"interestTag",
	"photoUrl",
]);
```

- [ ] **Step 2: Remove `followUpStatus` from the create case in sync.ts**

In the `case "create"` block (lines 60-91), remove lines 74-80 (the followUpStatus field from the `.values()` call):

```typescript
// DELETE these lines from the .values() object:
								followUpStatus:
									(fields.followUpStatus as string as
										| "pendente"
										| "contatado"
										| "em_negociacao"
										| "convertido"
										| "perdido") ?? "pendente",
```

- [ ] **Step 3: Remove `followUpStatus` from admin leads update input**

In `packages/api/src/routers/admin/leads.ts`, remove lines 90-98 from the update input Zod schema:

```typescript
// DELETE these lines from the z.object data schema:
					followUpStatus: z
						.enum([
							"pendente",
							"contatado",
							"em_negociacao",
							"convertido",
							"perdido",
						])
						.optional(),
```

- [ ] **Step 4: Verify TypeScript compiles for API package**

Run: `bun run check-types`
Expected: API package passes. Frontend may still have errors (fixed in next tasks).

---

### Task 3: Remove follow-up from Dexie types and schema

**Files:**
- Modify: `apps/web/src/lib/db/types.ts`
- Modify: `apps/web/src/lib/db/index.ts`

- [ ] **Step 1: Remove `FollowUpStatus` type and field from types.ts**

In `apps/web/src/lib/db/types.ts`, remove lines 1-6 (the type definition):

```typescript
// DELETE this entire type:
export type FollowUpStatus =
	| "pendente"
	| "contatado"
	| "em_negociacao"
	| "convertido"
	| "perdido";
```

And remove line 13 (the field from the Lead interface):

```typescript
// DELETE this line from the Lead interface:
	followUpStatus: FollowUpStatus;
```

- [ ] **Step 2: Add Dexie version 5 migration in index.ts**

In `apps/web/src/lib/db/index.ts`, add a new version 5 block after the version 4 block (after line 46). The version 5 schema removes `followUpStatus` from the leads index and adds a migration to clean up existing records:

```typescript
db.version(5)
	.stores({
		leads:
			"localId, serverId, userId, interestTag, syncStatus, createdAt, updatedAt",
		syncQueue: "++id, localId, operation, timestamp",
		leaderboardCache: "userId, rank",
	})
	.upgrade((tx) =>
		tx
			.table("leads")
			.toCollection()
			.modify((lead) => {
				delete lead.followUpStatus;
			})
	);
```

- [ ] **Step 3: Verify the Dexie schema change compiles**

Run: `bun run check-types`
Expected: More downstream errors expected in lead form/save/update files — addressed in Task 4.

---

### Task 4: Remove follow-up from validation, save-lead, and update-lead

**Files:**
- Modify: `apps/web/src/lib/lead/validation.ts`
- Modify: `apps/web/src/lib/lead/save-lead.ts`
- Modify: `apps/web/src/lib/lead/update-lead.ts`

- [ ] **Step 1: Remove `followUpStatus` from Zod schema in validation.ts**

In `apps/web/src/lib/lead/validation.ts`, remove lines 9-11:

```typescript
// DELETE these lines from the z.object:
		followUpStatus: z
			.enum(["pendente", "contatado", "em_negociacao", "convertido", "perdido"])
			.default("pendente"),
```

- [ ] **Step 2: Remove `followUpStatus` from save-lead.ts**

In `apps/web/src/lib/lead/save-lead.ts`, remove line 28 from the `db.leads.add()` call:

```typescript
// DELETE this line:
		followUpStatus: data.followUpStatus,
```

And remove line 48 (after the deletion above, the line number shifts) from the sync queue payload:

```typescript
// DELETE this line from the JSON.stringify object:
			followUpStatus: data.followUpStatus,
```

- [ ] **Step 3: Remove `followUpStatus` from update-lead.ts**

In `apps/web/src/lib/lead/update-lead.ts`, remove line 24 from the `updates` object:

```typescript
// DELETE this line:
		followUpStatus: data.followUpStatus,
```

And remove line 47 (shifts after deletion) from the sync queue payload:

```typescript
// DELETE this line from the JSON.stringify object:
			followUpStatus: data.followUpStatus,
```

- [ ] **Step 4: Verify these files compile**

Run: `bun run check-types`
Expected: Closer to clean, but lead-form and lead-card still reference followUp.

---

### Task 5: Remove follow-up from lead-form component

**Files:**
- Modify: `apps/web/src/components/lead-form.tsx`
- Delete: `apps/web/src/components/follow-up-selector.tsx`

- [ ] **Step 1: Remove imports related to follow-up in lead-form.tsx**

In `apps/web/src/components/lead-form.tsx`:

Remove `FollowUpStatus` from the type import on line 17. Change:

```typescript
import type { FollowUpStatus, Lead } from "@/lib/db/types";
```

To:

```typescript
import type { Lead } from "@/lib/db/types";
```

Remove the `FollowUpSelector` import on line 24:

```typescript
// DELETE this line:
import FollowUpSelector from "./follow-up-selector";
```

- [ ] **Step 2: Remove `followUpStatus` state in lead-form.tsx**

Remove lines 67-69 (the useState for followUpStatus):

```typescript
// DELETE these lines:
	const [followUpStatus, setFollowUpStatus] = useState<FollowUpStatus>(
		lead?.followUpStatus ?? "pendente"
	);
```

- [ ] **Step 3: Remove `followUpStatus` from the safeParse call**

In the `handleSubmit` function, remove `followUpStatus,` from the object passed to `leadFormSchema.safeParse()` (line 124). The object should go from:

```typescript
		const result = leadFormSchema.safeParse({
			name,
			phone: unmaskPhone(phone),
			email,
			interestTag,
			followUpStatus,
			company,
			position,
			segment,
			notes,
		});
```

To:

```typescript
		const result = leadFormSchema.safeParse({
			name,
			phone: unmaskPhone(phone),
			email,
			interestTag,
			company,
			position,
			segment,
			notes,
		});
```

- [ ] **Step 4: Remove the Follow-up form section in lead-form.tsx**

Remove lines 234-241 (the entire div with Follow-up label and FollowUpSelector):

```tsx
// DELETE this entire block:
						<div className="flex flex-col gap-2 md:col-span-2">
							<Label>Follow-up</Label>
							<FollowUpSelector
								disabled={isSubmitting}
								onChange={setFollowUpStatus}
								value={followUpStatus}
							/>
						</div>
```

- [ ] **Step 5: Delete the follow-up-selector.tsx component file**

Delete `apps/web/src/components/follow-up-selector.tsx` entirely.

Run: `rm apps/web/src/components/follow-up-selector.tsx`

- [ ] **Step 6: Verify lead-form compiles**

Run: `bun run check-types`
Expected: lead-form.tsx clean. Remaining errors in lead-card files and dashboard.

---

### Task 6: Remove follow-up from lead-card and admin-lead-card

**Files:**
- Modify: `apps/web/src/components/lead-card.tsx`
- Modify: `apps/web/src/app/(app)/admin/leads/admin-lead-card.tsx`

- [ ] **Step 1: Clean up lead-card.tsx**

In `apps/web/src/components/lead-card.tsx`:

Remove unused icon imports. Change line 6-12 from:

```typescript
import {
	CheckCircle2,
	Handshake,
	MessageCircle,
	PhoneCall,
	XCircle,
} from "lucide-react";
```

To:

```typescript
import { MessageCircle } from "lucide-react";
```

Remove the `FollowUpStatus` type import on line 13. Change:

```typescript
import type { FollowUpStatus, Lead } from "@/lib/db/types";
```

To:

```typescript
import type { Lead } from "@/lib/db/types";
```

Remove the entire `FOLLOW_UP_CONFIG` constant (lines 35-59):

```typescript
// DELETE this entire block:
const FOLLOW_UP_CONFIG: Record<
	Exclude<FollowUpStatus, "pendente">,
	{ icon: typeof PhoneCall; label: string; className: string }
> = {
	contatado: { ... },
	em_negociacao: { ... },
	convertido: { ... },
	perdido: { ... },
};
```

Remove the `followUpConfig` variable (lines 69-72):

```typescript
// DELETE these lines:
	const followUpConfig =
		lead.followUpStatus === "pendente"
			? null
			: FOLLOW_UP_CONFIG[lead.followUpStatus];
```

Remove the follow-up badge rendering (lines 122-132):

```tsx
// DELETE this entire block:
						{followUpConfig ? (
							<span
								className={cn(
									"inline-flex items-center gap-0.5 text-[0.65rem] leading-none",
									followUpConfig.className
								)}
							>
								<followUpConfig.icon className="size-3" />
								{followUpConfig.label}
							</span>
						) : null}
```

- [ ] **Step 2: Clean up admin-lead-card.tsx**

In `apps/web/src/app/(app)/admin/leads/admin-lead-card.tsx`:

Remove unused icon imports. Change lines 13-22 from:

```typescript
import {
	CheckCircle2,
	Handshake,
	MessageCircle,
	MoreVertical,
	Pencil,
	PhoneCall,
	Trash2,
	XCircle,
} from "lucide-react";
```

To:

```typescript
import {
	MessageCircle,
	MoreVertical,
	Pencil,
	Trash2,
} from "lucide-react";
```

Remove the entire `FOLLOW_UP_CONFIG` constant (lines 26-50):

```typescript
// DELETE this entire block:
const FOLLOW_UP_CONFIG: Record<
	string,
	{ icon: typeof PhoneCall; label: string; className: string }
> = { ... };
```

Remove `followUpStatus` from the interface (line 77):

```typescript
// DELETE this line from AdminLeadCardProps.lead:
		followUpStatus?: string;
```

Remove the `followUpConfig` variable (lines 91-94):

```typescript
// DELETE these lines:
	const followUpConfig =
		lead.followUpStatus && lead.followUpStatus !== "pendente"
			? FOLLOW_UP_CONFIG[lead.followUpStatus]
			: null;
```

Remove the follow-up badge rendering (lines 110-120):

```tsx
// DELETE this entire block:
						{followUpConfig ? (
							<span
								className={cn(
									"inline-flex shrink-0 items-center gap-0.5 text-[0.65rem] leading-none",
									followUpConfig.className
								)}
							>
								<followUpConfig.icon className="size-3" />
								{followUpConfig.label}
							</span>
						) : null}
```

- [ ] **Step 3: Verify both card components compile**

Run: `bun run check-types`
Expected: Card components clean. Dashboard still has errors.

---

### Task 7: Remove Funil tab from dashboard

**Files:**
- Delete: `apps/web/src/app/(app)/dashboard/funnel-tab.tsx`
- Modify: `apps/web/src/app/(app)/dashboard/dashboard.tsx`

- [ ] **Step 1: Remove FunnelTab import and usage from dashboard.tsx**

In `apps/web/src/app/(app)/dashboard/dashboard.tsx`:

Remove the import on line 20:

```typescript
// DELETE this line:
import FunnelTab from "./funnel-tab";
```

Remove the "Funil" tab trigger on line 66:

```tsx
// DELETE this line:
					<TabsTrigger value="funil">Funil</TabsTrigger>
```

Remove the Funil TabsContent block (lines 96-98):

```tsx
// DELETE this entire block:
			<TabsContent className="mt-4" value="funil">
				<FunnelTab />
			</TabsContent>
```

- [ ] **Step 2: Delete the funnel-tab.tsx file**

Delete `apps/web/src/app/(app)/dashboard/funnel-tab.tsx` entirely.

Run: `rm apps/web/src/app/(app)/dashboard/funnel-tab.tsx`

- [ ] **Step 3: Verify dashboard compiles**

Run: `bun run check-types`
Expected: All TypeScript errors resolved.

---

### Task 8: Remove follow-up from CSV export and tests

**Files:**
- Modify: `apps/web/src/lib/lead/export-csv.ts`
- Modify: `apps/web/src/lib/lead/export-csv.test.ts`

- [ ] **Step 1: Remove follow-up from export-csv.ts**

In `apps/web/src/lib/lead/export-csv.ts`:

Remove `followUpStatus` from the `ExportableLead` interface (line 7):

```typescript
// DELETE this line:
	followUpStatus?: string | null;
```

Remove the `FOLLOW_UP_LABELS` constant (lines 28-34):

```typescript
// DELETE this entire block:
const FOLLOW_UP_LABELS: Record<string, string> = {
	pendente: "Pendente",
	contatado: "Contatado",
	em_negociacao: "Em Negociação",
	convertido: "Convertido",
	perdido: "Perdido",
};
```

Remove "Follow-up" from the CSV header (line 37). Change:

```typescript
const CSV_HEADER =
	"Nome,Telefone,Email,Empresa,Cargo,Segmento,Interesse,Follow-up,Notas,Data de Criação";
```

To:

```typescript
const CSV_HEADER =
	"Nome,Telefone,Email,Empresa,Cargo,Segmento,Interesse,Notas,Data de Criação";
```

Remove the follow-up field from `serializeLeadRow` (lines 92-94). Change the `fields` array from:

```typescript
	const fields = [
		lead.name,
		lead.phone ? formatPhone(lead.phone) : "",
		lead.email ?? "",
		lead.company ?? "",
		lead.position ?? "",
		lead.segment ?? "",
		TAG_LABELS[lead.interestTag] ?? lead.interestTag,
		lead.followUpStatus
			? (FOLLOW_UP_LABELS[lead.followUpStatus] ?? lead.followUpStatus)
			: "Pendente",
		lead.notes ?? "",
		formatDate(lead.createdAt),
	];
```

To:

```typescript
	const fields = [
		lead.name,
		lead.phone ? formatPhone(lead.phone) : "",
		lead.email ?? "",
		lead.company ?? "",
		lead.position ?? "",
		lead.segment ?? "",
		TAG_LABELS[lead.interestTag] ?? lead.interestTag,
		lead.notes ?? "",
		formatDate(lead.createdAt),
	];
```

- [ ] **Step 2: Update export-csv.test.ts**

In `apps/web/src/lib/lead/export-csv.test.ts`:

Remove `followUpStatus` from the `TestLead` interface (line 10):

```typescript
// DELETE this line:
	followUpStatus?: string | null;
```

Remove `followUpStatus` from the `makeLead` default (line 28):

```typescript
// DELETE this line:
		followUpStatus: "pendente",
```

Update the header test (line 41). Change:

```typescript
		expect(csv.split("\n")[0]).toBe(
			"\uFEFFNome,Telefone,Email,Empresa,Cargo,Segmento,Interesse,Follow-up,Notas,Data de Criação"
		);
```

To:

```typescript
		expect(csv.split("\n")[0]).toBe(
			"\uFEFFNome,Telefone,Email,Empresa,Cargo,Segmento,Interesse,Notas,Data de Criação"
		);
```

Update the "preserves accented values" test (lines 60-73). Remove `followUpStatus` from the makeLead call and remove the `Em Negociacao` assertion:

```typescript
	it("preserves accented values and multiline notes", () => {
		const csv = generateCsvContent([
			makeLead({
				company: "Ações Integradas",
				notes: "Negociação em andamento\nRetornar amanhã",
				segment: "Tecnologia",
			}),
		]);

		expect(csv).toContain("Ações Integradas");
		expect(csv).toContain('"Negociação em andamento\nRetornar amanhã"');
	});
```

Update the "handles null and empty fields" test (lines 118-139). The field indices shift because Follow-up column is gone. The comment on line 132 and assertions need updating:

```typescript
	it("handles null and empty fields gracefully", () => {
		const csv = generateCsvContent([
			makeLead({
				phone: null,
				email: null,
				company: null,
				position: null,
				segment: null,
				notes: null,
			}),
		]);
		const dataLine = csv.split("\n")[1] ?? "";
		const fields = dataLine.split(",");
		// phone (1), email (2), company (3), position (4), segment (5), notes (7) should be empty
		expect(fields[1]).toBe("");
		expect(fields[2]).toBe("");
		expect(fields[3]).toBe("");
		expect(fields[4]).toBe("");
		expect(fields[5]).toBe("");
		expect(fields[7]).toBe("");
	});
```

- [ ] **Step 3: Run tests to verify**

Run: `bun run test`
Expected: All tests pass.

---

### Task 9: Generate Drizzle migration and run full verification

**Files:**
- New migration file will be auto-generated

- [ ] **Step 1: Generate the Drizzle migration**

Run: `bun run db:generate`
Expected: A new migration SQL file is created in `packages/db/src/migrations/` containing:
```sql
ALTER TABLE "leads" DROP COLUMN "follow_up_status";
DROP TYPE "follow_up_status";
```

- [ ] **Step 2: Run full type check**

Run: `bun run check-types`
Expected: PASS — zero errors.

- [ ] **Step 3: Run Biome lint/format**

Run: `bun run check`
Expected: PASS — no warnings about unused imports or dead code.

- [ ] **Step 4: Run all tests**

Run: `bun run test`
Expected: PASS — all test suites green.

- [ ] **Step 5: Run build**

Run: `bun run build`
Expected: PASS — production build succeeds.

- [ ] **Step 6: Final grep for follow-up remnants**

Run: `grep -rni "followUp\|follow_up\|follow-up\|FOLLOW_UP" --include="*.ts" --include="*.tsx" apps/ packages/ | grep -v node_modules | grep -v migrations`
Expected: Zero results (migrations are excluded because the old migration file still references it, which is fine).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: remove funcionalidade de follow-up

Follow-up (funil de vendas) nao faz sentido para coleta rapida
de leads em eventos. Remove de todas as camadas:
- Schema PostgreSQL (enum + coluna)
- tRPC routers (sync + admin)
- Frontend (form, cards, dashboard tab)
- Dexie offline (types, indices, migration v5)
- CSV export (coluna + labels)
EOF
)"
```
