# Phase 4: Lead Management - Research

**Researched:** 2026-03-24
**Domain:** Offline-first CRUD UI with Dexie.js + React
**Confidence:** HIGH

## Summary

Phase 4 builds the lead management interface: list, edit, filter, and soft-delete. All operations are offline-first via Dexie, following the same pattern established in Phases 2-3 (write to Dexie, enqueue in syncQueue, sync engine propagates).

The core technical challenge is implementing infinite scroll with Dexie's `useLiveQuery` -- the recommended pattern is an expanding limit approach where the limit grows as the user scrolls. Filtering by tag uses Dexie's indexed `where()` clause on `interestTag`, which is already indexed in the schema. Edit reuses the existing `LeadForm` component with a `lead` prop for pre-filling.

**Primary recommendation:** Use expanding-limit `useLiveQuery` for the list (simple, reactive, performant for <1000 leads), IntersectionObserver for scroll detection, and `updateLead`/`deleteLead` functions mirroring the existing `saveLead` pattern (Dexie write + syncQueue enqueue).

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Cards empilhados. Cada card mostra nome, telefone/email, tag colorida (badge oklch), e timestamp relativo ("ha 5 min"). Reutiliza Card component do shadcn.
- **D-02:** Infinite scroll. Carrega 20 leads por vez conforme vendedor scrolla. Dados vem do Dexie via useLiveQuery (reactivo).
- **D-03:** Ordenacao por recencia (created_at desc) como default. Rota: `/leads` ou dashboard principal.
- **D-04:** Pagina de detalhe `/leads/[id]`. Toca no card da lista, abre pagina com todos os campos editaveis. Reutiliza LeadForm da Phase 3 em modo edicao (pre-preenche campos com dados existentes).
- **D-05:** Botao Salvar atualiza no Dexie + enfileira no syncQueue. Mesma logica de saveLead adaptada para update.
- **D-06:** Botao "Excluir" na pagina de detalhe `/leads/[id]`. Confirmacao simples ("Tem certeza?") via dialog.
- **D-07:** Soft-delete: seta `deletedAt = new Date()` no Dexie. Lead some da lista. Sync engine propaga para servidor.
- **D-08:** Sem swipe-to-delete. Sem botao de lixeira no card da lista.
- **D-09:** Botoes toggle no topo da lista, estilo TagSelector (cores oklch): Todos | Quente | Morno | Frio.
- **D-10:** Toggle unico -- um filtro ativo por vez. "Todos" e o default.
- **D-11:** Filtro aplica direto no Dexie query (instantaneo, offline). Sem request de rede.

### Claude's Discretion
- Infinite scroll implementation -- IntersectionObserver vs scroll event. Claude escolhe.
- LeadForm mode (create vs edit) -- como adaptar o componente existente para ambos os modos.
- Empty state da lista -- ilustracao e copy quando nao ha leads.
- Confirmacao de exclusao -- AlertDialog do shadcn ou confirm nativo.
- Timestamp relativo -- lib (date-fns) ou funcao custom. Claude decide baseado em bundle size.

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LEAD-01 | Vendedor pode listar seus proprios leads (ordenados por recencia) | Dexie `useLiveQuery` with expanding limit + `reverse().sortBy("createdAt")` pattern; `userId` index for user scoping |
| LEAD-02 | Vendedor pode editar qualquer campo de seus leads | `db.leads.update(localId, changes)` + syncQueue enqueue with operation "update"; reuse LeadForm with `lead` prop |
| LEAD-03 | Vendedor pode excluir seus leads (soft-delete) | `db.leads.update(localId, { deletedAt, syncStatus: "pending" })` + syncQueue with operation "delete"; filter `deletedAt === null` in list query |
| LEAD-04 | Vendedor pode filtrar leads por tag de interesse | Dexie `where("interestTag").equals(tag)` on indexed field; reuse TagSelector component with "Todos" option |
| LEAD-05 | CRUD de leads funciona offline via Dexie | All operations write to Dexie first + syncQueue; same pattern as Phase 3 `saveLead` |

</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| dexie | 4.3.0 | IndexedDB wrapper, offline-first storage | Already in project, handles leads table |
| dexie-react-hooks | 4.2.0 | `useLiveQuery` hook for reactive Dexie queries | Already in project, provides live data binding |
| sonner | 2.0.7 | Toast notifications | Already in project, feedback on save/delete |
| lucide-react | 1.6.0 | Icons (Trash2, ArrowLeft, etc.) | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui AlertDialog | - | Confirmation dialog for soft-delete | Install via `bunx shadcn@latest add alert-dialog` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| IntersectionObserver | scroll event listener | IntersectionObserver is simpler, no debounce needed, better performance |
| Custom relative time fn | date-fns `formatDistanceToNow` | Custom fn is ~15 lines, avoids 20KB+ dependency for one function |
| shadcn AlertDialog | `window.confirm()` | AlertDialog is styled and accessible; confirm is ugly but zero-effort. AlertDialog wins for UX consistency |

**Discretion recommendations:**
- **IntersectionObserver** for infinite scroll -- no debounce, native API, cleaner code
- **Custom relative time function** -- "ha X min/h/d" is trivial to implement (~15 lines), avoids date-fns import for a single use case
- **shadcn AlertDialog** for delete confirmation -- consistent with the design system, accessible, styled

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/
├── app/leads/
│   ├── page.tsx               # Lead list page (server component wrapper with auth guard)
│   ├── lead-list.tsx           # Client component with useLiveQuery + infinite scroll
│   └── [id]/
│       └── page.tsx            # Lead detail/edit page
├── components/
│   ├── lead-card.tsx           # Card for list item (name, phone/email, tag badge, timestamp)
│   ├── lead-form.tsx           # MODIFIED: add optional `lead` prop for edit mode
│   ├── tag-selector.tsx        # EXISTING: reuse for form
│   └── tag-filter.tsx          # NEW: "Todos" + tags toggle bar for list filtering
├── lib/lead/
│   ├── save-lead.ts            # EXISTING: create
│   ├── update-lead.ts          # NEW: update in Dexie + syncQueue
│   ├── delete-lead.ts          # NEW: soft-delete in Dexie + syncQueue
│   ├── queries.ts              # NEW: reusable Dexie query functions for list
│   └── relative-time.ts        # NEW: simple "ha X min" formatter
```

### Pattern 1: Expanding-Limit useLiveQuery for Infinite Scroll
**What:** Single `useLiveQuery` with a `limit` state that grows by PAGE_SIZE on each scroll threshold hit.
**When to use:** Lists under ~1000 items (our case -- vendedores at a conference).
**Example:**
```typescript
// Source: https://github.com/dexie/Dexie.js/discussions/1554
const PAGE_SIZE = 20;
const [limit, setLimit] = useState(PAGE_SIZE);

const leads = useLiveQuery(
  async () => {
    let collection = db.leads
      .where("userId").equals(userId)
      .filter((lead) => lead.deletedAt === null);

    if (activeTag !== "todos") {
      collection = db.leads
        .where("[userId+interestTag]")
        .equals([userId, activeTag])
        .filter((lead) => lead.deletedAt === null);
    }

    const results = await collection.toArray();
    results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return results.slice(0, limit);
  },
  [userId, activeTag, limit]
);

const loadMore = () => setLimit((prev) => prev + PAGE_SIZE);
```

**Note on index strategy:** The current Dexie schema indexes `userId` and `interestTag` separately. For the combined filter (user + tag), a compound index `[userId+interestTag]` would be optimal but requires a schema version bump. The simpler approach is to use `where("userId").equals(userId)` and `.filter()` for the tag, which is fast for < 1000 leads.

### Pattern 2: IntersectionObserver Sentinel
**What:** A sentinel `<div>` at the bottom of the list triggers `loadMore` when it enters the viewport.
**When to use:** Always, for infinite scroll detection.
**Example:**
```typescript
const sentinelRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const sentinel = sentinelRef.current;
  if (!sentinel) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting && hasMore) {
        loadMore();
      }
    },
    { rootMargin: "200px" }
  );

  observer.observe(sentinel);
  return () => observer.disconnect();
}, [hasMore, loadMore]);
```

### Pattern 3: updateLead / deleteLead Following saveLead Pattern
**What:** New functions that write to Dexie then enqueue syncQueue, exactly like `saveLead`.
**When to use:** All write operations on leads.
**Example:**
```typescript
// update-lead.ts
export async function updateLead(
  localId: string,
  data: Partial<LeadFormData>,
  photo?: Blob | null
): Promise<void> {
  const now = new Date().toISOString();
  const changes: Partial<Lead> = {
    ...data,
    updatedAt: now,
    syncStatus: "pending",
  };
  if (photo !== undefined) {
    changes.photo = photo;
  }
  await db.leads.update(localId, changes);
  await db.syncQueue.add({
    localId,
    operation: "update",
    payload: JSON.stringify({ ...data }),
    retryCount: 0,
    timestamp: now,
  });
}

// delete-lead.ts
export async function deleteLead(localId: string): Promise<void> {
  const now = new Date().toISOString();
  await db.leads.update(localId, {
    deletedAt: now,
    updatedAt: now,
    syncStatus: "pending",
  });
  await db.syncQueue.add({
    localId,
    operation: "delete",
    payload: JSON.stringify({ deletedAt: now }),
    retryCount: 0,
    timestamp: now,
  });
}
```

### Pattern 4: LeadForm Dual-Mode (Create vs Edit)
**What:** Add optional `lead` prop to existing LeadForm. When provided, pre-fill fields and change submit behavior.
**When to use:** `/leads/[id]` detail page.
**Example:**
```typescript
interface LeadFormProps {
  lead?: Lead;  // When present, edit mode
}

export default function LeadForm({ lead }: LeadFormProps) {
  const isEditMode = !!lead;
  const [name, setName] = useState(lead?.name ?? "");
  // ... same for all fields

  async function handleSubmit(e: React.FormEvent) {
    // ...validation...
    if (isEditMode && lead) {
      await updateLead(lead.localId, result.data, photo);
      toast.success("Lead atualizado!");
    } else {
      await saveLead(result.data, userId, photo);
      toast.success("Lead salvo!");
    }
    router.back();
  }

  return (
    // Header says "Editar Lead" vs "Novo Lead"
    // Submit button says "Salvar alteracoes" vs "Salvar Lead"
  );
}
```

### Anti-Patterns to Avoid
- **Fetching from server for list/edit:** All reads come from Dexie. Never call tRPC for lead CRUD directly -- always Dexie first, sync engine handles server communication.
- **Using offset-based pagination with useLiveQuery:** Offset shifts when new items arrive. Use expanding limit instead.
- **Mutating the Lead object in-place:** Always create new objects (project convention: immutability).
- **Forgetting deletedAt filter:** Every list query MUST filter `deletedAt === null` to exclude soft-deleted leads.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confirmation dialog | Custom modal | shadcn AlertDialog (`bunx shadcn@latest add alert-dialog`) | Accessible, styled, handles focus trap |
| Scroll detection | scroll event + debounce | IntersectionObserver API | Native, performant, no dependencies |
| Form validation | Manual checks | Existing `leadFormSchema` (Zod) | Already validates all fields with refine |

**Key insight:** This phase reuses heavily from Phase 3. The new code is mostly glue: list component, card component, update/delete functions, and tag filter.

## Common Pitfalls

### Pitfall 1: Forgetting to Filter Soft-Deleted Leads
**What goes wrong:** Deleted leads still appear in the list.
**Why it happens:** `deletedAt` is set but the query doesn't exclude these records.
**How to avoid:** Every Dexie query for the lead list MUST include `.filter((lead) => lead.deletedAt === null)`.
**Warning signs:** Leads reappear after deletion.

### Pitfall 2: useLiveQuery Returning Undefined During First Render
**What goes wrong:** Component crashes or shows blank because `useLiveQuery` returns `undefined` initially.
**Why it happens:** Dexie queries are async; the first render has no data yet.
**How to avoid:** Always handle the `undefined` case: `const leads = useLiveQuery(...) ?? []` or show a skeleton/loading state.
**Warning signs:** Flash of empty content or runtime error on `.map()`.

### Pitfall 3: Not Enqueuing syncQueue on Update/Delete
**What goes wrong:** Local changes never sync to server.
**Why it happens:** Developer updates Dexie but forgets the syncQueue entry.
**How to avoid:** `updateLead` and `deleteLead` functions MUST write to both `db.leads` and `db.syncQueue` atomically (same pattern as `saveLead`).
**Warning signs:** Data changes locally but server never receives them.

### Pitfall 4: Photo Handling in Edit Mode
**What goes wrong:** Editing a lead without changing the photo loses or corrupts the existing photo.
**Why it happens:** Photo is a `Blob` in Dexie. If not explicitly preserved, it gets overwritten with `null`.
**How to avoid:** In `updateLead`, only include `photo` in the update if the user explicitly changed it. Use `photo !== undefined` guard (not `!= null`).
**Warning signs:** Photos disappear after editing other fields.

### Pitfall 5: Next.js typedRoutes with Dynamic Segments
**What goes wrong:** TypeScript error when navigating to `/leads/[id]` with dynamic segment.
**Why it happens:** `typedRoutes: true` in next.config.ts requires generated types for all routes.
**How to avoid:** Use the same type cast pattern from Phase 3 FAB: `"/leads/${id}" as unknown as "/"`. Types regenerate on next build.
**Warning signs:** TypeScript compile error on `router.push()` with dynamic route.

### Pitfall 6: Dexie sortBy vs orderBy for Descending Order
**What goes wrong:** Leads sorted ascending instead of descending (oldest first).
**Why it happens:** Dexie's `orderBy()` returns ascending. `reverse()` before `sortBy()` reverses, but `sortBy()` on a filtered Collection is in-memory.
**How to avoid:** For filtered collections (where `deletedAt === null`), do the sort in JS after `.toArray()`: `results.sort((a, b) => b.createdAt.localeCompare(a.createdAt))`. For small datasets (<1000), this is negligible.
**Warning signs:** List order doesn't match "most recent first" expectation.

## Code Examples

### Relative Time Formatter (Custom, ~15 lines)
```typescript
// Source: custom implementation (avoids date-fns dependency)
const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

export function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  if (diff < MINUTE) return "agora";
  if (diff < HOUR) return `ha ${Math.floor(diff / MINUTE)} min`;
  if (diff < DAY) return `ha ${Math.floor(diff / HOUR)}h`;
  return `ha ${Math.floor(diff / DAY)}d`;
}
```

### Lead Card Component Structure
```typescript
// lead-card.tsx
import { Card } from "@dashboard-leads-profills/ui/components/card";

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
}

export default function LeadCard({ lead, onClick }: LeadCardProps) {
  return (
    <Card
      className="cursor-pointer p-4 transition-colors hover:bg-muted"
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{lead.name}</p>
          <p className="text-muted-foreground text-sm">
            {lead.phone ?? lead.email}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <TagBadge tag={lead.interestTag} />
          <span className="text-muted-foreground text-xs">
            {relativeTime(lead.createdAt)}
          </span>
        </div>
      </div>
    </Card>
  );
}
```

### Tag Filter (Extension of TagSelector)
```typescript
// tag-filter.tsx -- adds "Todos" option to the existing tag toggle pattern
type FilterTag = "todos" | "quente" | "morno" | "frio";

interface TagFilterProps {
  value: FilterTag;
  onChange: (tag: FilterTag) => void;
}

const FILTER_TAGS: FilterTag[] = ["todos", "quente", "morno", "frio"];
```

### AlertDialog for Delete Confirmation
```typescript
// Inside lead detail page
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@dashboard-leads-profills/ui/components/alert-dialog";

<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Excluir Lead</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
      <AlertDialogDescription>
        O lead sera removido da sua lista.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| offset/limit pagination | Expanding limit useLiveQuery | Dexie 4.x recommendation | Avoids content shift when new items arrive |
| scroll event + debounce | IntersectionObserver | Widely supported since 2020 | Simpler, more performant |
| forwardRef for React components | ref as prop | React 19 | Use ref directly, no forwardRef wrapper needed |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2 with workspace |
| Config file | `apps/web/vitest.config.ts` (jsdom env, fake-indexeddb/auto) |
| Quick run command | `bun run test -- --filter web` |
| Full suite command | `bun run test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LEAD-01 | List leads ordered by recency | unit | `bunx vitest run apps/web/src/lib/lead/queries.test.ts -t "returns leads sorted"` | Wave 0 |
| LEAD-02 | Update lead fields in Dexie + syncQueue | unit | `bunx vitest run apps/web/src/lib/lead/update-lead.test.ts` | Wave 0 |
| LEAD-03 | Soft-delete sets deletedAt + enqueues sync | unit | `bunx vitest run apps/web/src/lib/lead/delete-lead.test.ts` | Wave 0 |
| LEAD-04 | Filter leads by tag via Dexie query | unit | `bunx vitest run apps/web/src/lib/lead/queries.test.ts -t "filters by tag"` | Wave 0 |
| LEAD-05 | All CRUD works offline (Dexie-only, no network) | unit | All above tests use fake-indexeddb (no network) | Wave 0 |

### Sampling Rate
- **Per task commit:** `bunx vitest run apps/web/src/lib/lead/`
- **Per wave merge:** `bun run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/web/src/lib/lead/update-lead.test.ts` -- covers LEAD-02
- [ ] `apps/web/src/lib/lead/delete-lead.test.ts` -- covers LEAD-03
- [ ] `apps/web/src/lib/lead/queries.test.ts` -- covers LEAD-01, LEAD-04
- [ ] `apps/web/src/lib/lead/relative-time.test.ts` -- covers timestamp display

## Open Questions

1. **Compound index `[userId+interestTag]`**
   - What we know: Current schema indexes `userId` and `interestTag` separately. A compound index would make filtered queries faster.
   - What's unclear: Whether a schema version bump (v1 -> v2) causes issues with existing data.
   - Recommendation: For < 1000 leads, `where("userId").equals(userId).filter(tag)` is fast enough. Skip compound index unless performance is observed to be an issue. Avoids migration complexity.

2. **Photo display in LeadCard**
   - What we know: Photo is stored as a Blob in Dexie. Displaying it requires `URL.createObjectURL()`.
   - What's unclear: Whether to show a thumbnail in the card or only in the detail page.
   - Recommendation: Show photo only in the detail page. Cards stay lightweight (name, contact, tag, timestamp per D-01).

## Sources

### Primary (HIGH confidence)
- `apps/web/src/lib/db/index.ts` -- Dexie schema with indexed fields
- `apps/web/src/lib/lead/save-lead.ts` -- Established Dexie + syncQueue write pattern
- `apps/web/src/components/lead-form.tsx` -- Existing form component to reuse
- `apps/web/src/lib/sync/engine.ts` -- Sync engine handles push/pull of changes
- [Dexie.js Discussion #1554](https://github.com/dexie/Dexie.js/discussions/1554) -- Pagination with liveQuery patterns
- [Dexie.js Issue #1308](https://github.com/dexie/Dexie.js/issues/1308) -- Infinite scroll with useLiveQuery
- [Dexie.js Collection.sortBy()](https://dexie.org/docs/Collection/Collection.sortBy()) -- Sorting documentation
- [Dexie.js Collection.limit()](https://dexie.org/docs/Collection/Collection.limit()) -- Limit documentation

### Secondary (MEDIUM confidence)
- [Dexie.js useLiveQuery()](https://dexie.org/docs/dexie-react-hooks/useLiveQuery()) -- Official React hooks docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and used in prior phases
- Architecture: HIGH -- patterns directly extend Phase 3 code, Dexie API verified against docs
- Pitfalls: HIGH -- based on actual codebase analysis and Dexie docs

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable -- all libraries already pinned in project)
