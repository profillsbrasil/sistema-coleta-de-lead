# Design: Countdown de evento no dashboard

**Data**: 2026-04-08
**Tipo**: Feature

## Contexto

O app e usado em eventos e congressos com duracao definida. Vendedores precisam de visibilidade sobre o tempo restante para manter a urgencia e gamificacao. Atualmente nao existe nenhum indicador de tempo no dashboard.

## Solucao

Integrar um countdown no centro da `PersonalStatsBar`, criando um layout de 3 colunas.

### Componente `EventCountdown`

**Arquivo**: `apps/web/src/components/event-countdown.tsx`

Componente client que:
1. Le `process.env.NEXT_PUBLIC_EVENT_END` (ISO 8601)
2. Se nao definida ou data no passado: retorna `null`
3. Usa `useEffect` + `setInterval(1000)` para atualizar a cada segundo
4. Limpa o interval no unmount
5. Formato adaptativo:
   - >= 1 dia: `02d 14h 32m`
   - < 1 dia: `14h 32m 15s`
   - < 1 hora: `32m 15s`
6. Quando chega a zero: retorna `null` (desaparece)

Estilizacao: `text-xs text-muted-foreground font-mono` para os numeros, sem icones.

### Integracao na PersonalStatsBar

**Arquivo**: `apps/web/src/components/personal-stats-bar.tsx`

Layout atualizado:

```
[Avatar+Nome+Rank]    [Countdown]    [Leads | Hoje]
     flex-none         flex-1          flex-none
```

- `EventCountdown` e renderizado no centro com `text-center`
- Se `EventCountdown` retorna `null` (sem env var, evento acabou), o espaco central fica vazio — o layout `justify-between` existente mantem avatar e stats nas extremidades, sem mudanca visual
- Nenhuma prop nova na `PersonalStatsBar` — o countdown e self-contained

### Env var

**Arquivo**: `packages/env/src/web.ts`

```ts
NEXT_PUBLIC_EVENT_END: z.string().optional()
```

**Arquivo**: `apps/web/.env`

```
NEXT_PUBLIC_EVENT_END=2026-04-10T18:00:00
```

## Arquivos impactados

| Arquivo | Mudanca |
|---------|---------|
| `apps/web/src/components/event-countdown.tsx` | Novo componente |
| `apps/web/src/components/personal-stats-bar.tsx` | Adicionar countdown no centro do layout |
| `packages/env/src/web.ts` | Adicionar `NEXT_PUBLIC_EVENT_END` opcional |
| `apps/web/.env` | Adicionar variavel |

## Edge cases

| Cenario | Comportamento |
|---------|---------------|
| Sem env var definida | Countdown nao renderiza, layout inalterado |
| Data no passado | Countdown nao renderiza |
| Countdown chega a zero durante uso | Desaparece, layout volta ao original |
| Formato invalido na env var | `new Date()` retorna Invalid Date, countdown nao renderiza |

## Verificacao

1. Definir `NEXT_PUBLIC_EVENT_END` no `.env` com data futura
2. `bun run dev:web` — countdown aparece no centro da PersonalStatsBar
3. Alterar para data no passado — countdown desaparece
4. Remover env var — layout volta ao original sem erro
5. `bun run check-types` sem erros
