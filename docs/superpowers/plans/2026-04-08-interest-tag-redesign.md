# Redesign Grau de Interesse — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o seletor de grau de interesse (botões retangulares + termômetros) por ícones redondos intuitivos (Flame/Sun/Snowflake), atualizar cards e filtros, e converter a lista de leads para grid 3 colunas.

**Architecture:** Criar um componente `InterestIcon` centralizado que mapeia tag → ícone + cor + tamanho, eliminando a duplicação de `TAG_CONFIG` em 5 locais. Todos os consumidores (`TagSelector`, `TagFilter`, `LeadCard`, `AdminLeadCard`, `leads-panel.tsx`) passam a usar `InterestIcon`. O layout da lista muda de `flex-col` para CSS grid responsivo.

**Tech Stack:** React 19, Lucide React (Flame, Sun, Snowflake), Tailwind CSS 4, tokens CSS existentes (`tag-quente-*`, `tag-morno-*`, `tag-frio-*`)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `apps/web/src/components/interest-icon.tsx` | Componente centralizado: tag → ícone redondo com cor e tamanho |
| Modify | `apps/web/src/components/tag-selector.tsx` | Seletor circular com `InterestIcon` size="lg" |
| Modify | `apps/web/src/components/tag-filter.tsx` | "Todos" + 3 `InterestIcon` size="md" |
| Modify | `apps/web/src/components/lead-card.tsx` | Badge texto → `InterestIcon` size="sm" |
| Modify | `apps/web/src/app/(app)/admin/leads/admin-lead-card.tsx` | Badge texto → `InterestIcon` size="sm" |
| Modify | `apps/web/src/app/(app)/leads/lead-list.tsx` | `flex-col` → `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` |
| Modify | `apps/web/src/app/(app)/admin/leads/leads-panel.tsx` | Mobile cards: `flex-col` → grid; Table: `Badge` → `InterestIcon` |

---

### Task 1: Criar componente InterestIcon

**Files:**
- Create: `apps/web/src/components/interest-icon.tsx`

- [ ] **Step 1: Criar `interest-icon.tsx`**

```tsx
import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import { Flame, Snowflake, Sun } from "lucide-react";

type InterestTag = "quente" | "morno" | "frio";

const TAG_CONFIG = {
	quente: {
		icon: Flame,
		label: "Quente",
		activeClasses: "border-tag-quente-text bg-tag-quente-bg text-tag-quente-text",
		inactiveClasses: "border-border bg-background text-muted-foreground",
	},
	morno: {
		icon: Sun,
		label: "Morno",
		activeClasses: "border-tag-morno-text bg-tag-morno-bg text-tag-morno-text",
		inactiveClasses: "border-border bg-background text-muted-foreground",
	},
	frio: {
		icon: Snowflake,
		label: "Frio",
		activeClasses: "border-tag-frio-text bg-tag-frio-bg text-tag-frio-text",
		inactiveClasses: "border-border bg-background text-muted-foreground",
	},
} as const;

const SIZE_CONFIG = {
	sm: { circle: "size-7", icon: "size-3.5", border: "border" },
	md: { circle: "size-8", icon: "size-4", border: "border-[1.5px]" },
	lg: { circle: "size-13", icon: "size-6", border: "border-2" },
} as const;

interface InterestIconProps {
	tag: InterestTag;
	size?: "sm" | "md" | "lg";
	selected?: boolean;
	className?: string;
}

export type { InterestTag };

export function getTagConfig(tag: InterestTag) {
	return TAG_CONFIG[tag];
}

export default function InterestIcon({
	tag,
	size = "sm",
	selected = true,
	className,
}: InterestIconProps) {
	const config = TAG_CONFIG[tag];
	const sizeConfig = SIZE_CONFIG[size];
	const Icon = config.icon;

	return (
		<span
			aria-label={config.label}
			className={cn(
				"inline-flex shrink-0 items-center justify-center rounded-full",
				sizeConfig.circle,
				sizeConfig.border,
				selected ? config.activeClasses : config.inactiveClasses,
				className,
			)}
		>
			<Icon className={sizeConfig.icon} />
		</span>
	);
}
```

- [ ] **Step 2: Verificar types**

Run: `bun run check-types`
Expected: PASS — sem erros novos

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/interest-icon.tsx
git commit -m "feat(ui): criar componente InterestIcon centralizado"
```

---

### Task 2: Atualizar TagSelector — círculos redondos

**Files:**
- Modify: `apps/web/src/components/tag-selector.tsx`

- [ ] **Step 1: Reescrever `tag-selector.tsx`**

Substituir o conteúdo completo por:

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

const TAG_TEXT_COLOR: Record<InterestTag, string> = {
	quente: "text-tag-quente-text",
	morno: "text-tag-morno-text",
	frio: "text-tag-frio-text",
};

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
								isSelected ? TAG_TEXT_COLOR[tag] : "text-muted-foreground",
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

**Nota:** Usa-se `TAG_TEXT_COLOR` com classes estáticas em vez de interpolação dinâmica (`"text-tag-" + tag + "-text"`) porque o Tailwind CSS precisa encontrar as classes completas no source para inclui-las no build.

- [ ] **Step 2: Verificar types**

Run: `bun run check-types`
Expected: PASS

- [ ] **Step 3: Verificar visualmente**

Run: `bun run dev:web`
Abrir: http://localhost:3001/leads/new
Expected: 3 círculos redondos (Flame, Sun, Snowflake). Clicar alterna a seleção com cor.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/tag-selector.tsx
git commit -m "feat(ui): atualizar TagSelector para icones redondos"
```

---

### Task 3: Atualizar TagFilter — ícones redondos + "Todos"

**Files:**
- Modify: `apps/web/src/components/tag-filter.tsx`

- [ ] **Step 1: Reescrever `tag-filter.tsx`**

Substituir o conteúdo completo por:

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
						className="outline-none transition-all focus-visible:ring-3 focus-visible:ring-ring/50 rounded-full"
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

- [ ] **Step 2: Verificar types**

Run: `bun run check-types`
Expected: PASS

- [ ] **Step 3: Verificar visualmente**

Run: `bun run dev:web`
Abrir: http://localhost:3001/leads
Expected: Botão "Todos" + 3 ícones redondos. Clicar filtra os leads. Clicar no ativo volta a "Todos".

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/tag-filter.tsx
git commit -m "feat(ui): atualizar TagFilter para icones redondos"
```

---

### Task 4: Atualizar LeadCard — ícone redondo no badge

**Files:**
- Modify: `apps/web/src/components/lead-card.tsx`

- [ ] **Step 1: Reescrever `lead-card.tsx`**

Substituir o conteúdo completo por:

```tsx
"use client";

import { buttonVariants } from "@dashboard-leads-profills/ui/components/button";
import { Card } from "@dashboard-leads-profills/ui/components/card";
import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import { MessageCircle } from "lucide-react";
import type { Lead } from "@/lib/db/types";
import { relativeTime } from "@/lib/lead/relative-time";
import { formatPhone, unmaskPhone } from "@/lib/masks/phone";
import InterestIcon from "./interest-icon";

interface LeadCardProps {
	lead: Lead;
	onClick: () => void;
}

export default function LeadCard({ lead, onClick }: LeadCardProps) {
	const contact = lead.phone ? formatPhone(lead.phone) : lead.email;

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			onClick();
		}
	}

	return (
		<Card
			className={cn("cursor-pointer p-4 transition-colors hover:bg-muted")}
			onClick={onClick}
			onKeyDown={handleKeyDown}
			role="button"
			tabIndex={0}
		>
			<div className="flex items-center justify-between">
				<div className="flex min-w-0 flex-col gap-1">
					<span className="truncate font-medium text-sm">{lead.name}</span>
					{contact ? (
						<span className="flex items-center gap-1 text-muted-foreground text-sm">
							<span className="truncate">{contact}</span>
							{lead.phone ? (
								<a
									aria-label="Abrir conversa no WhatsApp"
									className={cn(
										buttonVariants({ variant: "ghost", size: "icon-sm" })
									)}
									href={`https://wa.me/55${unmaskPhone(lead.phone)}`}
									onClick={(e) => e.stopPropagation()}
									rel="noopener noreferrer"
									target="_blank"
								>
									<MessageCircle className="size-4" />
								</a>
							) : null}
						</span>
					) : null}
				</div>
				<div className="flex flex-col items-end gap-1">
					<InterestIcon size="sm" tag={lead.interestTag} />
					<span className="text-muted-foreground text-xs">
						{relativeTime(lead.createdAt)}
					</span>
				</div>
			</div>
		</Card>
	);
}
```

Mudanças: removido `TAG_CONFIG` local, importado `InterestIcon`, substituído o `<span>` do badge por `<InterestIcon size="sm" tag={lead.interestTag} />`.

- [ ] **Step 2: Verificar types**

Run: `bun run check-types`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/lead-card.tsx
git commit -m "feat(ui): LeadCard usa InterestIcon no badge"
```

---

### Task 5: Atualizar AdminLeadCard — ícone redondo no badge

**Files:**
- Modify: `apps/web/src/app/(app)/admin/leads/admin-lead-card.tsx`

- [ ] **Step 1: Reescrever `admin-lead-card.tsx`**

Substituir o conteúdo completo por:

```tsx
"use client";

import { buttonVariants } from "@dashboard-leads-profills/ui/components/button";
import { Card } from "@dashboard-leads-profills/ui/components/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@dashboard-leads-profills/ui/components/dropdown-menu";
import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import { MessageCircle, MoreVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { formatPhone, unmaskPhone } from "@/lib/masks/phone";
import InterestIcon from "@/components/interest-icon";

interface AdminLeadCardProps {
	lead: {
		localId: string;
		name: string;
		phone: string | null;
		email: string | null;
		interestTag: string;
		segment: string | null;
		createdAt: string | Date;
	};
	onDelete: (localId: string) => void;
	vendorName: string;
}

export function AdminLeadCard({
	lead,
	vendorName,
	onDelete,
}: AdminLeadCardProps) {
	return (
		<Card className="p-3.5">
			<div className="flex items-start justify-between gap-2">
				<div className="flex min-w-0 flex-col gap-1">
					<div className="flex items-center gap-2">
						<span className="truncate font-medium text-[13px]">{lead.name}</span>
						<InterestIcon
							size="sm"
							tag={lead.interestTag as "quente" | "morno" | "frio"}
						/>
					</div>
					<span className="text-muted-foreground text-sm">
						Vendedor: {vendorName}
					</span>
					<span className="flex items-center gap-1 text-muted-foreground text-sm">
						<span className="truncate">
							{lead.phone ? formatPhone(lead.phone) : (lead.email ?? "-")}
						</span>
						{lead.phone ? (
							<a
								aria-label="Abrir conversa no WhatsApp"
								className={cn(
									buttonVariants({ variant: "ghost", size: "icon-sm" })
								)}
								href={`https://wa.me/55${unmaskPhone(lead.phone)}`}
								rel="noopener noreferrer"
								target="_blank"
							>
								<MessageCircle className="size-4" />
							</a>
						) : null}
					</span>
				</div>
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
					<DropdownMenuContent align="end">
						<DropdownMenuItem
							render={
								<Link href={`/admin/leads/${lead.localId}` as unknown as "/"} />
							}
						>
							<Pencil className="size-4" />
							Editar lead
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={() => onDelete(lead.localId)}
							variant="destructive"
						>
							<Trash2 className="size-4" />
							Excluir lead
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</Card>
	);
}
```

Mudanças: removido `TAG_CONFIG` local, importado `InterestIcon` de `@/components/interest-icon`, substituído o `<span>` do badge por `<InterestIcon>`. O type cast `as "quente" | "morno" | "frio"` é necessário porque a prop `interestTag` na interface é `string`.

- [ ] **Step 2: Verificar types**

Run: `bun run check-types`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(app)/admin/leads/admin-lead-card.tsx
git commit -m "feat(ui): AdminLeadCard usa InterestIcon no badge"
```

---

### Task 6: Converter lista de leads para grid responsivo

**Files:**
- Modify: `apps/web/src/app/(app)/leads/lead-list.tsx`

- [ ] **Step 1: Alterar o container de `LeadResults`**

No arquivo `apps/web/src/app/(app)/leads/lead-list.tsx`, linha 91, substituir:

```tsx
<ul className="flex list-none flex-col gap-4">
```

por:

```tsx
<ul className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
```

- [ ] **Step 2: Atualizar o skeleton de loading**

No mesmo arquivo, no `renderContent()` (linha ~228), substituir:

```tsx
<div aria-busy="true" className="flex flex-col gap-4">
	<Skeleton className="h-[72px] w-full rounded-lg" />
	<Skeleton className="h-[72px] w-full rounded-lg" />
	<Skeleton className="h-[72px] w-full rounded-lg" />
</div>
```

por:

```tsx
<div aria-busy="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
	<Skeleton className="h-[72px] w-full rounded-lg" />
	<Skeleton className="h-[72px] w-full rounded-lg" />
	<Skeleton className="h-[72px] w-full rounded-lg" />
	<Skeleton className="h-[72px] w-full rounded-lg sm:block hidden" />
	<Skeleton className="h-[72px] w-full rounded-lg sm:block hidden" />
	<Skeleton className="h-[72px] w-full rounded-lg lg:block hidden" />
</div>
```

- [ ] **Step 3: Verificar types**

Run: `bun run check-types`
Expected: PASS

- [ ] **Step 4: Verificar visualmente**

Run: `bun run dev:web`
Abrir: http://localhost:3001/leads
Expected:
- Mobile (<640px): 1 coluna
- Tablet (640-1023px): 2 colunas
- Desktop (≥1024px): 3 colunas
- Leads ordenados do mais novo para o mais antigo (sem mudança de lógica)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(app)/leads/lead-list.tsx
git commit -m "feat(ui): converter lista de leads para grid responsivo 3 colunas"
```

---

### Task 7: Atualizar admin leads-panel — mobile grid + table icon

**Files:**
- Modify: `apps/web/src/app/(app)/admin/leads/leads-panel.tsx`

- [ ] **Step 1: Substituir Badge por InterestIcon na table**

Adicionar import no topo do arquivo:

```tsx
import InterestIcon from "@/components/interest-icon";
```

Remover as constantes `TAG_COLORS` e `TAG_LABELS` (linhas 76-86):

```tsx
// REMOVER estas linhas:
const TAG_COLORS: Record<string, string> = { ... };
const TAG_LABELS: Record<string, string> = { ... };
```

Remover o import de `Badge` (linha 13):

```tsx
// REMOVER do import:
import { Badge } from "@dashboard-leads-profills/ui/components/badge";
```

Na table (linha ~338-348), substituir:

```tsx
<TableCell>
	<Badge
		className="text-white"
		style={{
			backgroundColor:
				TAG_COLORS[lead.interestTag] ?? TAG_COLORS.morno,
		}}
	>
		{TAG_LABELS[lead.interestTag] ?? lead.interestTag}
	</Badge>
</TableCell>
```

por:

```tsx
<TableCell>
	<InterestIcon
		size="sm"
		tag={lead.interestTag as "quente" | "morno" | "frio"}
	/>
</TableCell>
```

- [ ] **Step 2: Converter mobile cards para grid**

Na mesma file (linha ~287), substituir:

```tsx
<div className="flex flex-col gap-4 md:hidden">
```

por:

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:hidden">
```

- [ ] **Step 3: Verificar types**

Run: `bun run check-types`
Expected: PASS

- [ ] **Step 4: Verificar lint**

Run: `bun run check`
Expected: PASS (sem imports não usados de Badge, TAG_COLORS, TAG_LABELS)

- [ ] **Step 5: Verificar visualmente**

Run: `bun run dev:web`
Abrir: http://localhost:3001/admin/leads
Expected:
- Selecionar vendedor → tabela desktop mostra ícone redondo na coluna "Tag"
- Viewport mobile → cards com ícone redondo, grid 1-2 colunas

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/(app)/admin/leads/leads-panel.tsx
git commit -m "feat(ui): admin leads usa InterestIcon na table e grid mobile"
```

---

### Task 8: Verificação final

- [ ] **Step 1: Check types do monorepo**

Run: `bun run check-types`
Expected: PASS

- [ ] **Step 2: Lint do monorepo**

Run: `bun run check`
Expected: PASS

- [ ] **Step 3: Testes**

Run: `bun run test`
Expected: PASS (nenhum teste foi quebrado — as mudanças são puramente visuais)

- [ ] **Step 4: Verificação visual completa**

Run: `bun run dev:web`

Checklist visual:
- [ ] `/leads/new` — seletor com 3 círculos (Flame verde, Sun amarelo, Snowflake azul)
- [ ] `/leads/new` — clicar alterna seleção com cor + label colorido
- [ ] `/leads/new` — submeter lead salva `interestTag` correto no Dexie
- [ ] `/leads` — grid 3 colunas desktop, 2 tablet, 1 mobile
- [ ] `/leads` — cards mostram ícone redondo pequeno (28px) no canto direito
- [ ] `/leads` — filtro mostra "Todos" + 3 ícones redondos, filtragem funcional
- [ ] `/leads` — leads ordenados do mais novo para o mais antigo
- [ ] `/leads/{id}` — edição de lead mostra seletor circular com valor pre-selecionado
- [ ] `/admin/leads` — table desktop mostra ícone na coluna Tag
- [ ] `/admin/leads` — mobile cards com ícone redondo e grid responsivo
