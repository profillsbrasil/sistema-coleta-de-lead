# Coding Conventions

**Analysis Date:** 2026-03-24

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `header.tsx`, `sign-in-form.tsx`) in `components/` directory
- Pages: kebab-case in App Router structure (e.g., `todos/page.tsx`, `dashboard/page.tsx`)
- Utilities: camelCase (e.g., `utils.ts`, `auth-client.ts`)
- Routers/API: kebab-case or lowercase (e.g., `todo.ts`, `routers/`, `context.ts`)
- Test files: `*.test.ts` suffix (e.g., `healthcheck.test.ts`)

**Functions:**
- PascalCase for React components (e.g., `Header`, `SignInForm`, `TodosPage`)
- camelCase for regular functions (e.g., `createContext`, `handleAddTodo`, `handleToggleTodo`)
- camelCase for tRPC procedures (e.g., `getAll`, `create`, `toggle`, `delete`)
- Event handlers: `handle*` prefix (e.g., `handleAddTodo`, `handleToggleTodo`, `handleDeleteTodo`)

**Variables:**
- camelCase for all variable declarations (e.g., `newTodoText`, `todos`, `createMutation`)
- UPPER_SNAKE_CASE for constants exported from modules (observed in route arrays: `const links = [...]`)
- `const` by default; `let` only when reassignment needed

**Types:**
- PascalCase for type definitions and interfaces (imported from Zod schemas, React types)
- Type assertions use `as const` for literal types (observed in `{ to: "/", label: "Home" } as const`)
- Explicit type imports: `import type { ... }` for type-only imports

## Code Style

**Formatting:**
- Indentation: tabs (configured in Biome)
- Quote style: double quotes (configured in Biome)
- Max line length: no explicit limit observed, but lines kept reasonable
- Trailing commas: included in multiline structures

**Linting:**
- Framework: Biome 2.4.7 with Ultracite preset
- Extends: `ultracite/biome/core`, `ultracite/biome/next`
- Key rules enforced:
  - `style.useAsConstAssertion: error` — use `as const` for literal types
  - `style.useSelfClosingElements: error` — self-close empty elements
  - `style.useSingleVarDeclarator: error` — one variable per declaration
  - `style.noUnusedTemplateLiteral: error` — no unnecessary template literals
  - `style.useNumberNamespace: error` — use `Number.*` instead of global
  - `style.noInferrableTypes: error` — omit types that can be inferred
  - `style.noUselessElse: error` — avoid unnecessary `else` after early return
  - `nursery.useSortedClasses: warn` — sort Tailwind classes via `cn()`, `clsx()`, `cva()`
  - `a11y.noLabelWithoutControl: warn` — labels must have associated controls
  - `correctness.useExhaustiveDependencies: info` — check hook dependencies

## Import Organization

**Order:**
1. External libraries and framework imports (e.g., `import Link from "next/link"`)
2. Internal package imports using workspace aliases (e.g., `@dashboard-leads-profills/*`)
3. Relative imports from same package (e.g., `@/components`, `@/lib`)
4. Side effects last (e.g., CSS imports)

**Path Aliases:**
- `@/` → app root in `apps/web/src/` (configured via Next.js tsconfig)
- `@dashboard-leads-profills/*` → workspace package imports (e.g., `@dashboard-leads-profills/ui/components/button`)
- Absolute imports preferred over relative `../../../` patterns
- No barrel files (index.ts re-exports) in hot paths; import directly from source

**Example from `sign-in-form.tsx`:**
```typescript
import { Button } from "@dashboard-leads-profills/ui/components/button";
import { Input } from "@dashboard-leads-profills/ui/components/input";
import { Label } from "@dashboard-leads-profills/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";
import Loader from "./loader";
```

## Error Handling

**Patterns:**
- tRPC: Use `TRPCError` with specific error codes and descriptive messages
  - Example: `throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" })`
- Better-Auth: Errors handled via `onError` callback in form submissions
  - Example: `onError: (error) => toast.error(error.error.message || error.error.statusText)`
- Database: No explicit error handling visible in CRUD operations; relies on ORM/framework
- Input validation: Zod schemas with descriptive error messages
  - Example: `z.email("Invalid email address")`, `z.string().min(8, "Password must be at least 8 characters")`
- No silent failures; errors propagated to UI via toast notifications or form validation display

## Logging

**Framework:** `console` methods available; no structured logger configured

**Patterns:**
- No debug statements in production code (enforced by `hookify.debug-statements`)
- No `console.log` in committed code
- Errors displayed to users via toast notifications (`toast.error()`, `toast.success()`)

## Comments

**When to Comment:**
- Self-documenting code preferred (clear function/variable names)
- No JSDoc observed in codebase
- No inline comments observed; code structure speaks for itself

## Function Design

**Size:** Functions kept under 50 lines per project conventions
- Example: `handleAddTodo` (5 lines), `handleToggleTodo` (2 lines), `handleDeleteTodo` (2 lines)

**Parameters:**
- Destructured parameters when multiple values needed
- Explicit type annotations for clarity
- Default parameters positioned after required parameters

**Return Values:**
- Implicit returns in arrow functions when single expression
- Explicit `return` statements in multiline blocks
- Async functions always return Promises or void

**Example from `todo.ts` (tRPC router):**
```typescript
export const todoRouter = router({
	getAll: publicProcedure.query(async () => {
		return await db.select().from(todo);
	}),

	create: publicProcedure
		.input(z.object({ text: z.string().min(1) }))
		.mutation(async ({ input }) => {
			return await db.insert(todo).values({
				text: input.text,
			});
		}),
});
```

## Module Design

**Exports:**
- Named exports for specific symbols (e.g., `export const router`, `export const publicProcedure`)
- Default exports for React components
- Type exports use `export type` syntax
- Example: `export type AppRouter = typeof appRouter;`

**Barrel Files:**
- NOT used in the codebase; components imported directly from source
- Example: `import { Button } from "@dashboard-leads-profills/ui/components/button"` (not from `@dashboard-leads-profills/ui`)

## React & JSX

**Components:**
- Function components only (no class components)
- PascalCase names
- Props typed explicitly with TypeScript interfaces or inline types
- Example: `export default function Header() { ... }`

**Hooks:**
- Imported from libraries (`@tanstack/react-form`, `@tanstack/react-query`, `next/navigation`)
- Called at top level only; never conditional
- Example: `const router = useRouter();` before any conditionals

**Children & Props:**
- Children passed between tags, not as props
- Props destructured in function signature
- Example from `Providers`:
```typescript
export default function Providers({ children }: { children: React.ReactNode }) {
	return <ThemeProvider>...</ThemeProvider>;
}
```

**Accessibility:**
- Labels associated with inputs via `htmlFor` attribute
- Example: `<Label htmlFor={field.name}>Email</Label>`
- ARIA labels for icon-only buttons: `aria-label="Delete todo"`
- Semantic HTML: `<button>`, `<nav>`, `<hr />`, `<form>`

## Async & Promises

**Syntax:**
- `async/await` preferred over `.then()` chains
- Example: `return await db.select().from(todo);`
- Always `await` promises in async functions
- Errors caught via `try-catch` or library-specific handlers

**Mutations & Queries:**
- tanstack/react-query: `useMutation()`, `useQuery()`
- Example from `todos/page.tsx`:
```typescript
const todos = useQuery(trpc.todo.getAll.queryOptions());
const createMutation = useMutation(
	trpc.todo.create.mutationOptions({
		onSuccess: () => {
			todos.refetch();
			setNewTodoText("");
		},
	})
);
```

## TypeScript

**Strict Mode:** Enabled in all packages (tsconfig.base.json has `strict: true`)

**Type Safety:**
- No `any` types; use `unknown` if genuinely unknown
- Explicit return types on functions when clarity matters
- Type narrowing preferred over assertions
- Example: `z.email()`, `z.string().min(1)` for validation

**Const Assertions:**
- Used for literal types and immutable values
- Example: `const links = [...] as const;` in header navigation

---

*Convention analysis: 2026-03-24*
