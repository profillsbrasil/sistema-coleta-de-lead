# Web shadcn Compliance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar `apps/web` 100% conforme com shadcn primitives e tokens semanticos do design system, sem alterar UX ou identidade visual.

**Architecture:** Refactor em 4 fases sequenciais — (1) adicionar tokens semanticos no `globals.css`, (2) substituir 8 raw `<button>` por `Button`/`ToggleGroup` shadcn, (3) mapear ~12 cores hardcoded para tokens, (4) normalizar ~15 typography arbitraria para escala padrao. Nenhum teste unitario novo — verificacao e typecheck + lint + grep + inspecao visual manual.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, shadcn/ui em `packages/ui`, base-ui (`@base-ui/react`), Ultracite/Biome, Turborepo + Bun.

**Spec:** [docs/superpowers/specs/2026-04-15-web-shadcn-compliance-design.md](docs/superpowers/specs/2026-04-15-web-shadcn-compliance-design.md)

---

## File Structure

Arquivos modificados (nenhum novo):

### Tokens (Fase 1)
- `packages/ui/src/styles/globals.css` — adicao de tokens warning/success/gold/rank-accent/glow-primary

### Raw buttons (Fase 2)
- `apps/web/src/app/(app)/admin/users/users-panel.tsx` — DropdownMenuTrigger render={Button}
- `apps/web/src/app/(app)/admin/users/admin-user-card.tsx` — DropdownMenuTrigger render={Button}
- `apps/web/src/app/(app)/admin/leads/leads-panel.tsx` — DropdownMenuTrigger render={Button}
- `apps/web/src/app/(app)/admin/leads/admin-lead-card.tsx` — DropdownMenuTrigger render={Button}
- `apps/web/src/app/(app)/leads/lead-list.tsx` — clear-search Button ghost
- `apps/web/src/components/tag-selector.tsx` — ToggleGroup radio pattern
- `apps/web/src/components/tag-filter.tsx` — ToggleGroup com estado "todos"

### Cores (Fase 3)
- `apps/web/src/components/sync-status-indicator.tsx`
- `apps/web/src/components/sync-status-icon.tsx`
- `apps/web/src/components/global-header.tsx`
- `apps/web/src/components/event-countdown.tsx`
- `apps/web/src/components/podium.tsx`

### Typography (Fase 4)
- `apps/web/src/components/global-header.tsx`
- `apps/web/src/components/podium.tsx`
- `apps/web/src/components/bottom-nav.tsx`
- `apps/web/src/components/stat-card.tsx`
- `apps/web/src/components/ranking-list.tsx`
- `apps/web/src/components/event-countdown.tsx`
- `apps/web/src/components/sync-status-indicator.tsx`
- `apps/web/src/app/(app)/admin/users/admin-user-card.tsx`

**Total: 17 arquivos distintos, 4 commits (um por fase).**

---

## Phase 1: Tokens semanticos

### Task 1: Adicionar tokens warning/success/gold/rank-accent/glow-primary

**Files:**
- Modify: `packages/ui/src/styles/globals.css`

- [ ] **Step 1: Adicionar tokens em `:root` (light mode)**

Abrir `packages/ui/src/styles/globals.css`. Localizar o bloco `:root { ... }` (comeca na linha 9). Logo apos o bloco `/* Tag colors */` (final do `:root`, antes do `}` da linha 53), adicionar:

```css
	/* Status colors */
	--warning: #eab308;
	--warning-foreground: #fefce8;
	--success: #22c55e;
	--success-foreground: #f0fdf4;
	/* Accents semanticos */
	--gold: #eab308;
	--rank-accent: #818cf8;
	/* Effects */
	--glow-primary: 0 0 16px rgba(62, 207, 142, 0.25);
```

- [ ] **Step 2: Adicionar tokens em `.dark`**

No bloco `.dark { ... }` (comeca na linha 55), apos o bloco `/* Tag colors */` do dark (antes do `}` da linha 98), adicionar:

```css
	/* Status colors */
	--warning: #fbbf24;
	--warning-foreground: #0f0f0f;
	--success: #34d399;
	--success-foreground: #0f0f0f;
	/* Accents semanticos */
	--gold: #facc15;
	--rank-accent: #a5b4fc;
	/* Effects */
	--glow-primary: 0 0 16px rgba(62, 207, 142, 0.3);
```

- [ ] **Step 3: Adicionar mapeamento em `@theme inline`**

No bloco `@theme inline { ... }` (comeca na linha 100). Apos a linha `--color-tag-frio-text: var(--tag-frio-text);` (linha 114), adicionar:

```css
	/* Status colors */
	--color-warning: var(--warning);
	--color-warning-foreground: var(--warning-foreground);
	--color-success: var(--success);
	--color-success-foreground: var(--success-foreground);
	/* Accents */
	--color-gold: var(--gold);
	--color-rank-accent: var(--rank-accent);
	/* Effects */
	--shadow-glow-primary: var(--glow-primary);
```

- [ ] **Step 4: Verificar typecheck e build**

Run: `bun run check-types`
Expected: sem erros

Run: `bun run dev:web` (em background)
Navegar: http://localhost:3001 — verificar que compila sem erro CSS. Fechar servidor.

- [ ] **Step 5: Verificar tokens resolvem**

Criar um arquivo temporario `apps/web/src/app/(public)/page.tsx` — nao, melhor usar grep para validar que classes `bg-warning`, `text-success`, etc ainda nao sao usadas (vao ser usadas na Fase 3).

Run: `grep -r "bg-warning\|text-warning\|bg-success\|text-success\|text-gold\|fill-gold\|text-rank-accent\|shadow-glow-primary" apps/web/src`
Expected: sem matches (ainda nao usadas)

Run: `grep -E "^\s*--warning:|^\s*--success:|^\s*--gold:|^\s*--rank-accent:|^\s*--glow-primary:" packages/ui/src/styles/globals.css`
Expected: 10 matches (5 tokens x 2 blocos `:root` e `.dark`)

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/styles/globals.css
git commit -m "feat(ui): adicionar tokens semanticos warning/success/gold/rank-accent"
```

---

## Phase 2: Raw buttons → shadcn

### Task 2: DropdownMenuTrigger render={Button} (4 arquivos, mesmo pattern)

**Files:**
- Modify: `apps/web/src/app/(app)/admin/users/users-panel.tsx:435-440`
- Modify: `apps/web/src/app/(app)/admin/users/admin-user-card.tsx:118-123`
- Modify: `apps/web/src/app/(app)/admin/leads/leads-panel.tsx:338-343`
- Modify: `apps/web/src/app/(app)/admin/leads/admin-lead-card.tsx:73-78`

**Pattern geral:** trocar `render={<button ...>}` por `render={<Button ... />}`. Base-ui Trigger passa props via render prop; Button shadcn e wrapper de base-ui ButtonPrimitive, composicao funciona.

- [ ] **Step 1: Verificar import de Button em users-panel.tsx**

Run: `grep -n "from \"@dashboard-leads-profills/ui/components/button\"" apps/web/src/app/(app)/admin/users/users-panel.tsx`

Se NAO existir o import, adicionar no topo do arquivo junto com os outros imports de UI. Inserir na secao alfabetica de imports `@dashboard-leads-profills/ui/components/*`:

```tsx
import { Button } from "@dashboard-leads-profills/ui/components/button";
```

- [ ] **Step 2: Substituir raw button em users-panel.tsx:435**

Edit old:
```tsx
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<button
									aria-label="Abrir menu de acoes"
									className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg hover:bg-muted"
									type="button"
								/>
							}
						>
							<MoreVertical className="size-4" />
						</DropdownMenuTrigger>
```

Edit new:
```tsx
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									aria-label="Abrir menu de acoes"
									className="size-11"
									size="icon-lg"
									type="button"
									variant="ghost"
								/>
							}
						>
							<MoreVertical className="size-4" />
						</DropdownMenuTrigger>
```

- [ ] **Step 3: Repetir para admin-user-card.tsx:118**

Verificar import de Button (adicionar se faltar). Depois edit:

Edit old:
```tsx
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<button
									aria-label="Abrir menu de acoes"
									className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg hover:bg-muted"
									type="button"
								/>
							}
						>
							<MoreVertical className="size-4" />
						</DropdownMenuTrigger>
```

Edit new:
```tsx
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									aria-label="Abrir menu de acoes"
									className="size-11 shrink-0"
									size="icon-lg"
									type="button"
									variant="ghost"
								/>
							}
						>
							<MoreVertical className="size-4" />
						</DropdownMenuTrigger>
```

- [ ] **Step 4: Repetir para leads-panel.tsx:338**

Verificar import. Depois edit (note a indentacao extra — dentro de tabela aninhada):

Edit old:
```tsx
											<TableCell className="text-right">
												<DropdownMenu>
													<DropdownMenuTrigger
														render={
															<button
																aria-label="Abrir menu de acoes"
																className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg hover:bg-muted"
																type="button"
															/>
														}
													>
														<MoreVertical className="size-4" />
													</DropdownMenuTrigger>
```

Edit new:
```tsx
											<TableCell className="text-right">
												<DropdownMenu>
													<DropdownMenuTrigger
														render={
															<Button
																aria-label="Abrir menu de acoes"
																className="size-11"
																size="icon-lg"
																type="button"
																variant="ghost"
															/>
														}
													>
														<MoreVertical className="size-4" />
													</DropdownMenuTrigger>
```

- [ ] **Step 5: Repetir para admin-lead-card.tsx:73**

Verificar import. Edit:

Edit old:
```tsx
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<button
									aria-label="Abrir menu de acoes"
									className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg hover:bg-muted"
									type="button"
								/>
							}
						>
							<MoreVertical className="size-4" />
						</DropdownMenuTrigger>
```

Edit new:
```tsx
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									aria-label="Abrir menu de acoes"
									className="size-11 shrink-0"
									size="icon-lg"
									type="button"
									variant="ghost"
								/>
							}
						>
							<MoreVertical className="size-4" />
						</DropdownMenuTrigger>
```

- [ ] **Step 6: Verificar typecheck + grep**

Run: `bun run check-types`
Expected: sem erros

Run: `grep -rn "<button" apps/web/src/app/\(app\)/admin/`
Expected: sem matches (os 4 raw buttons foram eliminados)

- [ ] **Step 7: Teste manual**

Run: `bun run dev:web`
Navegar:
- http://localhost:3001/admin/leads — tabela desktop: abrir DropdownMenu de alguma linha, verificar itens "Editar lead" e "Excluir lead". Fechar.
- http://localhost:3001/admin/leads — mobile (devtools responsive mode): abrir card de lead, clicar no menu kebab, verificar que abre DropdownMenu com mesmas acoes.
- http://localhost:3001/admin/users — mesma coisa para tabela e card, acoes "Editar role", "Desativar usuario"/"Reativar usuario".

Verificar visualmente: botao tem tamanho similar ao antigo (44x44px), hover cinza ainda funciona.

Parar dev server.

- [ ] **Step 8: Commit parcial**

Nao commit ainda — Task 2 continua na Task 3/4/5 na mesma fase. Vai commitar no fim da Fase 2.

### Task 3: lead-list.tsx clear-search Button

**Files:**
- Modify: `apps/web/src/app/(app)/leads/lead-list.tsx:300-308`

- [ ] **Step 1: Verificar import de Button**

Run: `grep -n "from \"@dashboard-leads-profills/ui/components/button\"" apps/web/src/app/(app)/leads/lead-list.tsx`

Se ausente, adicionar:
```tsx
import { Button } from "@dashboard-leads-profills/ui/components/button";
```

- [ ] **Step 2: Substituir raw button**

Edit old:
```tsx
						{searchTerm !== "" && (
							<button
								aria-label="Limpar busca"
								className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
								onClick={() => setSearchTerm("")}
								type="button"
							>
								<X className="size-4" />
							</button>
						)}
```

Edit new:
```tsx
						{searchTerm !== "" && (
							<Button
								aria-label="Limpar busca"
								className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
								onClick={() => setSearchTerm("")}
								size="icon-sm"
								type="button"
								variant="ghost"
							>
								<X className="size-4" />
							</Button>
						)}
```

- [ ] **Step 3: Verificar**

Run: `bun run check-types`
Expected: sem erros

Run: `grep -n "<button" apps/web/src/app/\(app\)/leads/lead-list.tsx`
Expected: sem matches

- [ ] **Step 4: Teste manual**

Run: `bun run dev:web`
Navegar: http://localhost:3001/leads
- Digitar algo no campo de busca — X aparece
- Clicar no X — busca limpa, X some
- Visualmente: X no mesmo lugar e com mesmo tamanho visual

Parar dev server.

### Task 4: tag-selector.tsx → ToggleGroup

**Files:**
- Modify: `apps/web/src/components/tag-selector.tsx` (arquivo inteiro)

- [ ] **Step 1: Reescrever arquivo**

Edit old (conteudo completo do arquivo):
```tsx
"use client";

import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import InterestIcon, { type InterestTag, getTagConfig } from "./interest-icon";

interface TagSelectorProps {
	disabled?: boolean;
	onChange: (tag: InterestTag) => void;
	value: InterestTag;
}

const TAGS: InterestTag[] = ["quente", "morno", "frio"];

export default function TagSelector({
	value,
	onChange,
	disabled = false,
}: TagSelectorProps) {
	return (
		<div aria-label="Tag de interesse" className="flex gap-5" role="radiogroup">
			{TAGS.map((tag) => {
				const config = getTagConfig(tag);
				const isSelected = value === tag;

				return (
					// biome-ignore lint/a11y/useSemanticElements: custom toggle buttons per UI-SPEC require role="radio" for radiogroup pattern
					<button
						aria-checked={isSelected}
						className={cn(
							"flex flex-col items-center gap-1.5 outline-none transition-all focus-visible:ring-3 focus-visible:ring-ring/50 rounded-xl p-1 disabled:pointer-events-none disabled:opacity-50",
						)}
						disabled={disabled}
						key={tag}
						onClick={() => onChange(tag)}
						role="radio"
						type="button"
					>
						<InterestIcon
							selected={isSelected}
							size="lg"
							tag={tag}
						/>
						<span
							className={cn(
								"font-medium text-xs transition-colors",
								isSelected ? config.textClass : "text-muted-foreground",
							)}
						>
							{config.label}
						</span>
					</button>
				);
			})}
		</div>
	);
}
```

Edit new:
```tsx
"use client";

import {
	ToggleGroup,
	ToggleGroupItem,
} from "@dashboard-leads-profills/ui/components/toggle-group";
import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import InterestIcon, { type InterestTag, getTagConfig } from "./interest-icon";

interface TagSelectorProps {
	disabled?: boolean;
	onChange: (tag: InterestTag) => void;
	value: InterestTag;
}

const TAGS: InterestTag[] = ["quente", "morno", "frio"];

export default function TagSelector({
	value,
	onChange,
	disabled = false,
}: TagSelectorProps) {
	return (
		<ToggleGroup
			aria-label="Tag de interesse"
			className="gap-5"
			disabled={disabled}
			onValueChange={(val) => {
				if (val) {
					onChange(val as InterestTag);
				}
			}}
			spacing={20}
			type="single"
			value={value}
		>
			{TAGS.map((tag) => {
				const config = getTagConfig(tag);
				const isSelected = value === tag;

				return (
					<ToggleGroupItem
						className="flex h-auto min-w-0 flex-col items-center gap-1.5 rounded-xl p-1 data-[state=on]:bg-transparent hover:bg-transparent"
						key={tag}
						value={tag}
					>
						<InterestIcon selected={isSelected} size="lg" tag={tag} />
						<span
							className={cn(
								"font-medium text-xs transition-colors",
								isSelected ? config.textClass : "text-muted-foreground"
							)}
						>
							{config.label}
						</span>
					</ToggleGroupItem>
				);
			})}
		</ToggleGroup>
	);
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `bun run check-types`
Expected: sem erros

- [ ] **Step 3: Verificar biome-ignore removido**

Run: `grep -n "biome-ignore" apps/web/src/components/tag-selector.tsx`
Expected: sem matches

Run: `grep -n "<button" apps/web/src/components/tag-selector.tsx`
Expected: sem matches

- [ ] **Step 4: Teste manual**

Run: `bun run dev:web`
Navegar: http://localhost:3001/leads/new
- Form carrega com TagSelector mostrando 3 tags (quente, morno, frio)
- Uma tag esta selecionada (default: quente)
- Clicar em "Morno" — muda selecao, InterestIcon atualiza, label muda cor
- Clicar em "Frio" — mesmo
- Tab navigation funciona (focus visible ring)

Parar dev server.

### Task 5: tag-filter.tsx → ToggleGroup

**Files:**
- Modify: `apps/web/src/components/tag-filter.tsx` (arquivo inteiro)

- [ ] **Step 1: Reescrever arquivo**

Edit old (conteudo completo):
```tsx
"use client";

import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import InterestIcon, { type InterestTag } from "./interest-icon";
import type { FilterTag } from "@/lib/lead/queries";

interface TagFilterProps {
	onChange: (tag: FilterTag) => void;
	value: FilterTag;
}

const INTEREST_TAGS: InterestTag[] = ["quente", "morno", "frio"];

export default function TagFilter({ value, onChange }: TagFilterProps) {
	return (
		<div
			aria-label="Filtrar por interesse"
			className="flex items-center gap-2"
			role="radiogroup"
		>
			{/* biome-ignore lint/a11y/useSemanticElements: custom toggle buttons per UI-SPEC require role="radio" for radiogroup pattern */}
			<button
				aria-checked={value === "todos"}
				className={cn(
					"inline-flex min-h-[44px] select-none items-center justify-center rounded-md border border-transparent px-3 font-medium text-xs outline-none transition-all focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
					value === "todos"
						? "bg-primary text-primary-foreground"
						: "border-border bg-input hover:bg-input/80",
				)}
				onClick={() => onChange("todos")}
				role="radio"
				type="button"
			>
				Todos
			</button>
			{INTEREST_TAGS.map((tag) => {
				const isSelected = value === tag;

				return (
					// biome-ignore lint/a11y/useSemanticElements: custom toggle buttons per UI-SPEC require role="radio" for radiogroup pattern
					<button
						aria-checked={isSelected}
						className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full outline-none transition-all focus-visible:ring-3 focus-visible:ring-ring/50"
						key={tag}
						onClick={() => {
							if (isSelected) {
								onChange("todos");
							} else {
								onChange(tag);
							}
						}}
						role="radio"
						type="button"
					>
						<InterestIcon
							selected={isSelected}
							size="md"
							tag={tag}
						/>
					</button>
				);
			})}
		</div>
	);
}
```

Edit new:
```tsx
"use client";

import {
	ToggleGroup,
	ToggleGroupItem,
} from "@dashboard-leads-profills/ui/components/toggle-group";
import InterestIcon, { type InterestTag } from "./interest-icon";
import type { FilterTag } from "@/lib/lead/queries";

interface TagFilterProps {
	onChange: (tag: FilterTag) => void;
	value: FilterTag;
}

const INTEREST_TAGS: InterestTag[] = ["quente", "morno", "frio"];

export default function TagFilter({ value, onChange }: TagFilterProps) {
	return (
		<ToggleGroup
			aria-label="Filtrar por interesse"
			className="items-center gap-2"
			onValueChange={(val) => onChange((val as FilterTag) || "todos")}
			spacing={8}
			type="single"
			value={value}
		>
			<ToggleGroupItem
				className="min-h-11 rounded-md border border-transparent px-3 font-medium text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=off]:border-border data-[state=off]:bg-input data-[state=off]:hover:bg-input/80"
				value="todos"
			>
				Todos
			</ToggleGroupItem>
			{INTEREST_TAGS.map((tag) => (
				<ToggleGroupItem
					className="min-h-11 min-w-11 rounded-full data-[state=on]:bg-transparent hover:bg-transparent"
					key={tag}
					value={tag}
				>
					<InterestIcon selected={value === tag} size="md" tag={tag} />
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}
```

- [ ] **Step 2: Verificar**

Run: `bun run check-types`
Expected: sem erros

Run: `grep -n "<button\|biome-ignore" apps/web/src/components/tag-filter.tsx`
Expected: sem matches

- [ ] **Step 3: Teste manual**

Run: `bun run dev:web`
Navegar: http://localhost:3001/leads
- Lista carrega com TagFilter mostrando "Todos" + 3 icones
- "Todos" aparece ativo (bg-primary)
- Clicar em "Quente" — Todos desativa, Quente ativa, lista filtra
- Clicar em "Quente" novamente — volta pra "Todos" (desmarcar volta ao fallback)
- Clicar em "Frio" — filtra frio
- Clicar em "Todos" direto — volta

Parar dev server.

### Task 6: Verificacao final + commit Fase 2

- [ ] **Step 1: Grep global de raw buttons em apps/web**

Run: `grep -rn "<button" apps/web/src`
Expected: sem matches

Run: `grep -rn "biome-ignore lint/a11y/useSemanticElements" apps/web/src`
Expected: sem matches

- [ ] **Step 2: Lint e typecheck**

Run: `bun run check-types`
Expected: sem erros

Run: `bun run check`
Expected: sem erros (ou warnings nao relacionados)

- [ ] **Step 3: Build**

Run: `bun run build`
Expected: build passa

- [ ] **Step 4: Commit Fase 2**

```bash
git add apps/web/src/app/\(app\)/admin/users/users-panel.tsx \
	apps/web/src/app/\(app\)/admin/users/admin-user-card.tsx \
	apps/web/src/app/\(app\)/admin/leads/leads-panel.tsx \
	apps/web/src/app/\(app\)/admin/leads/admin-lead-card.tsx \
	apps/web/src/app/\(app\)/leads/lead-list.tsx \
	apps/web/src/components/tag-selector.tsx \
	apps/web/src/components/tag-filter.tsx

git commit -m "refactor(web): substituir raw <button> por Button e ToggleGroup shadcn"
```

---

## Phase 3: Cores hardcoded → tokens

### Task 7: Substituir cores status em sync-status-indicator.tsx

**Files:**
- Modify: `apps/web/src/components/sync-status-indicator.tsx:6-15`

- [ ] **Step 1: Substituir STATE_DOT_COLORS**

Edit old:
```tsx
const STATE_DOT_COLORS: Record<string, string> = {
	synced: "bg-emerald-500",
	syncing: "bg-primary animate-pulse",
	pending: "bg-amber-500",
	offline: "bg-destructive",
	error: "bg-amber-500",
	retrying: "bg-amber-500 animate-pulse",
	authExpired: "bg-destructive",
	stalled: "bg-destructive",
};
```

Edit new:
```tsx
const STATE_DOT_COLORS: Record<string, string> = {
	synced: "bg-success",
	syncing: "bg-primary animate-pulse",
	pending: "bg-warning",
	offline: "bg-destructive",
	error: "bg-warning",
	retrying: "bg-warning animate-pulse",
	authExpired: "bg-destructive",
	stalled: "bg-destructive",
};
```

### Task 8: Substituir cores em sync-status-icon.tsx

**Files:**
- Modify: `apps/web/src/components/sync-status-icon.tsx:111-120, 146`

- [ ] **Step 1: Substituir STATE_CONFIG**

Edit old:
```tsx
const STATE_CONFIG = {
	offline: { icon: WifiOff, className: "text-destructive" },
	authExpired: { icon: Lock, className: "text-destructive" },
	stalled: { icon: XCircle, className: "text-destructive" },
	retrying: { icon: RefreshCw, className: "text-amber-500 animate-spin" },
	syncing: { icon: RefreshCw, className: "text-primary animate-spin" },
	error: { icon: AlertTriangle, className: "text-amber-500" },
	pending: { icon: CloudUpload, className: "text-muted-foreground" },
	synced: { icon: CloudCheck, className: "text-primary" },
} as const satisfies Record<SyncState, { icon: LucideIcon; className: string }>;
```

Edit new:
```tsx
const STATE_CONFIG = {
	offline: { icon: WifiOff, className: "text-destructive" },
	authExpired: { icon: Lock, className: "text-destructive" },
	stalled: { icon: XCircle, className: "text-destructive" },
	retrying: { icon: RefreshCw, className: "text-warning animate-spin" },
	syncing: { icon: RefreshCw, className: "text-primary animate-spin" },
	error: { icon: AlertTriangle, className: "text-warning" },
	pending: { icon: CloudUpload, className: "text-muted-foreground" },
	synced: { icon: CloudCheck, className: "text-primary" },
} as const satisfies Record<SyncState, { icon: LucideIcon; className: string }>;
```

- [ ] **Step 2: Substituir badge pendente**

Edit old (linha 146):
```tsx
							<span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-0.5 font-semibold text-[10px] text-white tabular-nums">
```

Edit new:
```tsx
							<span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-0.5 font-semibold text-[10px] text-warning-foreground tabular-nums">
```

Nota: `text-[10px]` sera normalizado na Fase 4.

### Task 9: Substituir cores em global-header.tsx

**Files:**
- Modify: `apps/web/src/components/global-header.tsx:93, 138, 204, 220`

- [ ] **Step 1: text-emerald-400 → text-success (linha 93)**

Edit old:
```tsx
				<span className="font-semibold text-[15px] text-emerald-400">
```

Edit new:
```tsx
				<span className="font-semibold text-[15px] text-success">
```

- [ ] **Step 2: text-indigo-400 → text-rank-accent (linha 138)**

Edit old:
```tsx
						<p className="text-[10px] text-indigo-400">#{rank ?? "\u2014"}</p>
```

Edit new:
```tsx
						<p className="text-[10px] text-rank-accent">#{rank ?? "\u2014"}</p>
```

- [ ] **Step 3: bg-amber-500 → bg-warning (linha 204)**

Edit old:
```tsx
						<span className="size-[5px] shrink-0 animate-pulse rounded-full bg-amber-500" />
```

Edit new:
```tsx
						<span className="size-[5px] shrink-0 animate-pulse rounded-full bg-warning" />
```

- [ ] **Step 4: bg-amber-500 → bg-warning (linha 220)**

Edit old:
```tsx
					<span className="size-1 shrink-0 rounded-full bg-amber-500" />
```

Edit new:
```tsx
					<span className="size-1 shrink-0 rounded-full bg-warning" />
```

### Task 10: Substituir cor em event-countdown.tsx

**Files:**
- Modify: `apps/web/src/components/event-countdown.tsx:64`

- [ ] **Step 1: text-amber-500 → text-warning**

Edit old:
```tsx
		<span className="font-medium font-mono text-[13px] text-amber-500">
```

Edit new:
```tsx
		<span className="font-medium font-mono text-[13px] text-warning">
```

### Task 11: Substituir cores em podium.tsx

**Files:**
- Modify: `apps/web/src/components/podium.tsx:45, 98`

- [ ] **Step 1: shadow inline → shadow-glow-primary**

Edit old:
```tsx
	1: {
		avatarSize: "size-12",
		avatarText: "text-base",
		border: "border-2 border-primary shadow-[0_0_16px_rgba(62,207,142,0.25)]",
```

Edit new:
```tsx
	1: {
		avatarSize: "size-12",
		avatarText: "text-base",
		border: "border-2 border-primary shadow-glow-primary",
```

- [ ] **Step 2: fill-yellow-500 text-yellow-500 → fill-gold text-gold**

Edit old:
```tsx
				<Star
					className="mb-1 size-5 animate-pulse fill-yellow-500 text-yellow-500"
				/>
```

Edit new:
```tsx
				<Star
					className="mb-1 size-5 animate-pulse fill-gold text-gold"
				/>
```

### Task 12: Verificacao + commit Fase 3

- [ ] **Step 1: Grep de cores nao-sistema**

Run: `grep -rnE "(bg|text|fill|border)-(amber|emerald|indigo|yellow|sky|violet|purple|pink|rose|lime|teal|cyan)-[0-9]+" apps/web/src`
Expected: sem matches

Run: `grep -rn "text-white" apps/web/src`
Expected: sem matches (o unico uso em sync-status-icon foi substituido)

Run: `grep -rn "shadow-\[" apps/web/src`
Expected: sem matches

- [ ] **Step 2: Typecheck**

Run: `bun run check-types`
Expected: sem erros

- [ ] **Step 3: Teste manual — visual comparison**

Run: `bun run dev:web`
Navegar e verificar que as cores renderizam corretamente (similares as originais):

- http://localhost:3001/dashboard — podium: Star amarela, 1o lugar com glow verde sutil
- http://localhost:3001/dashboard — header stats: "hoje" em verde (`text-success`)
- http://localhost:3001/dashboard (desktop) — live dot amber pulsando no countdown
- http://localhost:3001/leads — sync indicator: dot verde quando synced, amber quando pending
- http://localhost:3001/admin — sync icon no header: amber quando retrying/error, badge de count

Toggle dark/light mode (botao do user menu). Verificar que tokens mudam corretamente.

Parar dev server.

- [ ] **Step 4: Commit Fase 3**

```bash
git add apps/web/src/components/sync-status-indicator.tsx \
	apps/web/src/components/sync-status-icon.tsx \
	apps/web/src/components/global-header.tsx \
	apps/web/src/components/event-countdown.tsx \
	apps/web/src/components/podium.tsx

git commit -m "refactor(web): mapear cores hardcoded para tokens semanticos"
```

---

## Phase 4: Typography arbitraria → escala padrao

### Task 13: Normalizar typography em global-header.tsx

**Files:**
- Modify: `apps/web/src/components/global-header.tsx`

- [ ] **Step 1: Listar ocorrencias**

Run: `grep -n "text-\[\|tracking-\[\|size-\[5px\]" apps/web/src/components/global-header.tsx`

Expected matches: linhas ~87, 90, 93, 96, 138, 143, 191, 204

- [ ] **Step 2: Substituicoes pontuais**

Usar Edit para cada ocorrencia:

**Linha 87:** `font-semibold text-[15px] text-foreground` → `font-semibold text-base text-foreground`

**Linha 90:** `text-[10px] text-muted-foreground` → `text-xs text-muted-foreground`

**Linha 93:** `font-semibold text-[15px] text-success` → `font-semibold text-base text-success`

**Linha 96:** `text-[10px] text-muted-foreground` → `text-xs text-muted-foreground`

**Linha 138:** `text-[10px] text-rank-accent` → `text-xs text-rank-accent`

**Linha 143:** `AvatarFallback className="text-[11px]"` → `AvatarFallback className="text-xs"`

**Linha 191:** `header className="hidden h-[52px] shrink-0 ...` — `h-[52px]` e dimensao de layout, **manter**.

**Linha 204:** `size-[5px] shrink-0 animate-pulse rounded-full bg-warning` → `size-1.5 shrink-0 animate-pulse rounded-full bg-warning`

### Task 14: Normalizar typography em podium.tsx

**Files:**
- Modify: `apps/web/src/components/podium.tsx`

- [ ] **Step 1: Substituicoes**

**Linha 51:** `"text-primary text-[11px] font-medium"` → `"text-primary text-xs font-medium"`

**Linha 62:** `"text-muted-foreground text-[10px]"` → `"text-muted-foreground text-xs"`

**Linha 73:** `"text-muted-foreground text-[10px]"` → `"text-muted-foreground text-xs"`

**Linha 112:** `cn("text-[11px]", config.nameColor)` → `cn("text-xs", config.nameColor)`

**Linha 148:** `font-mono text-[10px] uppercase tracking-[2px] text-muted-foreground` → `font-mono text-xs uppercase tracking-widest text-muted-foreground`

**Linhas 90, 46, 52:** dimensoes layout `w-[110px]`, `w-[96px]`, `h-[88px]` — **manter**.

### Task 15: Normalizar typography em bottom-nav.tsx

**Files:**
- Modify: `apps/web/src/components/bottom-nav.tsx:40, 76`

- [ ] **Step 1: Substituicoes**

**Linha 40:** `"text-[10px]"` → `"text-xs"`

**Linha 76:** `"text-[10px]"` → `"text-xs"`

**Linha 56:** `border-[3px] border-card bg-primary` — **manter** (spec FAB legitimo).

### Task 16: Normalizar typography em stat-card.tsx

**Files:**
- Modify: `apps/web/src/components/stat-card.tsx:20`

- [ ] **Step 1: Substituicao**

Edit old:
```tsx
				<span className="font-semibold text-[28px] text-foreground leading-[1.2]">
```

Edit new:
```tsx
				<span className="font-semibold text-3xl text-foreground leading-[1.2]">
```

Nota: `text-3xl` = 30px (delta +2px). `leading-[1.2]` — **manter** (line-height preciso do stat card, dentro do permitido como valor de layout).

### Task 17: Normalizar typography em ranking-list.tsx

**Files:**
- Modify: `apps/web/src/components/ranking-list.tsx`

- [ ] **Step 1: Substituicoes**

**Linha 75:** `AvatarFallback className="text-[9px]"` → `AvatarFallback className="text-xs"`

**Linha 81:** `"flex-1 text-[13px]"` → `"flex-1 text-sm"`

**Linha 89:** `"text-[13px]"` → `"text-sm"`

**Linha 96:** `ml-[52px]` — dimensao layout, **manter**.

### Task 18: Normalizar typography em admin-user-card.tsx

**Files:**
- Modify: `apps/web/src/app/(app)/admin/users/admin-user-card.tsx:105`

- [ ] **Step 1: Substituicao**

Edit old:
```tsx
						<span className="truncate text-[13px] text-muted-foreground">
```

Edit new:
```tsx
						<span className="truncate text-sm text-muted-foreground">
```

### Task 19: Normalizar typography em event-countdown.tsx

**Files:**
- Modify: `apps/web/src/components/event-countdown.tsx:64`

- [ ] **Step 1: Substituicao**

Edit old:
```tsx
		<span className="font-medium font-mono text-[13px] text-warning">
```

Edit new:
```tsx
		<span className="font-medium font-mono text-sm text-warning">
```

### Task 20: Normalizar typography em sync-status-indicator.tsx

**Files:**
- Modify: `apps/web/src/components/sync-status-indicator.tsx:25-26`

- [ ] **Step 1: Substituicoes**

Edit old:
```tsx
			<span className={`size-[5px] shrink-0 rounded-full ${dotColor}`} />
			<span className="text-[10px] text-muted-foreground">{label}</span>
```

Edit new:
```tsx
			<span className={`size-1.5 shrink-0 rounded-full ${dotColor}`} />
			<span className="text-xs text-muted-foreground">{label}</span>
```

### Task 21: Normalizar badge em sync-status-icon.tsx

**Files:**
- Modify: `apps/web/src/components/sync-status-icon.tsx:146`

- [ ] **Step 1: Substituicao do text-[10px] do badge**

Edit old:
```tsx
							<span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-0.5 font-semibold text-[10px] text-warning-foreground tabular-nums">
```

Edit new:
```tsx
							<span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-0.5 font-semibold text-xs text-warning-foreground tabular-nums">
```

### Task 22: Verificacao final + commit Fase 4

- [ ] **Step 1: Grep de typography arbitraria residual**

Run: `grep -rn "text-\[[0-9]\+px\]" apps/web/src`
Expected: sem matches

Run: `grep -rn "tracking-\[" apps/web/src`
Expected: sem matches

Run: `grep -rn "size-\[5px\]" apps/web/src`
Expected: sem matches

Run: `grep -rn "min-h-\[44px\]\|min-w-\[44px\]" apps/web/src`
Expected: sem matches (usamos `size-11` / `min-h-11 min-w-11` agora)

- [ ] **Step 2: Typecheck, lint, build**

Run: `bun run check-types`
Expected: sem erros

Run: `bun run check`
Expected: sem erros

Run: `bun run build`
Expected: build passa

- [ ] **Step 3: Teste manual end-to-end**

Run: `bun run dev:web`

Percurso completo (desktop + mobile devtools):

1. http://localhost:3001/login — LoginCard renderiza, tamanho ok
2. http://localhost:3001/dashboard — Podium animado, glow verde no 1o, Star dourada; header stats em tamanho `text-base`; rank number `text-xs`; live dot amber pulsando
3. http://localhost:3001/leads — Busca funciona, clear X funciona, TagFilter ToggleGroup filtra, cards renderizam, `text-sm` em labels
4. http://localhost:3001/leads/new — Form, TagSelector ToggleGroup troca tag, salva
5. http://localhost:3001/leads/[algumId] — Detail + TagSelector edit
6. http://localhost:3001/admin/leads — Tabela desktop: DropdownMenu Button funciona, abre menu, executa acoes; mobile: cards com DropdownMenu Button funcionam
7. http://localhost:3001/admin/users — Tabela + cards, DropdownMenu Button, StatusBadge / RoleBadge renderizam
8. http://localhost:3001/admin/stats — panel/charts/filters OK

Dark/light toggle: verificar que tokens mudam e cores de status, success, rank-accent, gold ficam calibradas em ambos os modos.

Parar dev server.

- [ ] **Step 4: Commit Fase 4**

```bash
git add apps/web/src/components/global-header.tsx \
	apps/web/src/components/podium.tsx \
	apps/web/src/components/bottom-nav.tsx \
	apps/web/src/components/stat-card.tsx \
	apps/web/src/components/ranking-list.tsx \
	apps/web/src/components/event-countdown.tsx \
	apps/web/src/components/sync-status-indicator.tsx \
	apps/web/src/components/sync-status-icon.tsx \
	apps/web/src/app/\(app\)/admin/users/admin-user-card.tsx

git commit -m "refactor(web): normalizar typography arbitraria para escala padrao"
```

---

## Verificacao end-to-end final (apos todos os commits)

- [ ] **Step 1: Grep consolidado**

Run todos em sequencia:

```bash
# V1: raw buttons
grep -rn "<button" apps/web/src
# Expected: sem matches

# V1: biome-ignore relacionado
grep -rn "biome-ignore lint/a11y/useSemanticElements" apps/web/src
# Expected: sem matches

# V3: cores nao-sistema
grep -rnE "(bg|text|fill|border)-(amber|emerald|indigo|yellow|sky|violet|purple|pink|rose|lime|teal|cyan|gray|slate|zinc|neutral|stone)-[0-9]+" apps/web/src
# Expected: sem matches

grep -rn "text-white\b" apps/web/src
# Expected: sem matches

grep -rn "shadow-\[" apps/web/src
# Expected: sem matches

# V4: typography arbitraria
grep -rnE "text-\[[0-9]+px\]" apps/web/src
# Expected: sem matches

grep -rn "tracking-\[" apps/web/src
# Expected: sem matches

grep -rn "min-h-\[44px\]\|min-w-\[44px\]" apps/web/src
# Expected: sem matches
```

- [ ] **Step 2: CI local**

```bash
bun run check-types
bun run check
bun run test
bun run build
```

Todos passam.

- [ ] **Step 3: Git log limpo**

```bash
git log --oneline main..HEAD
```

Expected: 4 commits em ordem:
1. `feat(ui): adicionar tokens semanticos warning/success/gold/rank-accent`
2. `refactor(web): substituir raw <button> por Button e ToggleGroup shadcn`
3. `refactor(web): mapear cores hardcoded para tokens semanticos`
4. `refactor(web): normalizar typography arbitraria para escala padrao`

- [ ] **Step 4: Review visual final**

Comparar visualmente (screenshots antes/depois se possivel) as 9 rotas principais. Aceitar:
- Delta de ~1-2px em alguns labels (10px→12px, 13px→14px, 15px→16px)
- Delta de 2px em stat-card (28px→30px)
- Cores amber/emerald podem ter shift minimo em dark mode devido ao ajuste de tokens

Rejeitar:
- Quebras de layout
- Cores visivelmente erradas
- Comportamento de interacao quebrado (DropdownMenu, ToggleGroup, Button click)

---

## Progresso

- [ ] Task 1 — Fase 1 tokens
- [ ] Task 2 — 4x DropdownMenuTrigger Button
- [ ] Task 3 — lead-list clear-search Button
- [ ] Task 4 — tag-selector ToggleGroup
- [ ] Task 5 — tag-filter ToggleGroup
- [ ] Task 6 — Verificacao + commit Fase 2
- [ ] Task 7 — sync-status-indicator cores
- [ ] Task 8 — sync-status-icon cores
- [ ] Task 9 — global-header cores
- [ ] Task 10 — event-countdown cor
- [ ] Task 11 — podium cores + shadow
- [ ] Task 12 — Verificacao + commit Fase 3
- [ ] Task 13 — global-header typography
- [ ] Task 14 — podium typography
- [ ] Task 15 — bottom-nav typography
- [ ] Task 16 — stat-card typography
- [ ] Task 17 — ranking-list typography
- [ ] Task 18 — admin-user-card typography
- [ ] Task 19 — event-countdown typography
- [ ] Task 20 — sync-status-indicator typography
- [ ] Task 21 — sync-status-icon badge typography
- [ ] Task 22 — Verificacao final + commit Fase 4
- [ ] Verificacao end-to-end final
