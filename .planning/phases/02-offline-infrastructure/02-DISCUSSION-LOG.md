# Phase 2: Offline Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-24
**Phase:** 02-offline-infrastructure
**Areas discussed:** Schema de leads, Sync strategy, Conflict resolution, Connectivity detection

---

## Schema de leads

| Option | Description | Selected |
|--------|-------------|----------|
| Exatamente o que esta nos requirements | nome, telefone, email, empresa, cargo, segmento, notas, tag, foto. Sem campos extras. | ✓ |
| Adicionar campo de evento/origem | De onde o lead veio (stand, palestra, networking). Util para analytics depois. | |
| Minimo possivel | Apenas nome + telefone/email + tag. | |

**User's choice:** Exatamente o que esta nos requirements

| Option | Description | Selected |
|--------|-------------|----------|
| Pelo menos um | Vendedor preenche telefone OU email. | ✓ |
| Ambos obrigatorios | Sempre pede telefone E email. | |
| Nenhum obrigatorio | So nome e tag sao obrigatorios. | |

**User's choice:** Pelo menos um (telefone OU email)

| Option | Description | Selected |
|--------|-------------|----------|
| UUID v4 no client, bigserial no server | local_id = crypto.randomUUID(), server_id = auto-increment. | ✓ |
| UUID v4 em ambos | Mesmo UUID no client e server. | |
| You decide | Claude escolhe. | |

**User's choice:** UUID v4 no client, bigserial no server

---

## Sync strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Sync imediato ao reconectar | Detectou conexao → push → pull. Retry com backoff. | ✓ |
| Sync periodico (polling) | Checa a cada N segundos. | |
| Sync manual com botao | Usuario clica 'Sincronizar'. | |

**User's choice:** Sync imediato ao reconectar

| Option | Description | Selected |
|--------|-------------|----------|
| Push-then-pull | Envia mudancas locais primeiro, depois busca do servidor. | ✓ |
| Pull-then-push | Busca do servidor primeiro, depois envia locais. | |
| You decide | Claude escolhe. | |

**User's choice:** Push-then-pull

| Option | Description | Selected |
|--------|-------------|----------|
| Modulo singleton em lib/sync/ | Engine vive em lib/sync/engine.ts como singleton. | ✓ |
| Dentro de um React context provider | SyncProvider monta e desmonta o engine. | |
| You decide | Claude escolhe. | |

**User's choice:** Modulo singleton em lib/sync/

---

## Conflict resolution

| Option | Description | Selected |
|--------|-------------|----------|
| Row-level | Row inteira do server vence se updated_at mais recente. | ✓ |
| Field-level merge | Merge campo a campo. | |
| You decide | Claude escolhe. | |

**User's choice:** Row-level

| Option | Description | Selected |
|--------|-------------|----------|
| Silencioso | Dados do server substituem sem aviso. | |
| Toast discreto | Mostra toast 'X leads atualizados pelo servidor'. | ✓ |
| Log visivel | Lista de conflitos acessivel. | |

**User's choice:** Toast discreto

---

## Connectivity detection

| Option | Description | Selected |
|--------|-------------|----------|
| 30 segundos | Ping leve a cada 30s quando offline. | ✓ |
| 15 segundos | Mais responsivo. | |
| 60 segundos | Mais economico. | |

**User's choice:** 30 segundos

**User's choice:** Sem indicador visual de conectividade nesta fase.
**Notes:** Usuario explicitou que nao quer indicador de online/offline. Detector e interno apenas.

---

## Claude's Discretion

- Dexie schema design (indices, performance)
- Sync queue implementation (syncQueue table)
- tRPC procedures para sync (pushChanges, pullChanges)
- Error handling e retry strategy
- Foto handling no Dexie

## Deferred Ideas

None
