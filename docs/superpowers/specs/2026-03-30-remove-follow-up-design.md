# Remover Funcionalidade de Follow-up

## Contexto

O sistema Dashboard Leads Profills existe para **coleta rapida de leads durante eventos/congressos**. A funcionalidade de follow-up (funil de vendas com status pendente/contatado/em_negociacao/convertido/perdido) foi adicionada mas nao faz sentido para o problema: o sistema nao e gestao de leads, e sim coleta rapida. O follow-up adicionou complexidade desnecessaria no formulario, dashboard, banco de dados e sync.

**Objetivo:** Remover completamente o follow-up de todas as camadas, deixando o sistema focado no que importa.

## Escopo

Remocao cirurgica em fase unica. ~16 arquivos afetados, sem substituicoes — apenas remoção de codigo.

## Camada 1: Banco de Dados (PostgreSQL + Drizzle)

### Arquivos

- `packages/db/src/schema/leads.ts`

### Acoes

- Remover definicao do `followUpStatusEnum` (pgEnum)
- Remover coluna `followUpStatus` da tabela `leads`
- Gerar migration via `bun run db:generate` que produzira:
  - `ALTER TABLE leads DROP COLUMN follow_up_status;`
  - `DROP TYPE follow_up_status;`

## Camada 2: API / tRPC Routers

### Arquivos

- `packages/api/src/routers/sync.ts`
- `packages/api/src/routers/admin/leads.ts`

### Acoes

- Remover `"followUpStatus"` do Set `ALLOWED_LEAD_FIELDS` em sync.ts
- Remover bloco de cast/default do `followUpStatus` no push create em sync.ts
- Remover campo `followUpStatus` do Zod input schema do update em admin/leads.ts

## Camada 3: Frontend (UI, Forms, Cards, Dashboard)

### Arquivos a deletar

- `apps/web/src/components/follow-up-selector.tsx` — componente exclusivo
- `apps/web/src/app/(app)/dashboard/funnel-tab.tsx` — tab exclusiva do funil

### Arquivos a editar

- `apps/web/src/components/lead-form.tsx`
  - Remover imports de `FollowUpStatus` e `FollowUpSelector`
  - Remover state `followUpStatus`
  - Remover secao do formulario (label + selector)
  - Remover referencia no objeto de validacao

- `apps/web/src/components/lead-card.tsx`
  - Remover `FOLLOW_UP_CONFIG`
  - Remover rendering condicional do badge

- `apps/web/src/app/(app)/admin/leads/admin-lead-card.tsx`
  - Remover `FOLLOW_UP_CONFIG`
  - Remover rendering condicional do follow-up

- `apps/web/src/app/(app)/dashboard/dashboard.tsx`
  - Remover import e uso do `FunnelTab`

- `apps/web/src/lib/lead/export-csv.ts`
  - Remover `FOLLOW_UP_LABELS`
  - Remover coluna "Follow-up" do header
  - Remover serializacao do status

- `apps/web/src/lib/lead/export-csv.test.ts`
  - Remover `followUpStatus` dos leads de teste
  - Remover assertions de traducao de status

## Camada 4: Dexie (IndexedDB / Offline)

### Arquivos

- `apps/web/src/lib/db/types.ts`
  - Remover type `FollowUpStatus`
  - Remover campo `followUpStatus` da interface `Lead`

- `apps/web/src/lib/db/index.ts`
  - Criar version 5 com schema sem `followUpStatus` no indice
  - Migration que remove o campo dos registros existentes

- `apps/web/src/lib/lead/save-lead.ts`
  - Remover `followUpStatus` do objeto Dexie e do sync queue payload

- `apps/web/src/lib/lead/update-lead.ts`
  - Remover `followUpStatus` do update Dexie e do sync queue payload

- `apps/web/src/lib/lead/validation.ts`
  - Remover campo `followUpStatus` do Zod schema

## Verificacao

1. **Grep** — `followUp`, `follow_up`, `follow-up`, `FollowUp`, `FOLLOW_UP` retorna zero resultados
2. **`bun run check-types`** — sem erros TypeScript
3. **`bun run check`** — Biome passa sem warnings
4. **`bun run test`** — Vitest passa
5. **`bun run build`** — build completo sem erros
6. **`bun run db:generate`** — migration gerada corretamente
7. **Teste manual** — formulario sem secao Follow-up, dashboard sem tab funil
