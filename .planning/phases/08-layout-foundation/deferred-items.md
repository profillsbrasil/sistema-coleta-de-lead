# Deferred Items - Phase 08

## Pre-existing Type Errors (out of scope)

- `apps/web/src/lib/lead/save-lead.ts:22,41` - `string | undefined` not assignable to `string`
- `apps/web/src/lib/lead/update-lead.ts:18,40` - `string | undefined` not assignable to `string`
- `apps/web/src/lib/lead/update-lead.test.ts:36,48,57,67,74` - Missing required fields in test data

## Pre-existing Lint Issues (out of scope)

- `apps/web/src/app/(app)/leads/lead-list.tsx:39` - useExhaustiveDependencies (activeTag)
- `apps/web/src/app/(app)/leads/lead-list.tsx:85,86` - noNestedTernary
- `apps/web/src/app/(app)/leads/lead-list.tsx:106` - useAriaPropsSupportedByRole (aria-label on div)
