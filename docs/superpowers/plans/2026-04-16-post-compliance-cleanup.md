# Post-compliance Cleanup Implementation Plan

> **Para Codex executar:** feature branch `post-compliance-cleanup` no worktree principal `/home/othavio/Work/profills/sistema-coleta-de-lead`. Sem worktree isolado. 6 fases sequenciais, um commit por fase. Validacao via `bun run check-types` + `bun run test` + `bun run check`.

**Goal:** Limpar backlog pos-refactor shadcn compliance — tokens novos documentados no DESIGN.md, dimensoes hardcoded viradas em tokens onde faz sentido, migracao Tailwind v4 syntax completa, fixture helpers pra testes, 2 smells (bottom-nav, tsconfig) + colocation route-specific.

**Architecture:** 6 fases independentes mas ordenadas. Fase 1-2 saneam tooling (typecheck/tests passam limpos). Fase 3 documenta antes de Fase 5 consumir. Fase 4 (Tailwind v4) antes de Fase 5 porque pode simplificar syntax de dimensoes. Fase 6 por ultimo (toca imports, maior superficie de conflito).

**Tech stack:** Next.js 16, React 19, Tailwind CSS 4, shadcn/ui em `packages/ui`, base-ui (`@base-ui/react`), Vitest, Biome/Ultracite, Turborepo + Bun, TypeScript 6.

**Contexto anterior:** O refactor shadcn compliance ja foi merged em main via commit `c7eba38`. 7 commits do branch `eager-neumann` estao na historia. Tests 209/209 passam. Este plano e o follow-up.

---

## Prerequisites

```bash
# A partir do main worktree (nao eager-neumann que foi removido)
cd /home/othavio/Work/profills/sistema-coleta-de-lead

# Garantir main atualizado
git checkout main
git pull --ff-only

# Criar feature branch
git checkout -b post-compliance-cleanup

# Garantir deps
bun install

# Baseline: tests verdes em main
bun run test
# Esperado: 209/209 passing
```

---

## Phase 1 — Infra fixes (baixo risco)

### Task 1.1: packages/ui/tsconfig.json — remover baseUrl deprecated

**Files:**
- Modify: `packages/ui/tsconfig.json`

**Contexto:** TypeScript 6 deprecou `baseUrl` quando usado so pra habilitar `paths`. Com `paths` definido, `baseUrl` defaults pra directory do tsconfig — nao precisa declarar. Erro `TS6073: Option 'baseUrl' is deprecated` apareceu durante o refactor anterior e atrapalhou validacao.

**Estado atual:**
```json
{
  "extends": "@dashboard-leads-profills/config/tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "jsx": "react-jsx",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "paths": {
      "@dashboard-leads-profills/ui/*": ["./src/*"]
    },
    "strictNullChecks": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules"]
}
```

**Alvo:** remover linha `"baseUrl": ".",`. Os `paths` ficam relativos ao diretorio do tsconfig.json automaticamente em TS 6+.

**Verificacao:**
```bash
bun run check-types
# Esperado: sem TS6073 baseUrl deprecated. Outros erros pre-existentes tolerados (seram fixados em Fase 2).

# Imports de packages/ui ainda resolvem
grep -rn '@dashboard-leads-profills/ui/components' apps/web/src | head -5
# Manual inspect: imports intocados
```

### Task 1.2: bottom-nav.tsx — NAV_ITEMS unused

**Files:**
- Modify: `apps/web/src/components/bottom-nav.tsx`

**Contexto:** Constante `NAV_ITEMS` (linha 9) declarada mas Links sao renderizados hardcoded (linhas 26-48 e 62-84). Erro TS `6133: 'NAV_ITEMS' is declared but its value is never read`.

**Decisao:** usar o map. Bottom nav tem 2 tabs laterais (Ranking + Leads) + FAB central. Map renderiza os 2 laterais, o FAB fica inline.

**Estrutura alvo:**
```tsx
"use client";

import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import { Plus, Trophy, UserPlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useKeyboardVisible } from "@/components/fab";

const NAV_ITEMS = [
	{ href: "/dashboard", label: "Ranking", icon: Trophy },
	{ href: "/leads", label: "Leads", icon: UserPlus },
] as const;

export default function BottomNav() {
	const pathname = usePathname();
	const keyboardVisible = useKeyboardVisible();

	if (keyboardVisible) {
		return null;
	}

	return (
		<nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card md:hidden">
			<div className="relative flex items-center justify-around pb-[env(safe-area-inset-bottom)]">
				{NAV_ITEMS.slice(0, 1).map((item) => {
					const Icon = item.icon;
					const isActive = pathname === item.href;
					return (
						<Link
							className="flex flex-1 flex-col items-center gap-1 py-2.5"
							href={item.href as unknown as "/"}
							key={item.href}
						>
							<Icon
								className={cn(
									"size-5",
									isActive ? "text-primary" : "text-muted-foreground"
								)}
							/>
							<span
								className={cn(
									"text-xs",
									isActive
										? "font-medium text-primary"
										: "text-muted-foreground"
								)}
							>
								{item.label}
							</span>
						</Link>
					);
				})}

				{/* Center FAB: Novo Lead */}
				<Link
					aria-label="Adicionar novo lead"
					className="relative -top-3 flex items-center justify-center"
					href={"/leads/new" as unknown as "/"}
				>
					<div className="flex size-[52px] items-center justify-center rounded-full border-[3px] border-card bg-primary">
						<Plus
							className="size-6 text-primary-foreground"
							strokeWidth={2.5}
						/>
					</div>
				</Link>

				{NAV_ITEMS.slice(1).map((item) => {
					const Icon = item.icon;
					const isActive = pathname === item.href;
					return (
						<Link
							className="flex flex-1 flex-col items-center gap-1 py-2.5"
							href={item.href as unknown as "/"}
							key={item.href}
						>
							<Icon
								className={cn(
									"size-5",
									isActive ? "text-primary" : "text-muted-foreground"
								)}
							/>
							<span
								className={cn(
									"text-xs",
									isActive
										? "font-medium text-primary"
										: "text-muted-foreground"
								)}
							>
								{item.label}
							</span>
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
```

Nota: `size-[52px]` e `border-[3px]` do FAB ficam **preservados aqui** — sao dimensoes pixel-perfect legitimas que podem virar tokens na Fase 5.

**Verificacao:**
```bash
bun run check-types
# Esperado: sem TS6133 NAV_ITEMS unused

bun run dev:web
# Manual: abre http://localhost:3001/leads (mobile devtools)
# Confirmar que tabs laterais e FAB renderizam identicos ao antes
```

### Phase 1 commit

```bash
git add packages/ui/tsconfig.json apps/web/src/components/bottom-nav.tsx
git commit -m "fix(infra): remover baseUrl deprecated e NAV_ITEMS unused warning"
```

---

## Phase 2 — Tests fixture helpers + fix pre-existentes

### Task 2.1: Criar helpers `makeSyncStatus` e `makeLead`

**Files:**
- Create: `apps/web/src/test-utils/fixtures.ts`

**Contexto:** Testes em `sync-status-icon.test.ts`, `engine.test.ts`, `update-lead.test.ts`, `photo-upload.test.ts` constroem objetos `SyncStatus` / `Lead` parciais sem campos obrigatorios (`uploadFailed`, `authExpired`, `isStalled`, `retryAttempt`, `totalRetries`). TypeScript reclama `Property missing`. Tests RUNTIME passam porque codigo sob teste nao acessa esses campos, mas typecheck vermelho impede validacao clean.

**Fix:** helper factory que preenche defaults seguros e aceita overrides.

**Conteudo novo:**
```ts
import type { Lead } from "@/lib/db/schema";

export interface SyncStatusLike {
	authExpired: boolean;
	isOnline: boolean;
	isStalled: boolean;
	isSyncing: boolean;
	lastError: string | null;
	lastSync: string | null;
	pendingCount: number;
	retryAttempt: number | null;
	totalRetries: number;
}

export function makeSyncStatus(
	overrides: Partial<SyncStatusLike> = {}
): SyncStatusLike {
	return {
		authExpired: false,
		isOnline: true,
		isStalled: false,
		isSyncing: false,
		lastError: null,
		lastSync: null,
		pendingCount: 0,
		retryAttempt: null,
		totalRetries: 0,
		...overrides,
	};
}

type LeadInsert = Omit<Lead, "localId">;

export function makeLead(overrides: Partial<LeadInsert> = {}): LeadInsert {
	return {
		serverId: null,
		userId: "user-test",
		name: "Test Lead",
		phone: null,
		email: null,
		company: null,
		position: null,
		segment: null,
		notes: null,
		interestTag: "quente",
		photo: null,
		photoUrl: null,
		uploadFailed: false,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		deletedAt: null,
		syncStatus: "pending",
		...overrides,
	};
}
```

**IMPORTANTE:** Codex deve inspecionar o tipo real `Lead` em `apps/web/src/lib/db/schema.ts` antes de copiar esta estrutura. Se houver drift, Codex ajusta os defaults para bater com o schema atual. A importacao `SyncStatus` real provavelmente esta em `apps/web/src/components/sync-status-provider.tsx` ou proxima — conferir e usar o tipo autoritativo se existir.

### Task 2.2: Migrar tests para usar helpers

**Files:**
- Modify: `apps/web/src/components/sync-status-icon.test.ts`
- Modify: `apps/web/src/lib/sync/engine.test.ts`
- Modify: `apps/web/src/lib/lead/update-lead.test.ts`
- Modify: `apps/web/src/lib/sync/photo-upload.test.ts`

**Pattern de migracao:**

Antes:
```ts
const status = deriveSyncState({
	isOnline: true,
	isSyncing: false,
	pendingCount: 0,
	lastSync: null,
	lastError: null,
});
```

Depois:
```ts
import { makeSyncStatus } from "@/test-utils/fixtures";

const status = deriveSyncState(makeSyncStatus({
	isOnline: true,
	isSyncing: false,
}));
```

Antes:
```ts
await db.leads.add({
	localId: "abc",
	serverId: null,
	name: "Foo",
	// ... muitos campos
	interestTag: "quente",
	syncStatus: "pending",
	userId: "user-1",
});
```

Depois:
```ts
import { makeLead } from "@/test-utils/fixtures";

await db.leads.add({
	localId: "abc",
	...makeLead({ name: "Foo", userId: "user-1" }),
});
```

**Escopo:** todas as ocorrencias dos erros TS originais (Codex inventaria via `bunx tsc --noEmit` no apps/web e identifica linhas). Esperado cerca de ~20 linhas distribuidas nos 4 arquivos.

**Verificacao:**
```bash
cd apps/web && bunx tsc --noEmit 2>&1 | grep -E '\.test\.ts'
# Esperado: zero erros

bun run test
# Esperado: 209/209 passing (nenhum runtime breakage)
```

### Phase 2 commit

```bash
git add apps/web/src/test-utils/fixtures.ts \
	apps/web/src/components/sync-status-icon.test.ts \
	apps/web/src/lib/sync/engine.test.ts \
	apps/web/src/lib/lead/update-lead.test.ts \
	apps/web/src/lib/sync/photo-upload.test.ts

git commit -m "test(web): adicionar fixture helpers makeSyncStatus e makeLead"
```

---

## Phase 3 — DESIGN.md refresh

### Task 3.1: Documentar tokens semanticos novos

**Files:**
- Modify: `.design/DESIGN.md` (secao 2: Color Palette & Roles)

**Contexto:** Fase 1 do refactor anterior adicionou tokens `--warning/--success/--gold/--rank-accent/--glow-primary` em `packages/ui/src/styles/globals.css`. DESIGN.md nao foi atualizado. Sem documentacao, futuros agentes ou devs nao sabem que esses tokens existem e vao reinventar.

**Alvo:** inserir subsecao "Status & Semantic" dentro da secao 2, entre "Brand" e "Neutral Scale".

**Conteudo novo (inserir apos a subsecao `### Brand` e antes de `### Neutral Scale`):**

```markdown
### Status & Semantic (Added in shadcn compliance refactor)

Semantic tokens para estados de sistema e acentos de conteudo. Todos mapeados em `@theme inline` como classes Tailwind (`bg-warning`, `text-success`, `fill-gold`, `text-rank-accent`, `shadow-glow-primary`).

**Status colors:**
- **Warning** light `#eab308` / dark `#fbbf24`: sync pending, retrying, error states, countdowns de urgencia
- **Warning foreground** light `#fefce8` / dark `#0f0f0f`: texto sobre badge warning
- **Success** light `#22c55e` / dark `#34d399`: sync completed, positive state metrics
- **Success foreground** light `#f0fdf4` / dark `#0f0f0f`: texto sobre badge success

**Semantic accents:**
- **Gold** light `#eab308` / dark `#facc15`: conquistas/podium 1o lugar (Star icon)
- **Rank accent** light `#818cf8` / dark `#a5b4fc`: indicadores de ranking/posicao (ex: rank number no header)

**Effects:**
- **Glow primary** light `0 0 16px rgba(62, 207, 142, 0.25)` / dark `0 0 16px rgba(62, 207, 142, 0.3)`: glow suave verde para destaques brand (usado no podium 1o lugar)

**Diretrizes de uso:**
- Status colors sao para **feedback de sistema**, nao decoracao. Warning NUNCA em texto principal; so em dots de status, badges pequenos, countdowns.
- Gold reservado para achievement moments (podium top, milestones). Nao usar como acento generico.
- Rank accent e neutro frio — indicadores de posicao em rankings ou leaderboard. Nao usar como brand color.
- Glow primary e raro — so em elemento hero/destaque unico por tela. Evitar multiplos glows simultaneos.

**Implementacao:**
Ver `packages/ui/src/styles/globals.css` para os valores CSS exatos e o bloco `@theme inline` que expoe classes Tailwind correspondentes.
```

**Notas:**
- Tocar somente secao 2. Outras secoes (3-9) ficam intactas.
- Se houver conflito de estrutura (ex: a subsecao "Brand" esta num lugar diferente do esperado), Codex confirma lendo o arquivo inteiro antes de editar.

**Verificacao:**
```bash
grep -n 'Status & Semantic' .design/DESIGN.md
# Esperado: 1 match

grep -cE '^### (Brand|Status & Semantic|Neutral Scale)' .design/DESIGN.md
# Esperado: 3 (ordem preservada)
```

### Phase 3 commit

```bash
git add .design/DESIGN.md
git commit -m "docs(design): documentar tokens warning/success/gold/rank-accent no DESIGN.md"
```

---

## Phase 4 — Tailwind v4 syntax migration

### Task 4.1: Inventario de padroes v3

**Files:** read-only scan

**Comando:**
```bash
# Gradients
grep -rnE 'bg-gradient-to-(b|t|l|r|tr|tl|br|bl)' apps/web/src packages/ui/src > /tmp/v4-gradients.txt
wc -l /tmp/v4-gradients.txt

# Alpha em brackets (ex: primary/[0.03])
grep -rnE '(via|from|to)-[a-z-]+/\[[0-9.]+\]' apps/web/src packages/ui/src > /tmp/v4-alphas.txt
wc -l /tmp/v4-alphas.txt

# Shadow arbitrary (deveriam virar tokens quando aplicavel)
grep -rn 'shadow-\[' apps/web/src packages/ui/src
```

**Objetivo:** Codex coleta lista completa antes de aplicar fixes. Se lista > 50 ocorrencias, reportar e segmentar.

### Task 4.2: `bg-gradient-to-*` → `bg-linear-to-*`

**Pattern:** substituicao 1:1

| Antes | Depois |
|---|---|
| `bg-gradient-to-b` | `bg-linear-to-b` |
| `bg-gradient-to-t` | `bg-linear-to-t` |
| `bg-gradient-to-l` | `bg-linear-to-l` |
| `bg-gradient-to-r` | `bg-linear-to-r` |
| `bg-gradient-to-tr` | `bg-linear-to-tr` |
| `bg-gradient-to-tl` | `bg-linear-to-tl` |
| `bg-gradient-to-br` | `bg-linear-to-br` |
| `bg-gradient-to-bl` | `bg-linear-to-bl` |

**Nota:** `podium.tsx` ja foi parcialmente migrado (commit `25daa29 feat: update` fez `bg-linear-to-b`). Codex nao duplica.

### Task 4.3: Alpha em brackets → syntax v4

**Pattern:** `color/[0.NN]` → `color/NN` onde NN e percentual inteiro.

| Antes | Depois |
|---|---|
| `via-primary/[0.03]` | `via-primary/3` |
| `from-primary/[0.05]` | `from-primary/5` |
| `bg-primary/[0.04]` | `bg-primary/4` |
| `border-primary/[0.15]` | `border-primary/15` |
| `to-primary/[0.02]` | `to-primary/2` |

**Regra:** multiplicar por 100 e arredondar. Se o valor original nao arredonda bem (ex: `[0.033]`), manter arbitrario. Codex decide caso a caso.

**Podium ja tem alguns v4:** `via-primary/3` foi migrado. Codex nao duplica.

### Task 4.4: Outros smells Tailwind v4

Verificar tambem:
- `ring-offset-` → verificar se deprecado
- Classes `group-*` com novas syntaxes
- Container queries se aparecerem

Se Codex encontrar smells alem dos listados, reporta antes de alterar e pede confirmacao.

**Verificacao:**
```bash
grep -rn 'bg-gradient-to-' apps/web/src packages/ui/src
# Esperado: zero matches

grep -rnE '(via|from|to|bg|border)-[a-z-]+/\[[0-9.]+\]' apps/web/src packages/ui/src
# Esperado: zero matches ou so padroes que nao arredondam bem (documentar exceções)

bun run dev:web
# Manual: /dashboard (podium gradients), /leads (cards), /admin (varios)
# Verificar que visual permanece identico
```

### Phase 4 commit

```bash
# Codex identifica lista exata de arquivos modificados
git add <arquivos>
git commit -m "refactor(web): migrar syntax Tailwind v3 para v4 (gradients e alphas)"
```

---

## Phase 5 — Dimensoes hardcoded fora-de-Button

### Task 5.1: Inventario

**Comando:**
```bash
grep -rnE '(size|h|w|min-h|min-w|max-h|max-w)-\[[0-9]+(px|rem|em)\]' apps/web/src packages/ui/src > /tmp/dims.txt
wc -l /tmp/dims.txt
```

**Classificacao (Codex preenche baseado no grep):**

Cada match cai em uma de 3 categorias:

1. **LEGITIMO LAYOUT** — dimensoes pixel-perfect que nao mapeiam pra escala de tokens. Exemplos conhecidos:
   - `qr-scanner.tsx:112` `max-w-[320px]` — viewport de video do scanner
   - `login-card.tsx:108` `max-w-[400px]` — card de login centrado
   - `admin-lead-edit.tsx:101` `max-w-[480px]` — form container
   - `lead-list.tsx:228-233` `h-[72px]` — match altura exata do lead-card skeleton
   - `personal-dashboard.tsx:64,107` e `stats-charts.tsx:57,58,81,98` `h-[160px]`, `h-[120px]` — altura exata de charts
   - `podium.tsx:46,90` `h-[88px]`, `w-[110px]`, `w-[96px]` — dimensoes pixel-perfect do podium
   - `users-panel.tsx:416,644` `w-[120px]`, `h-[72px]` — SelectTrigger fixo e skeleton
   - `admin-user-card.tsx:94` `h-8 w-[120px]` — SelectTrigger
   - `global-header.tsx:191` `h-[52px]` — altura header desktop
   - `bottom-nav.tsx:56` `size-[52px]`, `border-[3px]` — FAB circle

   **Acao:** Manter. Adicionar comentario de 1 linha acima de cada bloco explicando o porque:
   ```tsx
   {/* Dimensao pixel-perfect: match altura do lead-card */}
   <Skeleton className="h-[72px] w-full rounded-lg" />
   ```

2. **TOKEN CANDIDATE** — dimensoes que repetem e fazem sentido como token de sizing. Criterio: aparece ≥2x com mesmo valor e mesmo proposito semantico.
   - Candidato: `h-[72px]` (altura de row de lead) aparece 7x em `lead-list.tsx` e 1x em `users-panel.tsx`. Virar `h-card-row` via CSS var + `@theme inline`.
   - Candidato: `h-[160px]` chart aparece 5x entre `personal-dashboard` e `stats-charts`. Virar `h-chart`.

   **Acao:** criar tokens em `globals.css`:
   ```css
   :root {
     --size-card-row: 4.5rem;  /* 72px */
     --size-chart: 10rem;       /* 160px */
     --size-chart-sm: 7.5rem;   /* 120px */
   }
   ```

   `@theme inline`:
   ```css
   --height-card-row: var(--size-card-row);
   --height-chart: var(--size-chart);
   --height-chart-sm: var(--size-chart-sm);
   ```

   Classes resultantes: `h-card-row`, `h-chart`, `h-chart-sm`. Documentar na secao 2 do DESIGN.md (subsecao nova "Sizing Tokens" ou extender a secao 5 "Layout Principles" com subsecao "Spacing & Sizing Tokens").

3. **AVATAR/ICON** — `size-[30px]`, `size-[52px]` sao proximos de utility classes (`size-8` = 32px, `size-12` = 48px, `size-14` = 56px).
   - `size-[30px]` (header avatar showName) — manter arbitrario OU trocar por `size-8` (32px, delta +2px aceitavel). **Decisao: trocar por `size-8`** para alinhar ao sistema.
   - `size-[52px]` (FAB) — 52px nao tem equivalente padrao (`size-12`=48, `size-14`=56). **Decisao: manter arbitrario + comentario justificando** porque o FAB tem dimensao pixel-perfect calibrada com `border-[3px]` e visual motion spec.

4. **BORDER EM PX** — `border-[3px]` (bottom-nav FAB). Unico uso, nao e padrao, e intencional pra o FAB. **Decisao: manter + comentario**.

### Task 5.2: Executar reclassificacao

Ordem dentro da fase:
1. Adicionar sizing tokens em `packages/ui/src/styles/globals.css` (:root + .dark se diferirem + @theme inline)
2. Extender DESIGN.md secao 5 com subsecao "Sizing Tokens Specific to Project"
3. Substituir classes `h-[72px]` → `h-card-row`, `h-[160px]` → `h-chart`, `h-[120px]` → `h-chart-sm`
4. Substituir `size-[30px]` → `size-8` (header avatar)
5. Adicionar comentarios de 1 linha nos hardcoded preservados (FAB, login card, qr-scanner, form max-widths)

**Arquivos esperados modificados:**
- `packages/ui/src/styles/globals.css`
- `.design/DESIGN.md`
- `apps/web/src/app/(app)/leads/lead-list.tsx`
- `apps/web/src/app/(app)/dashboard/personal-dashboard.tsx`
- `apps/web/src/app/(app)/admin/stats/stats-charts.tsx`
- `apps/web/src/app/(app)/admin/users/users-panel.tsx`
- `apps/web/src/components/global-header.tsx`
- `apps/web/src/components/bottom-nav.tsx` (comentario)
- `apps/web/src/components/login-card.tsx` (comentario)
- `apps/web/src/components/qr-scanner.tsx` (comentario)
- `apps/web/src/app/(app)/admin/leads/[id]/admin-lead-edit.tsx` (comentario)
- `apps/web/src/components/podium.tsx` (comentario nas w-[110px]/w-[96px]/h-[88px])

**Verificacao:**
```bash
grep -rnE 'h-\[72px\]|h-\[160px\]|h-\[120px\]|size-\[30px\]' apps/web/src
# Esperado: zero matches (todos substituidos)

grep -n '\-\-size-card-row\|--height-card-row\|--height-chart' packages/ui/src/styles/globals.css
# Esperado: 5+ matches

bun run check-types
# Esperado: zero erros novos

bun run dev:web
# Manual: /dashboard (skeleton heights), /admin/stats (charts), /leads (skeletons), /admin/users (table skeletons + avatar)
# Confirmar que tudo renderiza identico
```

### Phase 5 commit

```bash
git add packages/ui/src/styles/globals.css \
	.design/DESIGN.md \
	apps/web/src/app/\(app\)/leads/lead-list.tsx \
	apps/web/src/app/\(app\)/dashboard/personal-dashboard.tsx \
	apps/web/src/app/\(app\)/admin/stats/stats-charts.tsx \
	apps/web/src/app/\(app\)/admin/users/users-panel.tsx \
	apps/web/src/components/global-header.tsx \
	apps/web/src/components/bottom-nav.tsx \
	apps/web/src/components/login-card.tsx \
	apps/web/src/components/qr-scanner.tsx \
	apps/web/src/app/\(app\)/admin/leads/\[id\]/admin-lead-edit.tsx \
	apps/web/src/components/podium.tsx

git commit -m "refactor(web): substituir dimensoes hardcoded repetidas por tokens de sizing"
```

---

## Phase 6 — Colocation `_components/`

### Task 6.1: Inventario orfaos route-specific

Arquivos em `apps/web/src/components/` que sao usados por **exatamente 1 rota** e deveriam estar colocated na rota correspondente:

**Candidatos conhecidos (validar):**
- `apps/web/src/components/login-card.tsx` — usado so em `apps/web/src/app/(public)/login/page.tsx`
- `apps/web/src/components/lead-card.tsx` — usado so em `apps/web/src/app/(app)/leads/lead-list.tsx`
- `apps/web/src/components/tag-filter.tsx` — usado so em `apps/web/src/app/(app)/leads/lead-list.tsx`

**Validacao:**
```bash
for file in login-card lead-card tag-filter; do
  echo "=== $file ==="
  grep -rn "from.*components/$file\|import.*$file" apps/web/src --include='*.tsx' --include='*.ts'
done
```

Se o grep revelar mais de 1 importador para algum arquivo, ele NAO move — fica em `components/` como shared.

### Task 6.2: Mover + fixar imports

Padrao do projeto (ja existente): rotas admin usam colocated **flat** na pasta da rota (ex: `admin/leads/admin-lead-card.tsx` sem `_components/`). Mas alguns projetos preferem subpasta `_components/` (underscore impede ser interpretado como rota no App Router).

**Decisao:** usar `_components/` para route-specific novos migrados, mantendo os ja-colocated-flat em paz. Isso introduz padrao misto temporariamente mas evita refactor gigante de mover todos os colocated flat. Documentar a convencao no CLAUDE.md do projeto (adicao pequena em "Convencoes de Codigo").

**Destino dos 3 orfaos:**

1. `login-card.tsx`:
   - Move: `apps/web/src/components/login-card.tsx` → `apps/web/src/app/(public)/login/_components/login-card.tsx`
   - Fix import em `apps/web/src/app/(public)/login/page.tsx`:
     - Antes: `import LoginCard from "@/components/login-card";`
     - Depois: `import LoginCard from "./_components/login-card";`

2. `lead-card.tsx`:
   - Move: `apps/web/src/components/lead-card.tsx` → `apps/web/src/app/(app)/leads/_components/lead-card.tsx`
   - Fix import em `apps/web/src/app/(app)/leads/lead-list.tsx`:
     - Antes: `import LeadCard from "@/components/lead-card";`
     - Depois: `import LeadCard from "./_components/lead-card";`

3. `tag-filter.tsx`:
   - Move: `apps/web/src/components/tag-filter.tsx` → `apps/web/src/app/(app)/leads/_components/tag-filter.tsx`
   - Fix import em `apps/web/src/app/(app)/leads/lead-list.tsx`:
     - Antes: `import TagFilter from "@/components/tag-filter";`
     - Depois: `import TagFilter from "./_components/tag-filter";`

**Imports internos dos arquivos movidos:** podem usar imports relativos `./` ou absolutos `@/components/*`. Os arquivos atualmente importam `InterestIcon` e `getTagConfig` de `./interest-icon` (relativo). Apos o move, esses paths quebram. Fix:
- `tag-filter.tsx` e `tag-selector.tsx` importam `./interest-icon` → precisa virar `@/components/interest-icon`
- Mesmo para `lead-card.tsx` se importar alguma coisa de `components/`

Codex roda typecheck apos move e corrige imports quebrados que forem detectados.

### Task 6.3: Atualizar CLAUDE.md com convencao

**Files:**
- Modify: `CLAUDE.md` (projeto raiz)

Adicionar em "Convencoes de Codigo" uma linha:
```markdown
- Componentes usados por **1 rota especifica** devem ficar colocated em `apps/web/src/app/<rota>/_components/<nome>.tsx`. Componentes compartilhados entre multiplas rotas ficam em `apps/web/src/components/`.
```

### Verificacao

```bash
# Orfaos fora de components/
ls apps/web/src/components/login-card.tsx 2>&1
ls apps/web/src/components/lead-card.tsx 2>&1
ls apps/web/src/components/tag-filter.tsx 2>&1
# Esperado: 3x "No such file or directory"

# Novos locais existem
ls apps/web/src/app/\(public\)/login/_components/login-card.tsx
ls apps/web/src/app/\(app\)/leads/_components/lead-card.tsx
ls apps/web/src/app/\(app\)/leads/_components/tag-filter.tsx
# Esperado: 3x listed

# Typecheck limpo
bun run check-types
# Esperado: zero erros de import

# Tests
bun run test
# Esperado: 209/209 passing

# Manual
bun run dev:web
# /login, /leads, /leads com filtro de tag
```

### Phase 6 commit

```bash
git add -A  # safer pra pegar moves + deletes + adds
git commit -m "refactor(web): colocation de componentes route-specific em _components/"
```

---

## Verificacao end-to-end final

Apos todas as 6 fases commitadas:

```bash
# Typecheck limpo
bun run check-types
# Esperado: zero erros

# Lint limpo
bun run check
# Esperado: zero erros novos (tolerar warnings pre-existentes nao relacionados)

# Tests verdes
bun run test
# Esperado: 209/209 passing (ou mais se novos tests foram adicionados)

# Build passa
bun run build
# Esperado: build sucesso

# Git log
git log --oneline main..HEAD
# Esperado: 6 commits em ordem:
#   1. fix(infra): remover baseUrl deprecated e NAV_ITEMS unused warning
#   2. test(web): adicionar fixture helpers makeSyncStatus e makeLead
#   3. docs(design): documentar tokens warning/success/gold/rank-accent no DESIGN.md
#   4. refactor(web): migrar syntax Tailwind v3 para v4 (gradients e alphas)
#   5. refactor(web): substituir dimensoes hardcoded repetidas por tokens de sizing
#   6. refactor(web): colocation de componentes route-specific em _components/

# Teste visual manual end-to-end
bun run dev:web
# Percorrer: /login, /dashboard, /leads, /leads/new, /admin/leads, /admin/users, /admin/stats
# Toggle dark/light
# Mobile devtools
# Nada deve quebrar visualmente
```

---

## Finishing

Apos tudo verde, reporta status para o user com:
- SHAs dos 6 commits
- Lista de arquivos tocados por fase
- Resumo de tokens novos adicionados (sizing + Status ja documentados)
- Pendencias (se houver) para consideracao humana

Entao pausa e aguarda decisao do user:
1. Merge local em main
2. Push + PR
3. Manter branch
4. Descartar

Nao faz merge ou push sem confirmacao explicita do user.

---

## Constraints importantes pro executor

1. **Sempre trabalhe no worktree principal** `/home/othavio/Work/profills/sistema-coleta-de-lead`. NAO criar worktree.
2. **NAO use `git stash`** se encontrar uncommitted changes pre-existentes — reporta e pausa pedindo instrucao.
3. **NAO use `--amend`** em commits ja feitos. Sempre commit novo.
4. **NAO use `--no-verify`** pra contornar hooks.
5. **Se typecheck ou test quebrar em qualquer fase**, reverte a fase (git reset apenas do commit ruim ou git checkout -- do arquivo) e reporta.
6. **Commit por fase**, na ordem do plano. Nao combinar fases em um commit so.
7. **Seguir o padrao existente** de indentacao (TABS em TS/TSX, 2-SPACE em JSON) exceto onde o codigo ja esta misto (admin-lead-card tem 2-SPACE nos imports de dropdown-menu vindo do main worktree — nao tentar corrigir isso neste plano).
8. **Fase 5 e a mais arriscada** — se a reclassificacao de dimensoes gerar ambiguidade sobre o que e token vs legitimo, reporta antes de agir.
9. **Fase 6 tem risco de break** em imports. Rodar typecheck apos cada arquivo movido, nao apenas no fim da fase.
10. **Caveman mode NAO aplica** ao Codex — ele pode escrever comentarios e mensagens em estilo normal. Caveman e preferencia do user em interacoes com Claude.
