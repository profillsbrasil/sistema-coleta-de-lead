# Phase 3: Lead Capture - Research

**Researched:** 2026-03-24
**Domain:** Mobile-first form, QR scanning, image capture/compression, offline-first storage, Supabase Storage upload
**Confidence:** HIGH

## Summary

Phase 3 implementa o formulario de captura de leads com 3 toques, scan de QR Code WhatsApp para auto-preencher telefone, foto de cartao de visita com compressao via canvas, e tag de interesse. Toda a escrita e offline-first (Dexie), e a foto e sincronizada para Supabase Storage quando online.

A infraestrutura de Dexie + sync engine ja existe (Phase 2). O Dexie schema ja tem campo `photo: Blob | null` no Lead. O servidor Drizzle tem `photoUrl: text` para a URL do Storage. O Supabase browser client (`@supabase/ssr` + `@supabase/supabase-js` v2.100) ja esta configurado em `apps/web/src/lib/supabase/client.ts`. O trabalho e primariamente frontend: novos componentes React, integracao com camera, e extensao da sync engine para upload de fotos.

**Primary recommendation:** Usar `html5-qrcode` para scan de QR (API completa, handles camera permissions, suporte Safari iOS com fallback file-based). Compressao de imagem via canvas nativo (sem lib extra). Upload de foto para Supabase Storage integrado no sync engine existente como step pos-push.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Pagina dedicada `/leads/new`. FAB (floating action button) no dashboard leva para esta pagina.
- D-02: 3 toques = FAB + preencher campos + Salvar. Tag tem default 'morno', campos opcionais colapsados.
- D-03: Campos visiveis no form: nome (obrigatorio), telefone/email (pelo menos um), tag de interesse (default morno). Botao Salvar proeminente.
- D-04: Campos opcionais (empresa, cargo, segmento, notas) colapsados atras de "Mais detalhes". Link/botao expande a secao.
- D-05: Lead salvo direto no Dexie (offline-first). Sync engine da Phase 2 envia para servidor quando online.
- D-06: Scan via JS library com camera inline. Funciona offline (scan e local, sem request de rede).
- D-07: Botao de QR dentro do form, ao lado do campo telefone. Icone de QR. Toca > abre camera > detecta > parseia wa.me URL > preenche telefone automaticamente.
- D-08: Parse de URL wa.me: extrair numero do path (wa.me/5511999999999 ou wa.me/+5511999999999). Normalizar para formato com DDI.
- D-09: Camera via `<input type="file" accept="image/*" capture="environment">`. Abre camera nativa do celular. Compativel Safari/Chrome.
- D-10: Uma foto por lead. Sem galeria multipla.
- D-11: Compressao via canvas: max 1280px lado maior, JPEG quality 0.7 (CAPT-05). Resultado salvo no Dexie como Blob.
- D-12: Preview da foto no form apos captura. Botao para remover/trocar.
- D-13: Foto sincronizada para Supabase Storage quando online (CAPT-06). URL do Storage salva no lead no servidor.
- D-14: 3 botoes toggle lado a lado com cor: Quente (vermelho/laranja), Morno (amarelo), Frio (azul).
- D-15: Default: morno (pre-selecionado ao abrir form). Vendedor pode trocar com um toque.
- D-16: Tag obrigatoria — sempre tem valor (default garante isso).

### Claude's Discretion
- Biblioteca de QR scan — html5-qrcode vs jsQR vs outra
- Compressao de imagem — implementacao do canvas resize (createImageBitmap vs Image + canvas)
- FAB design — posicao, tamanho, icone (seguir shadcn + material)
- Form validation UX — como mostrar erros
- Supabase Storage upload — como integrar no sync engine existente

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAPT-01 | Vendedor pode criar lead via formulario rapido (nome, telefone/email, interesse obrigatorios) | LeadForm component + Zod validation schema + Dexie write pattern (db.leads.add + db.syncQueue.add) |
| CAPT-02 | Campos opcionais: empresa, cargo, segmento (texto livre), notas (multi-line) | shadcn Collapsible + Textarea components. Dexie Lead interface ja tem esses campos |
| CAPT-03 | Vendedor pode escanear QR Code do WhatsApp e auto-preencher telefone | html5-qrcode library + wa.me URL parser regex |
| CAPT-04 | Vendedor pode tirar foto (cartao de visita, crachat) e anexar ao lead | `<input type="file" accept="image/*" capture="environment">` — camera nativa, sem getUserMedia |
| CAPT-05 | Foto comprimida antes de armazenar no Dexie (max 1280px, JPEG 0.7) | Canvas API nativo: createImageBitmap + OffscreenCanvas/canvas.toBlob |
| CAPT-06 | Foto sincronizada para Supabase Storage quando online | Supabase JS client storage.from('lead-photos').upload() integrado na sync engine |
| CAPT-07 | Vendedor pode atribuir tag de interesse ao criar lead (quente, morno, frio) | TagSelector component com 3 botoes toggle, role="radiogroup" |
| CAPT-08 | Coleta funciona 100% offline — dados salvos no Dexie primeiro | Padrao existente: db.leads.add() + db.syncQueue.add(), sem network calls no form submit |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| html5-qrcode | 2.3.8 | QR Code scanning via camera | API completa com camera management, permissions handling, suporte Safari iOS com file-based fallback. Zero deps. 2.6MB unpacked (mas tree-shakeable — usa apenas Html5Qrcode class, nao o Scanner UI) |
| @supabase/supabase-js | 2.100.0 | Storage upload | Ja instalado. storage.from().upload() para enviar foto comprimida ao Supabase Storage |
| dexie | 4.3.0 | Offline storage | Ja instalado. db.leads.add() para persistencia offline-first |
| zod | 4.1.13 | Form validation schema | Ja instalado. Schema para validacao client-side do formulario |

### Supporting (ja instalados, sem adicao)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | 2.0.7 | Toast notifications | Feedback "Lead salvo!", erros de camera, QR nao reconhecido |
| lucide-react | 1.6.0 | Icons | QrCode, Camera, Plus (FAB), ArrowLeft, ChevronDown, X, Loader |
| shadcn/ui components | - | UI primitives | Button, Card, Input, Label, Collapsible, Textarea |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| html5-qrcode (2.6MB) | jsQR (280KB) | jsQR e apenas decoder — requer implementacao manual de getUserMedia, camera selection, error handling. html5-qrcode encapsula tudo. Para este projeto, conveniencia > bundle size |
| html5-qrcode (2.6MB) | qr-scanner/nimiq (524KB) | qr-scanner e menor e usa Web Worker, mas tem menos documentacao para React e menos handling de edge cases iOS Safari. html5-qrcode e mais battle-tested |
| Canvas nativo | browser-image-compression (lib) | Lib adiciona ~50KB para algo que 15 linhas de canvas fazem. Overkill para um unico caso de resize+JPEG |

**Recommendation (Claude's Discretion):** Usar html5-qrcode. O unpacked size de 2.6MB e enganoso — o minified bundle e ~120KB gzipped. A API `Html5Qrcode` (sem Scanner UI) permite UI customizada mantendo toda a logica de camera/permissions.

**Installation:**
```bash
bun add html5-qrcode
```

**New shadcn components:**
```bash
bunx shadcn@latest add textarea collapsible
```

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/
  app/
    leads/
      new/
        page.tsx             # Server component wrapper — renderiza LeadForm
  components/
    lead-form.tsx            # Form completo — state, validation, submit para Dexie
    tag-selector.tsx         # 3 botoes toggle (quente/morno/frio) com cores semanticas
    qr-scanner.tsx           # Overlay full-screen com html5-qrcode camera
    photo-capture.tsx        # Input file + canvas compression + preview
    fab.tsx                  # Floating action button (Link para /leads/new)
  lib/
    lead/
      validation.ts          # Zod schema para lead (reusavel client e sync)
      compression.ts         # compressImage(file): Promise<Blob> — canvas resize
      wa-parser.ts           # parseWhatsAppUrl(url): string | null — extrai telefone
    sync/
      photo-upload.ts        # uploadPendingPhotos() — Supabase Storage upload
      engine.ts              # (existente, estender com photo upload step)
```

### Pattern 1: Offline-First Form Submit
**What:** Form salva no Dexie primeiro, nunca faz network call diretamente. Sync engine cuida do push.
**When to use:** Sempre — e o padrao do projeto.
**Example:**
```typescript
// Source: Padrao existente em Phase 2 (engine.ts + db/index.ts)
import { v4 as uuid } from "crypto" // use crypto.randomUUID()

async function saveLead(data: LeadFormData, photo: Blob | null): Promise<void> {
  const localId = crypto.randomUUID()
  const now = new Date().toISOString()

  const lead: Lead = {
    localId,
    serverId: null,
    userId: currentUserId,
    name: data.name,
    phone: data.phone || null,
    email: data.email || null,
    company: data.company || null,
    position: data.position || null,
    segment: data.segment || null,
    notes: data.notes || null,
    interestTag: data.interestTag,
    photo: photo, // Blob salvo no Dexie
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: "pending",
  }

  await db.leads.add(lead)
  await db.syncQueue.add({
    localId,
    operation: "create",
    payload: JSON.stringify({
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      company: data.company || null,
      position: data.position || null,
      segment: data.segment || null,
      notes: data.notes || null,
      interestTag: data.interestTag,
    }),
    retryCount: 0,
    timestamp: now,
  })
}
```

### Pattern 2: Canvas Image Compression
**What:** Resize + JPEG compression via canvas nativo do browser.
**When to use:** Antes de salvar foto no Dexie (CAPT-05).
**Example:**
```typescript
// Source: Canvas API (MDN Web Docs)
async function compressImage(file: File): Promise<Blob> {
  const MAX_DIMENSION = 1280
  const JPEG_QUALITY = 0.7

  const bitmap = await createImageBitmap(file)

  let width = bitmap.width
  let height = bitmap.height

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext("2d")!
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error("Canvas toBlob failed"))
      },
      "image/jpeg",
      JPEG_QUALITY
    )
  })
}
```

### Pattern 3: WhatsApp URL Parser
**What:** Extrai numero de telefone de URL wa.me scaneada via QR.
**When to use:** Apos scan de QR detectar texto contendo wa.me.
**Example:**
```typescript
// Source: WhatsApp Click-to-Chat docs
const WA_ME_REGEX = /(?:https?:\/\/)?wa\.me\/\+?(\d{10,15})/i

function parseWhatsAppUrl(text: string): string | null {
  const match = text.match(WA_ME_REGEX)
  if (!match?.[1]) return null

  const phone = match[1]
  // Ja vem em formato internacional sem +
  return phone.startsWith("+") ? phone : `+${phone}`
}
```

### Pattern 4: Photo Upload via Supabase Storage (sync integration)
**What:** Apos pushChanges com sucesso, verificar leads com foto local pendente e fazer upload para Supabase Storage.
**When to use:** Dentro do sync cycle, apos push mas antes de pull.
**Example:**
```typescript
// Source: Supabase Storage JS docs
import { createClient } from "@/lib/supabase/client"

async function uploadPendingPhotos(): Promise<void> {
  const supabase = createClient()
  const leadsWithPhotos = await db.leads
    .filter((lead) => lead.photo !== null && lead.serverId !== null && lead.syncStatus === "synced")
    .toArray()

  for (const lead of leadsWithPhotos) {
    if (!lead.photo) continue

    const filePath = `${lead.userId}/${lead.localId}.jpg`
    const { error } = await supabase.storage
      .from("lead-photos")
      .upload(filePath, lead.photo, {
        contentType: "image/jpeg",
        upsert: true,
      })

    if (!error) {
      const { data: urlData } = supabase.storage
        .from("lead-photos")
        .getPublicUrl(filePath)

      // Atualizar photoUrl no servidor via sync
      await db.leads.update(lead.localId, { photo: null }) // Limpar blob local apos upload
      // A photoUrl vai no proximo push cycle via syncQueue update operation
    }
  }
}
```

### Pattern 5: html5-qrcode React Integration
**What:** Wrapper React para Html5Qrcode com lifecycle cleanup.
**When to use:** No QRScanner overlay component.
**Example:**
```typescript
// Source: html5-qrcode GitHub + React integration patterns
import { Html5Qrcode } from "html5-qrcode"
import { useCallback, useEffect, useRef } from "react"

function useQrScanner(
  elementId: string,
  onScan: (text: string) => void,
  active: boolean
) {
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const start = useCallback(async () => {
    const scanner = new Html5Qrcode(elementId)
    scannerRef.current = scanner

    await scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => onScan(decodedText),
      () => {} // ignore errors during scanning (normal — frame sem QR)
    )
  }, [elementId, onScan])

  const stop = useCallback(async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop()
      scannerRef.current.clear()
    }
    scannerRef.current = null
  }, [])

  useEffect(() => {
    if (active) {
      start()
    }
    return () => { stop() }
  }, [active, start, stop])

  return { stop }
}
```

### Anti-Patterns to Avoid
- **getUserMedia direto para foto:** Nao usar getUserMedia para captura de foto — usar `<input type="file" capture="environment">` que abre a camera nativa e funciona melhor em Safari iOS.
- **Base64 para foto no Dexie:** Nao salvar como base64 string — usar Blob nativo. Dexie IndexedDB suporta Blob diretamente e e mais eficiente em memoria.
- **Network call no form submit:** Nunca chamar tRPC ou Supabase Storage no submit do formulario. Salvar no Dexie primeiro, sync engine cuida do resto.
- **Compressao sincrona com Image element:** Evitar `new Image()` + onload callback chain. Usar `createImageBitmap()` que e async-native e mais limpo.
- **Camera start sem cleanup:** Html5Qrcode DEVE ter stop() no cleanup do useEffect. Camera sem release trava o recurso de hardware.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| QR scanning + camera management | getUserMedia + frame capture + QR decode loop | html5-qrcode `Html5Qrcode` class | Camera permission handling, facing mode selection, iOS Safari quirks, scanning loop — dezenas de edge cases |
| Collapsible section | Custom collapse com useState + height animation | shadcn Collapsible component | Acessibilidade (aria-expanded), animacao, keyboard navigation |
| Toast notifications | Custom notification system | Sonner (ja instalado) | Stacking, dismiss, accessibility |
| UUID generation | Custom ID | `crypto.randomUUID()` | Nativo no browser, zero deps |
| Form validation | Manual checks | Zod schema + parse no submit | Type-safe, mensagens configuradas, reusavel com tRPC |

**Key insight:** Esta fase e primariamente UI e integracao. As unicas coisas "novas" sao o scan de QR (lib) e compressao de imagem (canvas nativo). Todo o resto ja existe no projeto ou e componente shadcn padrao.

## Common Pitfalls

### Pitfall 1: html5-qrcode cleanup no React Strict Mode
**What goes wrong:** Em dev (React Strict Mode), useEffect roda 2x. Se Html5Qrcode.start() for chamado 2x sem stop() entre elas, da erro "camera already in use".
**Why it happens:** React 19 strict mode double-invokes effects.
**How to avoid:** Guard no start: verificar `scannerRef.current?.isScanning` antes de chamar start(). No cleanup, sempre chamar stop() + clear().
**Warning signs:** Console error "Cannot start scanning, it is already running" em dev mode.

### Pitfall 2: Safari iOS getUserMedia requer user gesture
**What goes wrong:** `navigator.mediaDevices.getUserMedia` em Safari iOS so funciona se chamado dentro de um click handler direto. Chamar em useEffect nao funciona.
**Why it happens:** Safari security policy — camera access requer user gesture.
**How to avoid:** O botao QR no form e o user gesture. html5-qrcode.start() deve ser chamado dentro do onClick handler ou em useEffect que dispara apos o click (com state toggle). A decisao D-07 ja previu isso (toque abre camera).
**Warning signs:** Camera permission dialog nao aparece, ou aparece e some imediatamente.

### Pitfall 3: IndexedDB quota com fotos grandes
**What goes wrong:** Fotos de 4-5MB de cameras modernas podem estourar a quota do IndexedDB (especialmente em Safari iOS que limita a ~50MB por origin).
**Why it happens:** Fotos originais de smartphones tem 3-12MB cada.
**How to avoid:** CAPT-05 resolve isso: compressao para max 1280px JPEG 0.7 resulta em ~100-300KB por foto. Alem disso, apos upload para Supabase Storage, limpar o Blob local do Dexie (setar photo = null).
**Warning signs:** QuotaExceededError no console, falha silenciosa ao salvar lead.

### Pitfall 4: createImageBitmap nao disponivel em Safari antigo
**What goes wrong:** `createImageBitmap()` nao existe em Safari < 15.
**Why it happens:** Implementacao tardia no WebKit.
**How to avoid:** Safari 15+ suporta. O constraint do projeto e "Chrome e Safari mobile", que em 2026 e Safari 17+. Seguro usar sem fallback. Se paranoia, testar `typeof createImageBitmap !== 'undefined'` e fallback para `new Image()`.
**Warning signs:** TypeError: createImageBitmap is not a function.

### Pitfall 5: Foto nao inclusa no syncQueue payload
**What goes wrong:** O payload do syncQueue e JSON stringificado — Blob nao serializa para JSON.
**Why it happens:** Design correto: foto fica no Dexie leads table, nao no syncQueue.
**How to avoid:** O upload de foto e um step separado da sync engine. pushChanges envia os campos texto via tRPC. uploadPendingPhotos envia o Blob via Supabase Storage. Sao operacoes independentes.
**Warning signs:** Foto perdida apos sync, ou JSON.stringify engolindo o campo photo silenciosamente.

### Pitfall 6: Supabase Storage RLS blocking uploads
**What goes wrong:** Upload retorna 403 sem explicacao clara.
**Why it happens:** Supabase Storage requer RLS policies na tabela `storage.objects` para permitir uploads.
**How to avoid:** Criar bucket `lead-photos` e adicionar RLS policy para INSERT autenticado, com path restrito ao userId.
**Warning signs:** `{ statusCode: "403", error: "Unauthorized" }` no upload.

## Code Examples

### Zod Validation Schema para Lead Form
```typescript
// Source: Padrao do projeto (Zod + tRPC input validation)
import { z } from "zod"

export const leadFormSchema = z
  .object({
    name: z.string().min(1, "Nome e obrigatorio"),
    phone: z.string().optional().default(""),
    email: z.string().email("Email invalido").optional().or(z.literal("")),
    interestTag: z.enum(["quente", "morno", "frio"]).default("morno"),
    company: z.string().optional().default(""),
    position: z.string().optional().default(""),
    segment: z.string().optional().default(""),
    notes: z.string().optional().default(""),
  })
  .refine(
    (data) => data.phone || data.email,
    { message: "Informe telefone ou email", path: ["phone"] }
  )

export type LeadFormData = z.infer<typeof leadFormSchema>
```

### Supabase Storage Bucket Setup (SQL)
```sql
-- Criar bucket (executar no Supabase Dashboard ou migration)
INSERT INTO storage.buckets (id, name, public)
VALUES ('lead-photos', 'lead-photos', true);

-- RLS: Authenticated users podem fazer upload na pasta do seu userId
CREATE POLICY "Users upload own lead photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'lead-photos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- RLS: Authenticated users podem ler suas proprias fotos
CREATE POLICY "Users read own lead photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'lead-photos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- RLS: Public read (se bucket for publico e fotos devem ser acessiveis)
CREATE POLICY "Public read lead photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'lead-photos');
```

### Photo Upload Integration no Sync Engine
```typescript
// Adicionar apos pushChanges() no syncCycle existente
// apps/web/src/lib/sync/photo-upload.ts
import { createClient } from "@/lib/supabase/client"
import { db } from "../db/index"

export async function uploadPendingPhotos(): Promise<void> {
  const supabase = createClient()

  // Leads com foto local E ja sincronizados (tem serverId)
  const candidates = await db.leads
    .filter((l) => l.photo !== null && l.serverId !== null)
    .toArray()

  for (const lead of candidates) {
    if (!lead.photo) continue

    const filePath = `${lead.userId}/${lead.localId}.jpg`

    const { error } = await supabase.storage
      .from("lead-photos")
      .upload(filePath, lead.photo, {
        contentType: "image/jpeg",
        upsert: true,
      })

    if (error) continue // Retry no proximo cycle

    const { data } = supabase.storage
      .from("lead-photos")
      .getPublicUrl(filePath)

    // Enqueue update para enviar photoUrl ao servidor
    const now = new Date().toISOString()
    await db.syncQueue.add({
      localId: lead.localId,
      operation: "update",
      payload: JSON.stringify({ photoUrl: data.publicUrl }),
      retryCount: 0,
      timestamp: now,
    })

    // Limpar blob local (URL agora esta no servidor)
    await db.leads.update(lead.localId, { photo: null })
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `new Image()` + onload | `createImageBitmap()` | Safari 15+ (2021) | Async-native, sem callback hell, suporta mais formatos |
| getUserMedia manual + QR decode loop | html5-qrcode library | Stable since 2.x (2022) | Encapsula camera management, permissions, iOS quirks |
| Base64 em localStorage | Blob em IndexedDB (Dexie) | Sempre foi melhor | 33% menos memoria, streaming nativo, sem encoding overhead |
| Supabase Storage v1 (storage-js separado) | Supabase JS v2 (storage integrado) | 2023 | `supabase.storage.from()` — API unificada |

**Deprecated/outdated:**
- `navigator.getUserMedia` (sem s): substituido por `navigator.mediaDevices.getUserMedia`
- html5-qrcode `Html5QrcodeScanner` (UI pronta): funcional mas nao recomendado quando se quer UI custom — usar `Html5Qrcode` diretamente

## Open Questions

1. **Supabase Storage bucket: publico ou privado?**
   - What we know: Fotos de cartao de visita sao dados do vendedor. Bucket publico simplifica (getPublicUrl sem signed URL).
   - What's unclear: Se ha requisito de privacidade para fotos. A UI-SPEC nao menciona.
   - Recommendation: Usar bucket publico com pasta por userId (RLS controla upload, URL publica para leitura). Fotos de cartao nao sao dados sensiveis o suficiente para signed URLs. Se necessario, trocar para bucket privado e usar `createSignedUrl()`.

2. **userId no client: de onde vem?**
   - What we know: O Supabase Auth user ID vem do JWT `sub` claim. O proxy.ts faz getClaims(). No client, existe `createClient()` Supabase.
   - What's unclear: Como acessar o userId no client-side para salvar no Dexie lead.
   - Recommendation: Usar `supabase.auth.getUser()` ou `supabase.auth.getSession()` no client para obter userId. Armazenar em React context ou hook. Alternativa: hook custom `useUserId()` que le da sessao Supabase.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Package management | Verificar | 1.3.11 (configured) | -- |
| @supabase/supabase-js | Photo upload | Instalado | 2.100.0 | -- |
| Dexie | Offline storage | Instalado | 4.3.0 | -- |
| html5-qrcode | QR scanning | Nao instalado | 2.3.8 (npm) | Instalar: `bun add html5-qrcode` |
| shadcn Textarea | Notas field | Nao instalado | -- | `bunx shadcn@latest add textarea` |
| shadcn Collapsible | "Mais detalhes" | Nao instalado | -- | `bunx shadcn@latest add collapsible` |
| Supabase Storage bucket | Photo upload | Nao criado | -- | Criar via Dashboard SQL ou migration |

**Missing dependencies with no fallback:**
- Supabase Storage bucket `lead-photos` precisa ser criado com RLS policies antes de CAPT-06 funcionar.

**Missing dependencies with fallback:**
- html5-qrcode, Textarea, Collapsible: instalacao simples via bun/shadcn.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2 com jsdom environment |
| Config file | `apps/web/vitest.config.ts` |
| Quick run command | `bun vitest run --filter apps/web` |
| Full suite command | `bun run test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAPT-01 | saveLead persiste no Dexie com campos obrigatorios | unit | `bun vitest run apps/web/src/lib/lead/save-lead.test.ts -x` | Wave 0 |
| CAPT-02 | Campos opcionais salvos corretamente (null quando vazio) | unit | `bun vitest run apps/web/src/lib/lead/save-lead.test.ts -x` | Wave 0 |
| CAPT-03 | parseWhatsAppUrl extrai numero de wa.me URLs | unit | `bun vitest run apps/web/src/lib/lead/wa-parser.test.ts -x` | Wave 0 |
| CAPT-04 | Photo capture integration | manual-only | Requer camera real (device fisico) | -- |
| CAPT-05 | compressImage reduz dimensao e gera JPEG | unit | `bun vitest run apps/web/src/lib/lead/compression.test.ts -x` | Wave 0 |
| CAPT-06 | uploadPendingPhotos envia para Supabase Storage | unit (mock) | `bun vitest run apps/web/src/lib/sync/photo-upload.test.ts -x` | Wave 0 |
| CAPT-07 | leadFormSchema valida interestTag enum | unit | `bun vitest run apps/web/src/lib/lead/validation.test.ts -x` | Wave 0 |
| CAPT-08 | saveLead funciona sem network (Dexie-only) | unit | `bun vitest run apps/web/src/lib/lead/save-lead.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bun vitest run apps/web/src/lib/lead/ -x`
- **Per wave merge:** `bun run test`
- **Phase gate:** Full suite green antes de `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/web/src/lib/lead/validation.test.ts` — covers CAPT-01, CAPT-07 (Zod schema)
- [ ] `apps/web/src/lib/lead/wa-parser.test.ts` — covers CAPT-03 (wa.me URL parsing)
- [ ] `apps/web/src/lib/lead/compression.test.ts` — covers CAPT-05 (canvas compress, requer canvas mock no jsdom)
- [ ] `apps/web/src/lib/lead/save-lead.test.ts` — covers CAPT-01, CAPT-02, CAPT-08 (Dexie write)
- [ ] `apps/web/src/lib/sync/photo-upload.test.ts` — covers CAPT-06 (Supabase Storage mock)

## Project Constraints (from CLAUDE.md)

- **Monorepo:** Turborepo 2.8, Bun 1.3 — instalar deps com `bun add`, nao npm
- **Formatting:** Biome 2.4 — rodar `bun run check` apos cada change
- **TypeScript:** strict — sem `any`, tipos explicitos
- **Imports:** path-based de packages/ui (ex: `@dashboard-leads-profills/ui/components/button`), sem barrel files
- **Commits:** Conventional Commits em Portugues
- **TDD:** Red -> Green -> Refactor obrigatorio
- **Security:** Nunca hardcodar secrets. Supabase anon key e publica (NEXT_PUBLIC_*) — ok no client
- **Error handling:** Explicito em todo nivel, nunca engolir erros
- **Functions:** < 50 linhas, nesting < 4 niveis
- **Files:** max 800 linhas
- **Offline-first:** Dexie primeiro, sync engine cuida do push. Nunca network call no submit

## Sources

### Primary (HIGH confidence)
- Codebase existente: `apps/web/src/lib/db/types.ts` (Lead interface com photo: Blob), `packages/db/src/schema/leads.ts` (Drizzle schema com photoUrl), `apps/web/src/lib/sync/engine.ts` (sync engine completa)
- [Supabase Storage Standard Uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads) — upload API, size limits
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) — RLS policies para buckets
- [Supabase Storage Upload API Reference](https://supabase.com/docs/reference/javascript/storage-from-upload) — upload signature, options
- html5-qrcode npm registry — v2.3.8, 2.6MB unpacked, zero deps, Apache-2.0

### Secondary (MEDIUM confidence)
- [html5-qrcode GitHub](https://github.com/mebjas/html5-qrcode) — React integration patterns, iOS Safari considerations
- [WhatsApp wa.me URL format](https://support.wati.io/en/articles/11462980-how-to-create-whatsapp-click-to-chat-links) — URL structure para parser
- [npm-compare QR libraries](https://npm-compare.com/html5-qrcode,jsqr,qr-scanner,qrcode-reader) — bundle size comparison

### Tertiary (LOW confidence)
- Canvas compression patterns from multiple blog posts — confirmado contra MDN docs (createImageBitmap, canvas.toBlob)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — html5-qrcode e a escolha mais pragmatica; Supabase Storage ja instalado; canvas e nativo
- Architecture: HIGH — baseado diretamente no codigo existente de Phase 2, extensao natural
- Pitfalls: HIGH — Safari iOS camera, IndexedDB quota, e RLS policies sao problemas bem documentados
- Validation: MEDIUM — canvas mock no jsdom pode ter limitacoes; testes de camera sao manual-only

**Research date:** 2026-03-24
**Valid until:** 2026-04-23 (stack estavel, sem breaking changes esperados)
