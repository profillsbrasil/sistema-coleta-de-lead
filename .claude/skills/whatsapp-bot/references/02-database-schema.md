# 02 - Schema do Banco de Dados Supabase

Schema mínimo e suficiente para o fluxo de sorteio. Inclui idempotência, versionamento LGPD e auditoria.

## Decisões de design

### Uma tabela ou duas?

**Decisão: uma tabela `participants` com coluna `current_state`.**

Para até ~500 usuários e fluxo conversacional linear, separar em `participants` + `conversation_states` só agrega complexidade (joins desnecessários, transações de duas etapas). Quando crescer (multi-eventos, multi-fluxos), aí faz sentido normalizar.

### Por que tabela de `received_messages` separada?

Para **idempotência**: a Meta retenta webhooks com backoff exponencial por até 7 dias se você devolver != 2xx ou demorar muito. Sem deduplicação por `wamid`, você cria múltiplos participantes para a mesma mensagem.

### RLS (Row Level Security)

O bot opera 100% server-side com `SUPABASE_SERVICE_ROLE_KEY`, que **bypassa RLS**. Mesmo assim, **ative RLS sem policies** (default deny) para defender contra acesso acidental via chave anônima exposta.

## SQL completo (rodar no SQL Editor do Supabase)

```sql
-- ============================================
-- Extensões
-- ============================================
create extension if not exists "pgcrypto";

-- ============================================
-- Tabela principal: participantes do sorteio
-- ============================================
create table public.participants (
  id                   uuid primary key default gen_random_uuid(),
  phone                text not null unique,
  name                 text,
  email                text,
  raffle_code          text unique,
  current_state        text not null default 'INITIAL'
                       check (current_state in (
                         'INITIAL',
                         'TERMS_SENT',
                         'AWAITING_NAME',
                         'AWAITING_EMAIL',
                         'COMPLETED',
                         'DECLINED'
                       )),
  -- Auditoria LGPD
  terms_version        text,
  terms_accepted_at    timestamptz,
  terms_text_snapshot  text,
  -- Timestamps
  last_message_at      timestamptz default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

comment on table public.participants is
  'Participantes do sorteio via WhatsApp. Uma linha por número de telefone.';
comment on column public.participants.phone is
  'Telefone E.164 sem o +, ex: 5511987654321';
comment on column public.participants.current_state is
  'Estado atual na máquina de estados conversacional';
comment on column public.participants.terms_text_snapshot is
  'Snapshot do texto exato dos termos no momento do aceite (prova LGPD)';

-- ============================================
-- Tabela de idempotência: mensagens recebidas
-- ============================================
create table public.received_messages (
  wamid          text primary key,
  phone          text not null,
  received_at    timestamptz not null default now(),
  raw_payload    jsonb not null
);

comment on table public.received_messages is
  'Idempotência de webhooks. Meta retenta entregas por até 7 dias.';

-- ============================================
-- Índices para queries comuns
-- ============================================
create index participants_state_idx
  on public.participants(current_state);
create index participants_email_idx
  on public.participants(email)
  where email is not null;
create index participants_created_at_idx
  on public.participants(created_at desc);
create index received_msg_phone_idx
  on public.received_messages(phone);
create index received_msg_received_at_idx
  on public.received_messages(received_at desc);

-- ============================================
-- Trigger: atualizar updated_at automaticamente
-- ============================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger participants_updated_at
  before update on public.participants
  for each row
  execute function public.set_updated_at();

-- ============================================
-- Row Level Security (default deny)
-- ============================================
alter table public.participants enable row level security;
alter table public.received_messages enable row level security;
-- Sem policies = só service_role consegue ler/escrever
-- (service_role bypassa RLS por padrão no Supabase)
```

## Validações via constraints

Adicione validações no nível do banco como segunda camada de defesa (a primeira é o Zod no código):

```sql
-- Email deve ter formato válido (verificação básica via regex)
alter table public.participants
  add constraint participants_email_format
  check (email is null or email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Nome deve ter pelo menos 2 caracteres
alter table public.participants
  add constraint participants_name_length
  check (name is null or char_length(trim(name)) >= 2);

-- Telefone deve ser numérico (sem +, sem hífen, sem espaço)
alter table public.participants
  add constraint participants_phone_format
  check (phone ~* '^[0-9]{10,15}$');

-- Código de sorteio deve ser exatamente 6 dígitos
alter table public.participants
  add constraint participants_raffle_code_format
  check (raffle_code is null or raffle_code ~* '^[0-9]{6}$');
```

## Queries úteis para o dia do sorteio

### Total de participantes completos

```sql
select count(*)
from participants
where current_state = 'COMPLETED';
```

### Lista para o evento (CSV-friendly)

```sql
select name, email, phone, raffle_code, terms_accepted_at, created_at
from participants
where current_state = 'COMPLETED'
order by created_at asc;
```

Exporte: SQL Editor → **Download → CSV**.

### Sortear ganhador aleatoriamente

```sql
select id, name, email, phone, raffle_code
from participants
where current_state = 'COMPLETED'
order by random()
limit 1;
```

Para sortear múltiplos prêmios:

```sql
select id, name, email, phone, raffle_code, row_number() over () as posicao
from participants
where current_state = 'COMPLETED'
order by random()
limit 3;
```

### Stats por estado (debug)

```sql
select current_state, count(*) as qtd, max(updated_at) as ultima_atividade
from participants
group by current_state
order by qtd desc;
```

### Usuários que aceitaram mas não completaram (recuperáveis)

```sql
select phone, name, email, current_state, updated_at
from participants
where current_state in ('AWAITING_NAME', 'AWAITING_EMAIL')
  and updated_at < now() - interval '5 minutes'
order by updated_at desc;
```

Para esses, vale considerar uma mensagem template de reengajamento no dia seguinte (fora da janela de 24h).

### Deduplicação manual se algo deu errado

```sql
-- Encontrar duplicatas por email
select email, count(*)
from participants
where email is not null and current_state = 'COMPLETED'
group by email
having count(*) > 1;
```

## Para projetos existentes

Se o projeto do usuário já tem tabelas no schema `public`, considere:

### Opção A: Schema dedicado

```sql
create schema if not exists raffle;
-- Repita todas as definições acima trocando "public" por "raffle"
-- Ex: create table raffle.participants (...)
```

Vantagem: zero conflito com tabelas existentes. Desvantagem: precisa especificar schema em todas as queries (`raffle.participants` em vez de `participants`).

No cliente Supabase JS:
```ts
const { data } = await supabaseAdmin
  .schema("raffle")
  .from("participants")
  .select("*");
```

### Opção B: Prefixo nas tabelas

```sql
create table public.raffle_participants (...);
create table public.raffle_received_messages (...);
```

Mais simples no código, evita conflitos.

### Opção C: Foreign key para tabelas existentes

Se o projeto tem uma tabela `events` ou `users`, vale relacionar:

```sql
create table public.raffle_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  phone text not null,
  -- ... outras colunas
  unique (event_id, phone)  -- mesma pessoa pode participar de eventos diferentes
);
```

## Tipos TypeScript

Para usar nos arquivos `lib/`, defina tipos correspondentes:

```ts
// types/database.ts

export type ParticipantState =
  | "INITIAL"
  | "TERMS_SENT"
  | "AWAITING_NAME"
  | "AWAITING_EMAIL"
  | "COMPLETED"
  | "DECLINED";

export interface Participant {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  raffle_code: string | null;
  current_state: ParticipantState;
  terms_version: string | null;
  terms_accepted_at: string | null;
  terms_text_snapshot: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface ReceivedMessage {
  wamid: string;
  phone: string;
  received_at: string;
  raw_payload: Record<string, unknown>;
}
```

Alternativa: gerar automaticamente com `supabase gen types typescript`.

## Backup pré-evento

No dia anterior ao evento, faça um backup manual (free tier não tem backup automático garantido):

```bash
# Via Supabase CLI
supabase db dump -f backup-pre-evento.sql --linked
```

Ou no Dashboard: **Database → Backups → Download** (Pro tier).

## Pegadinha: Free tier pausa após 7 dias inativo

A página oficial de pricing da Supabase afirma textualmente: *"Free projects are paused after 1 week of inactivity."* Se você configurar com semanas de antecedência e ninguém acessar, no dia do evento o DB pode estar pausado.

**Workaround**: agende um cron route na Vercel que faça um SELECT periódico. Crie `app/api/keep-alive/route.ts`:

```ts
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { count } = await supabaseAdmin
    .from("participants")
    .select("*", { count: "exact", head: true });
  return Response.json({ ok: true, count });
}
```

Configure em `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/keep-alive", "schedule": "0 0 */3 * *" }
  ]
}
```

Roda a cada 3 dias automaticamente.

## Checklist da Fase 2 (Banco)

- [ ] SQL principal executado no Supabase SQL Editor
- [ ] Constraints de validação adicionadas
- [ ] RLS ativado (sem policies = default deny)
- [ ] Tipos TypeScript definidos em `types/database.ts`
- [ ] (Opcional) Cron de keep-alive configurado se evento for > 7 dias após o setup
- [ ] (Para projetos existentes) Decidido schema vs prefixo vs FK

Próximo: `references/03-webhook-implementation.md` para o handler do webhook.
