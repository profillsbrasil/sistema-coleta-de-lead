# 11 - Integração em Projeto Next.js + Supabase Existente

Este é o caso mais comum em produção: você já tem um app rodando, não vai criar nada do zero. Esta referência foca em **não quebrar nada** do que já está lá e maximizar o reaproveitamento.

## Antes de tocar em qualquer arquivo

Faça este diagnóstico do projeto existente. Os comandos abaixo são para rodar na raiz do projeto:

### 1. App Router ou Pages Router?

```bash
# Se existir ./app/ com page.tsx/page.jsx → App Router
# Se existir ./pages/ com index.tsx/index.jsx → Pages Router
# Pode ter os dois conviventes
ls -la app/ 2>/dev/null
ls -la pages/ 2>/dev/null
```

Esta skill assume **App Router**. Se for Pages Router, veja a seção "Adaptação para Pages Router" no final.

### 2. Existe lib do Supabase?

```bash
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "./node_modules/*" -not -path "./.next/*" \
  | xargs grep -l "createClient.*supabase" 2>/dev/null
```

Provavelmente vai achar:
- `lib/supabase.ts` ou `lib/supabase/client.ts` (cliente browser, com anon key)
- `lib/supabase-server.ts` ou `lib/supabase/server.ts` (cliente server, possivelmente já com service role)
- Ou só um cliente com anon key (precisa criar um server admin)

### 3. Tem autenticação ativa?

```bash
grep -r "supabase.auth\|next-auth\|clerk" --include="*.ts" --include="*.tsx" \
  -l . 2>/dev/null | head -5
```

Se sim, anote qual sistema (Supabase Auth, NextAuth, Clerk). O bot do WhatsApp **não usa autenticação** (cada participante é identificado pelo telefone), mas pode coexistir.

### 4. Schema do banco existente

No SQL Editor do Supabase:

```sql
-- Tabelas em uso
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

Verifique se algum nome conflita com o que vamos criar (`participants`, `received_messages`).

### 5. Configuração de runtime existente

```bash
cat next.config.js next.config.mjs vercel.json 2>/dev/null
```

Verifique especialmente:
- Algum `experimental.serverActions`?
- `output: "export"` ou `"standalone"`?
- `maxDuration` global?
- Middleware ativo? (cat middleware.ts)

### 6. Versão do Next.js

```bash
cat package.json | grep '"next"'
```

Esta skill assume **Next.js 14+ com App Router**. Versões anteriores funcionam com adaptações mínimas.

## Estratégia de namespace

Para evitar colisões, escolha UMA destas três abordagens antes de codar:

### Estratégia A: Prefixo `raffle_` nas tabelas

**Quando usar**: a maioria dos casos. Simples, sem alterar o cliente Supabase.

```sql
create table public.raffle_participants ( ... );
create table public.raffle_received_messages ( ... );
```

No código, todas as queries usam o nome prefixado:
```ts
await supabaseAdmin.from("raffle_participants").select("*");
```

### Estratégia B: Schema dedicado `raffle`

**Quando usar**: você quer isolamento total e o projeto já segue boas práticas de schemas (não usa só `public`).

```sql
create schema raffle;
create table raffle.participants ( ... );
create table raffle.received_messages ( ... );

-- Permitir que API service role acesse
grant usage on schema raffle to service_role;
grant all on all tables in schema raffle to service_role;
```

No código, especifique o schema:
```ts
await supabaseAdmin.schema("raffle").from("participants").select("*");
```

### Estratégia C: Foreign keys para tabelas existentes

**Quando usar**: o projeto já tem um conceito de `events` ou `clients` e faz sentido relacionar.

```sql
create table public.raffle_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  phone text not null,
  -- ... outras colunas
  unique (event_id, phone)
);
```

Vantagem: mesma pessoa pode participar de eventos diferentes. Bot precisa saber qual evento — passe via parâmetro na URL do `wa.me`:

```
https://wa.me/5511987654321?text=[EVENTO123]+Quero+participar
```

O webhook extrai o `[EVENTO123]` para roteamento.

**Recomendação**: comece com **Estratégia A** (prefixo). É a mais simples e cobre 95% dos casos. Você pode evoluir depois.

## Estrutura de pastas no projeto existente

Adições típicas (não substituições):

```
seu-projeto/
├── app/                              # ← já existente
│   ├── (rotas-existentes)/           # ← intocado
│   ├── api/
│   │   ├── (rotas-existentes)/       # ← intocado
│   │   └── webhook/                  # ← NOVO
│   │       └── whatsapp/
│   │           └── route.ts
│   └── sorteio/                      # ← NOVO (ou onde fizer sentido)
│       └── page.tsx
├── lib/                              # ← já existente
│   ├── supabase.ts                   # ← REAPROVEITAR ou estender
│   ├── supabase-admin.ts             # ← NOVO se não existir admin
│   ├── whatsapp.ts                   # ← NOVO
│   ├── state-machine.ts              # ← NOVO
│   └── lgpd.ts                       # ← NOVO
├── types/
│   └── database.ts                   # ← ESTENDER ou criar
├── middleware.ts                     # ← AJUSTAR se houver
└── .env.local                        # ← ADICIONAR variáveis
```

**Princípio**: zero alterações em arquivos existentes, exceto:
- `.env.local` (adicionar novas vars)
- `middleware.ts` (excluir nova rota do matcher)
- `lib/supabase.ts` se precisar adicionar cliente admin

## Reaproveitando o cliente Supabase existente

### Cenário 1: já existe um cliente admin (service role)

Verifique:
```bash
grep -rn "service_role" lib/ 2>/dev/null
```

Se já existe, importe direto:
```ts
// lib/state-machine.ts
import { supabaseAdmin } from "@/lib/supabase-server";
```

### Cenário 2: só existe cliente browser (anon key)

Você precisa criar o admin. Crie `lib/supabase-admin.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

// Cliente com service role para operações server-side do bot.
// NUNCA importe este arquivo em código que roda no browser.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
```

Se quiser garantir que não vaze para o browser, adicione no topo:
```ts
import "server-only"; // se @next/server-only estiver instalado
```

### Cenário 3: você usa `@supabase/ssr` para Auth

Comum em projetos Next.js modernos com Supabase Auth. O bot do WhatsApp não precisa de sessão de usuário, então use o cliente admin direto (independente do SSR).

```ts
// lib/supabase-admin.ts
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
```

Mantém os clientes SSR existentes funcionando normalmente nas outras rotas.

## Middleware: como NÃO quebrar o webhook

Se o projeto tem `middleware.ts`, ele provavelmente está rodando em todas as rotas, o que pode:
1. Reescrever o body (quebra HMAC)
2. Exigir autenticação no webhook (a Meta não loga)

**Solução**: exclua a rota do webhook do matcher.

Exemplo de `middleware.ts` corrigido:

```ts
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // ... sua lógica existente
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - api/webhook (WhatsApp webhook precisa de body raw para HMAC)
     * - _next/static, _next/image, favicon, public assets
     */
    "/((?!api/webhook|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

Confirme com curl que o webhook não é interceptado pelo middleware:

```bash
curl -v "https://seu-projeto.vercel.app/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=SEU_TOKEN&hub.challenge=ping"
```

Deve responder 200 com `ping`. Se redirecionar ou pedir auth, o middleware ainda está ativo.

## Onde colocar a página de sorteio

Depende da estrutura do projeto. Boas opções:

### Opção 1: rota dedicada `/sorteio`

```
app/sorteio/page.tsx
```

URL: `https://seu-projeto.vercel.app/sorteio`. Limpa, fácil de gerar QR Code.

### Opção 2: dentro de uma rota de evento

```
app/eventos/[slug]/sorteio/page.tsx
```

URL: `https://seu-projeto.vercel.app/eventos/festa-2026/sorteio`. Faz sentido se o projeto já tem conceito de eventos.

### Opção 3: subdomain

`sorteio.suaempresa.com.br` apontando para a Vercel. Mais branding, mais setup.

Para evento único, **Opção 1 é a melhor**. Pode evoluir depois.

## Configurando variáveis de ambiente sem conflitos

O projeto já tem várias variáveis. Adicione as do bot **com prefixo** se houver risco de colisão:

| Variável padrão | Renomear para se houver conflito |
|---|---|
| `WHATSAPP_ACCESS_TOKEN` | `RAFFLE_WHATSAPP_ACCESS_TOKEN` |
| `WHATSAPP_PHONE_NUMBER_ID` | `RAFFLE_WHATSAPP_PHONE_NUMBER_ID` |
| ... | (mantém o padrão se não houver conflito) |

Lembre-se: ao renomear, atualize em **todos** os arquivos do bot.

## Endpoint health-check (opcional mas recomendado)

Adicione um endpoint simples para verificar que tudo está conectado:

```ts
// app/api/raffle/health/route.ts
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  // 1. Banco acessível?
  const { error: dbError } = await supabaseAdmin
    .from("raffle_participants")
    .select("id", { count: "exact", head: true });

  // 2. Variáveis configuradas?
  const envOk = !!(
    process.env.WHATSAPP_ACCESS_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID &&
    process.env.WHATSAPP_APP_SECRET &&
    process.env.WHATSAPP_VERIFY_TOKEN
  );

  return NextResponse.json({
    ok: !dbError && envOk,
    db: dbError ? `error: ${dbError.message}` : "ok",
    env: envOk ? "ok" : "missing variables",
    timestamp: new Date().toISOString(),
  });
}
```

Visite `https://seu-projeto.vercel.app/api/raffle/health` para confirmar antes do evento.

## Conflitos potenciais e como resolver

### Tabela `participants` já existe no projeto

→ Use Estratégia A (prefixo `raffle_`).

### Já existe `lib/whatsapp.ts` (talvez para outra integração)

→ Renomeie a do bot para `lib/whatsapp-raffle.ts` ou crie `lib/raffle/whatsapp.ts`.

### Já existe rota `/sorteio` ou `/api/webhook`

→ Use:
- `/api/webhook/whatsapp-raffle` para o webhook
- `/sorteio-evento-2026` para a landing

### O projeto usa Prisma/Drizzle/outro ORM no lugar do client Supabase

Você tem duas opções:

**Opção A**: continuar usando o ORM existente. Reescreva as queries em Prisma/Drizzle:

```ts
// Com Prisma:
await prisma.raffleParticipant.findUnique({ where: { phone } });

// Com Drizzle:
await db.select().from(raffleParticipants).where(eq(raffleParticipants.phone, phone));
```

**Opção B**: usar `@supabase/supabase-js` direto **só para o bot**. Funciona em paralelo ao ORM sem conflito (cada um tem seu próprio pool de conexões).

Recomendação: **Opção B** para reduzir surface de mudança no projeto.

### O projeto usa Server Actions e você quer reaproveitar

Você pode chamar `processIncomingMessage` direto de Server Actions (ex: para um painel admin):

```ts
"use server";
import { processIncomingMessage } from "@/lib/state-machine";

export async function reenviarMensagem(phone: string, text: string) {
  // Útil para testes ou suporte manual
  const fakeMsg = {
    from: phone,
    id: `wamid.admin-${Date.now()}`,
    timestamp: Math.floor(Date.now() / 1000).toString(),
    type: "text" as const,
    text: { body: text },
  };
  await processIncomingMessage(fakeMsg, "admin");
}
```

## Painel admin opcional (reaproveita auth existente)

Se o projeto já tem login admin, você pode adicionar uma página `/admin/sorteio`:

```tsx
// app/admin/sorteio/page.tsx
import { supabaseAdmin } from "@/lib/supabase-admin";
// Reaproveite o middleware/guard de admin existente

export default async function AdminSorteio() {
  const { data: participantes } = await supabaseAdmin
    .from("raffle_participants")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">
        Painel Sorteio ({participantes?.length})
      </h1>
      <table className="w-full">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Telefone</th>
            <th>Código</th>
            <th>Estado</th>
            <th>Criado em</th>
          </tr>
        </thead>
        <tbody>
          {participantes?.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.email}</td>
              <td>{p.phone}</td>
              <td className="font-mono">{p.raffle_code}</td>
              <td>{p.current_state}</td>
              <td>{new Date(p.created_at).toLocaleString("pt-BR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
```

⚠️ **Proteja com a auth existente do projeto.** Caso contrário, qualquer um acessa.

## Adaptação para Pages Router

Se o projeto está em Pages Router (`./pages/`), as adaptações são:

### Webhook
```ts
// pages/api/webhook/whatsapp.ts (em vez de app/api/webhook/whatsapp/route.ts)
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "node:crypto";

// IMPORTANTE: desabilita o parser automático do body para preservar raw
export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const { ["hub.mode"]: mode, ["hub.verify_token"]: token, ["hub.challenge"]: challenge } = req.query;
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      res.status(200).send(challenge);
      return;
    }
    res.status(403).send("Forbidden");
    return;
  }

  if (req.method === "POST") {
    const rawBody = await readRawBody(req);
    const signature = req.headers["x-hub-signature-256"] as string;
    if (!isValidSignature(rawBody, signature, process.env.WHATSAPP_APP_SECRET!)) {
      return res.status(401).send("Invalid signature");
    }
    const payload = JSON.parse(rawBody);
    res.status(200).json({ ok: true });
    // Fire-and-forget após responder
    void handleWebhookAsync(payload).catch(console.error);
    return;
  }

  res.status(405).send("Method Not Allowed");
}

// ... isValidSignature e handleWebhookAsync iguais ao App Router
```

### Landing page
```tsx
// pages/sorteio.tsx (em vez de app/sorteio/page.tsx)
// Componente igual ao do App Router
```

## Checklist da Fase 11 (Integração)

Antes de começar a codar:

- [ ] Identificado: App Router ou Pages Router?
- [ ] Identificado: já existe cliente Supabase admin?
- [ ] Identificado: tem middleware ativo? Em quais rotas?
- [ ] Verificadas: tabelas existentes (sem conflitos)
- [ ] Decidido: estratégia de namespace (prefixo, schema ou FK)
- [ ] Verificado: variáveis de ambiente sem conflitos
- [ ] Decidido: onde a landing vai ficar (`/sorteio`, `/eventos/:slug/sorteio`, subdomain)
- [ ] Verificado: ORM/Prisma/Drizzle no projeto (se existir)

Durante a integração:

- [ ] Nenhum arquivo existente foi modificado, exceto `middleware.ts` e `.env.local`
- [ ] Middleware excluiu a rota `/api/webhook/whatsapp` do matcher
- [ ] Cliente Supabase admin existe (criado ou reaproveitado)
- [ ] Health-check endpoint criado e retorna 200
- [ ] Todos os caminhos no código apontam para os nomes prefixados/schemados
- [ ] Variáveis no Vercel com mesmos nomes do `.env.local`

Após a integração:

- [ ] Rotas existentes do projeto continuam funcionando (teste 3-5 fluxos críticos)
- [ ] Auth existente (se houver) não foi afetada
- [ ] Build da Vercel passa sem warnings novos
- [ ] Logs da Vercel mostram só atividade esperada

## Quando voltar para `references/01-meta-setup.md`

Depois desta fase de diagnóstico e setup base, prossiga normalmente pela skill:

1. `references/01-meta-setup.md` — cadastrar app na Meta (independente do projeto)
2. `references/02-database-schema.md` — rodar SQL (com prefixo escolhido)
3. `references/03-webhook-implementation.md` — implementar webhook
4. ... e assim por diante.

A diferença é que agora você tem o **contexto** do projeto existente para fazer escolhas inteligentes em cada etapa.
