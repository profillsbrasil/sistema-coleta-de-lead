# Testing Patterns

**Analysis Date:** 2026-03-24

## Test Framework

**Runner:**
- Vitest 3.2.1
- Config: `vitest.workspace.ts` at root
- Environment: Node.js (configured as `environment: "node"`)

**Assertion Library:**
- Vitest built-in expectations (no explicit separate assertion library)
- Uses `.toBe()`, `.toEqual()`, `.expect()` patterns

**Run Commands:**
```bash
bun run test              # Run all tests via Turborepo (turbo test)
```

**Per-package:**
```bash
bun run test --filter=@dashboard-leads-profills/api     # Run API tests only
```

## Test File Organization

**Location:**
- Co-located with source code under `src/__tests__/` directory
- Example: `packages/api/src/__tests__/healthcheck.test.ts`

**Naming:**
- `.test.ts` suffix for all test files
- Pattern: `[feature-name].test.ts`

**Structure:**
```
packages/api/
├── src/
│   ├── index.ts
│   ├── context.ts
│   ├── routers/
│   │   ├── index.ts
│   │   └── todo.ts
│   └── __tests__/
│       └── healthcheck.test.ts
└── vitest.config.ts
```

## Test Configuration

**Per-package vitest.config.ts:**
```typescript
export default defineConfig({
	test: {
		globals: true,          // Global test/describe/expect (no imports needed)
		environment: "node",    // Node.js environment for API tests
		include: ["src/**/*.test.ts"],  // Pattern matching
		passWithNoTests: true,  // Don't fail if no tests found
	},
});
```

**Workspace setup (`vitest.workspace.ts`):**
```typescript
export default defineWorkspace(["packages/api", "packages/env"]);
```

Only `packages/api` and `packages/env` are configured as testable packages.

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, it } from "vitest";

describe("healthCheck", () => {
	it("deve retornar OK", () => {
		expect("OK").toBe("OK");
	});
});
```

**Patterns Observed:**
- `describe()` for test suites (named after feature/function)
- `it()` for individual test cases
- Test names in Portuguese (per project CLAUDE.md convention: "Conventional Commits em Portugues")
- Single assertion per test in observed examples

## Mocking

**Framework:** Not observed in current test suite
- No explicit mocking library configured
- Current test is a simple assertion (`expect("OK").toBe("OK")`)

**Expected patterns (based on architecture):**
- tRPC routers would need context mocking for `Session` type
- Database operations (Drizzle ORM) would need mocking or test database
- Better-Auth would need mocking for session verification

**What to Mock (guidance for future tests):**
- Database calls (use fixture data or in-memory test DB)
- External API calls (auth service, HTTP requests)
- Environment variables (override via test config or fixtures)

**What NOT to Mock:**
- Business logic that should be tested (validation, calculations)
- Framework utilities that are deterministic
- Type definitions (never mock types)

## Fixtures and Factories

**Test Data:**
Not observed in current test suite. Recommended pattern:

```typescript
// packages/api/src/__tests__/fixtures.ts
export const createMockContext = () => ({
	auth: null,
	session: {
		user: {
			id: "user-1",
			email: "test@example.com",
		},
	},
});

export const createMockTodo = (overrides = {}) => ({
	id: 1,
	text: "Test todo",
	completed: false,
	...overrides,
});
```

**Location:**
- Fixtures should live in `src/__tests__/fixtures.ts` or co-located with test file
- Keep data factory functions close to test usage

## Coverage

**Requirements:** Not enforced (no coverage config in vitest.config.ts)

**View Coverage:**
```bash
# Command not configured yet
# Recommended: bun run test -- --coverage
```

**Current Status:**
- Single test file exists (`healthcheck.test.ts`)
- No coverage metrics enforced
- Packages `api` and `env` are testable; `web` app is not configured for unit tests

## Test Types

**Unit Tests:**
- Scope: Individual functions, utilities, tRPC procedures
- Approach: Direct function calls with known inputs, verify outputs
- Examples: tRPC router tests, utility function tests
- Current: `healthcheck.test.ts` is a basic unit test

**Integration Tests:**
- Not currently visible in configuration
- Would test: tRPC + database, authentication flow, context creation
- Approach: Real or test database, actual tRPC context

**E2E Tests:**
- Not configured
- Not applicable: web app uses only client-side rendering with tRPC (no E2E framework setup)

## Common Patterns

**Async Testing:**
```typescript
// Pattern (recommended, not yet used):
it("should fetch todos", async () => {
	const result = await db.select().from(todo);
	expect(result).toBeDefined();
});
```

**Router Testing (tRPC):**
```typescript
// Pattern (recommended for packages/api):
import { createCaller } from "../routers";

it("should return all todos", async () => {
	const caller = createCaller(mockContext);
	const todos = await caller.todo.getAll();
	expect(todos).toEqual([]);
});
```

**Error Testing:**
```typescript
// Pattern (recommended for error handling):
import { TRPCError } from "@trpc/server";

it("should throw UNAUTHORIZED for protected procedure without session", async () => {
	const caller = createCaller({ session: null });
	await expect(() => caller.privateData()).rejects.toThrow(TRPCError);
});
```

**Input Validation Testing:**
```typescript
// Pattern (recommended for tRPC input validation):
it("should validate todo text is not empty", async () => {
	const caller = createCaller(mockContext);
	await expect(() =>
		caller.todo.create({ text: "" })
	).rejects.toThrow();
});
```

## Test Execution

**Run All Tests:**
```bash
bun run test
```

**Watch Mode:**
Not configured; would require adding to vitest.config.ts:
```typescript
test: {
	watch: true,
}
```

**TypeScript Support:**
- Vitest handles TypeScript out of box via tsconfig
- Strict mode enabled (no implicit `any`)

## Gaps and Recommendations

**Areas Not Yet Tested:**
- `packages/api/src/routers/todo.ts` — CRUD operations, database integration
- `packages/api/src/context.ts` — session creation and handling
- `packages/auth/src/index.ts` — Better-Auth configuration
- `apps/web` — React components (would need React Testing Library or similar; not configured)

**Priority Test Coverage:**
1. **High:** tRPC router CRUD operations (todo.ts) — business logic critical path
2. **High:** Protected procedure authentication (context.ts) — security-critical
3. **Medium:** Input validation (Zod schemas in routers) — data quality
4. **Medium:** Database queries (Drizzle ORM integration) — data integrity
5. **Low:** UI components (apps/web) — would need separate E2E strategy

**Setup for Router Testing:**
Recommended pattern to add to `packages/api/src/__tests__/`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "../routers";
import type { Context } from "../context";

describe("appRouter", () => {
	let mockContext: Context;

	beforeEach(() => {
		mockContext = {
			auth: null,
			session: {
				user: { id: "user-1", email: "test@example.com" },
			},
		};
	});

	describe("todo router", () => {
		it("getAll should return list of todos", async () => {
			const caller = appRouter.createCaller(mockContext);
			const todos = await caller.todo.getAll();
			expect(Array.isArray(todos)).toBe(true);
		});
	});
});
```

---

*Testing analysis: 2026-03-24*
