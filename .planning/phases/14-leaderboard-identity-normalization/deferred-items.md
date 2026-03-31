# Deferred Items — Phase 14

## Pre-existing type errors in apps/web (out of scope for phase 14)

These errors existed before phase 14 started and are in files unrelated to the changes made in this phase.

### 1. `apps/web/src/app/(app)/leads/lead-list.tsx:104`
```
error TS2322: Type 'RefObject<HTMLDivElement | null>' is not assignable to type 'Ref<HTMLLIElement> | undefined'.
```
HTMLDivElement vs HTMLLIElement mismatch in ref type.

### 2. `apps/web/src/lib/lead/update-lead.test.ts` (multiple lines: 36, 48, 57, 67, 74)
```
error TS2345: Argument of type '{ name: string; }' is not assignable to parameter of type '{ name: string; phone: string; interestTag: ... }'.
```
Test mock data missing required fields in update-lead.test.ts.

These should be tracked for a future phase or bug fix cycle.
