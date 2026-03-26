---
phase: 03-lead-capture
verified: 2026-03-24T22:55:00Z
status: human_needed
score: 12/12 must-haves verified
human_verification:
  - test: "Verificar layout visual do formulario de captura em mobile"
    expected: "Campos nome, telefone+QR, email, tags (3 cores oklch), foto, Mais detalhes colapsavel, Salvar Lead"
    why_human: "Layout visual, cores oklch, responsividade mobile nao verificaveis por grep"
  - test: "Testar QR scanner com camera real em dispositivo fisico"
    expected: "Camera abre, escaneia QR wa.me, preenche telefone automaticamente, fecha overlay"
    why_human: "Requer camera fisica e QR code real para validar html5-qrcode integration"
  - test: "Testar captura de foto com camera nativa"
    expected: "Camera nativa abre, foto capturada aparece como preview 80x80px, botao remover funciona"
    why_human: "Requer dispositivo com camera para validar input[capture=environment]"
  - test: "Testar fluxo offline completo"
    expected: "Desabilitar rede, criar lead, toast 'Lead salvo!', reabilitar rede, lead sincroniza"
    why_human: "Requer manipulacao de conectividade e observacao do sync cycle"
  - test: "Verificar upload de foto para Supabase Storage"
    expected: "Foto aparece no bucket lead-photos apos sync com rede ativa"
    why_human: "Requer Supabase Storage bucket configurado e conectividade real"
---

# Phase 03: Lead Capture Verification Report

**Phase Goal:** Vendedor consegue criar um lead em menos de 3 toques, com suporte a QR code do WhatsApp e foto do cartao de visita, tudo funcionando offline
**Verified:** 2026-03-24T22:55:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Zod schema valida nome obrigatorio, phone/email (pelo menos um), interestTag enum | VERIFIED | `validation.ts` lines 3-17: `.min(1)`, `.refine()`, `.enum(["quente","morno","frio"])`. 7 tests passing. |
| 2 | parseWhatsAppUrl extrai numero de telefone de URLs wa.me | VERIFIED | `wa-parser.ts` lines 1-10: regex + `+` prefix. 6 tests passing. |
| 3 | compressImage reduz imagem para max 1280px JPEG 0.7 | VERIFIED | `compression.ts` lines 1-55: `MAX_DIMENSION=1280`, `JPEG_QUALITY=0.7`, canvas resize. 5 tests passing. |
| 4 | saveLead persiste lead no Dexie e adiciona operacao na syncQueue | VERIFIED | `save-lead.ts` lines 16-50: `db.leads.add` + `db.syncQueue.add` com `syncStatus: "pending"`. 7 tests passing. |
| 5 | Pagina /leads/new renderiza formulario de captura de lead | VERIFIED | `app/leads/new/page.tsx` imports e renderiza `LeadForm`. `lead-form.tsx` tem 341 linhas com form completo. |
| 6 | Formulario tem campos vissiveis e campos opcionais colapsados | VERIFIED | `lead-form.tsx` lines 150-315: Nome, Telefone, Email vissiveis. Collapsible "Mais detalhes" com empresa, cargo, segmento, notas. |
| 7 | Tag selector com 3 opcoes (quente/morno/frio) e default morno | VERIFIED | `tag-selector.tsx` lines 13-29: TAG_CONFIG com oklch colors. `lead-form.tsx` line 44: `useState<InterestTag>("morno")`. role="radiogroup" + role="radio". |
| 8 | Submit salva lead no Dexie via saveLead (offline-first) | VERIFIED | `lead-form.tsx` line 115: `await saveLead(result.data, userId, photo)`. Nenhum network call no submit handler. |
| 9 | QR code wa.me detectado preenche automaticamente o campo telefone | VERIFIED | `qr-scanner.tsx` line 34: `parseWhatsAppUrl(decodedText)`. `lead-form.tsx` lines 331-338: `QRScanner` com `onScan` que chama `setPhone`. |
| 10 | Foto comprimida antes de armazenar | VERIFIED | `photo-capture.tsx` line 45: `compressImage(file)`. Wired em `lead-form.tsx` lines 247-251. |
| 11 | Fotos de leads sincronizados sao uploaded para Supabase Storage | VERIFIED | `photo-upload.ts` lines 5-49: filtra leads com photo+serverId, upload para bucket "lead-photos", clear blob, enqueue update. 7 tests passing. |
| 12 | Sync engine executa photo upload apos pushChanges | VERIFIED | `engine.ts` line 9: import `uploadPendingPhotos`. Line 166: chamada entre push e pull com try-catch isolation. |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/src/lib/lead/validation.ts` | Zod schema + LeadFormData type | VERIFIED | 19 lines, exports leadFormSchema + LeadFormData |
| `apps/web/src/lib/lead/wa-parser.ts` | parseWhatsAppUrl function | VERIFIED | 10 lines, regex parse + null handling |
| `apps/web/src/lib/lead/compression.ts` | compressImage + calculateDimensions | VERIFIED | 55 lines, canvas resize logic |
| `apps/web/src/lib/lead/save-lead.ts` | saveLead (Dexie write + syncQueue) | VERIFIED | 53 lines, db.leads.add + db.syncQueue.add |
| `apps/web/src/app/leads/new/page.tsx` | Server component wrapper | VERIFIED | 5 lines, imports LeadForm |
| `apps/web/src/components/lead-form.tsx` | Complete lead capture form | VERIFIED | 341 lines, validation, save, QR, photo, collapsible |
| `apps/web/src/components/tag-selector.tsx` | 3-button toggle with oklch colors | VERIFIED | 66 lines, radiogroup pattern |
| `apps/web/src/components/fab.tsx` | FAB linking to /leads/new | VERIFIED | 21 lines, fixed position, Plus icon |
| `apps/web/src/components/qr-scanner.tsx` | Full-screen QR scanner overlay | VERIFIED | 121 lines, html5-qrcode, parseWhatsAppUrl |
| `apps/web/src/components/photo-capture.tsx` | Photo capture + compression + preview | VERIFIED | 112 lines, input[capture], compressImage, 80x80 preview |
| `apps/web/src/lib/sync/photo-upload.ts` | uploadPendingPhotos function | VERIFIED | 49 lines, Supabase Storage upload pipeline |
| `apps/web/src/lib/sync/photo-upload.test.ts` | Unit tests for photo upload | VERIFIED | 7 tests passing |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| lead-form.tsx | save-lead.ts | saveLead() on submit | WIRED | Line 115: `await saveLead(result.data, userId, photo)` |
| lead-form.tsx | validation.ts | leadFormSchema.safeParse | WIRED | Line 89: `leadFormSchema.safeParse({...})` |
| lead-form.tsx | qr-scanner.tsx | QRScanner component | WIRED | Lines 331-338: `<QRScanner>` with onScan callback |
| lead-form.tsx | photo-capture.tsx | PhotoCapture component | WIRED | Lines 247-251: `<PhotoCapture>` with onCapture/onRemove |
| qr-scanner.tsx | wa-parser.ts | parseWhatsAppUrl | WIRED | Line 34: `parseWhatsAppUrl(decodedText)` |
| photo-capture.tsx | compression.ts | compressImage | WIRED | Line 45: `await compressImage(file)` |
| save-lead.ts | db/index.ts | db.leads.add + db.syncQueue.add | WIRED | Lines 16, 35: both Dexie calls present |
| engine.ts | photo-upload.ts | uploadPendingPhotos() | WIRED | Line 166: called after pushChanges |
| photo-upload.ts | supabase/client.ts | storage.from('lead-photos').upload | WIRED | Lines 23-28: upload to "lead-photos" bucket |
| photo-upload.ts | db/index.ts | db.leads + db.syncQueue | WIRED | Lines 39, 47: syncQueue.add + leads.update |
| fab.tsx | /leads/new | Link href | WIRED | Line 11: `href={LEADS_NEW_HREF}` (/leads/new) |
| dashboard/page.tsx | fab.tsx | FAB component | WIRED | Import + render confirmed via grep |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| lead-form.tsx | userId | supabase.auth.getUser() | Real auth session | FLOWING |
| lead-form.tsx | form fields | useState (user input) | User-driven | FLOWING |
| save-lead.ts | lead data | LeadFormData + userId | Dexie persistence | FLOWING |
| photo-upload.ts | candidates | db.leads.filter() | Dexie query with conditions | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Lead utility tests | `bun vitest run apps/web/src/lib/lead/` | 25/25 tests passing | PASS |
| Photo upload tests | `bun vitest run apps/web/src/lib/sync/photo-upload.test.ts` | 7/7 tests passing | PASS |
| validation.ts exports leadFormSchema | grep -q "leadFormSchema" validation.ts | Found | PASS |
| save-lead.ts writes to Dexie | grep "db.leads.add" save-lead.ts | Found line 16 | PASS |
| engine.ts integrates photo upload | grep "uploadPendingPhotos" engine.ts | Import line 9, call line 166 | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CAPT-01 | 01, 02 | Formulario rapido (nome, telefone/email, interesse) | SATISFIED | lead-form.tsx com validation.ts Zod schema |
| CAPT-02 | 02 | Campos opcionais: empresa, cargo, segmento, notas | SATISFIED | Collapsible "Mais detalhes" em lead-form.tsx lines 254-314 |
| CAPT-03 | 03 | QR Code WhatsApp auto-preenche telefone | SATISFIED | qr-scanner.tsx + parseWhatsAppUrl + onScan callback |
| CAPT-04 | 03 | Foto (cartao, cracha) anexada ao lead | SATISFIED | photo-capture.tsx com input[capture=environment] |
| CAPT-05 | 01, 03 | Foto comprimida (max 1280px, JPEG 0.7) | SATISFIED | compression.ts com MAX_DIMENSION=1280, JPEG_QUALITY=0.7 |
| CAPT-06 | 04 | Foto sincronizada para Supabase Storage | SATISFIED | photo-upload.ts upload pipeline + engine.ts integration |
| CAPT-07 | 01, 02 | Tag de interesse (quente, morno, frio) | SATISFIED | tag-selector.tsx com 3 botoes oklch + default morno |
| CAPT-08 | 01, 02 | 100% offline -- Dexie primeiro | SATISFIED | saveLead writes to Dexie only, no network calls in form submit |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| -- | -- | Nenhum anti-pattern encontrado | -- | -- |

No TODO/FIXME/placeholder patterns found. No empty implementations. No hardcoded empty data. The `return null` in wa-parser.ts and qr-scanner.tsx are legitimate control flow (non-matching URL, component not open).

### Human Verification Required

### 1. Layout visual do formulario em mobile

**Test:** Abrir /leads/new em Chrome/Safari mobile e verificar layout
**Expected:** Campos empilhados, tag selector com 3 cores semanticas (oklch), foto section, Mais detalhes colapsavel, botao Salvar full-width
**Why human:** Cores oklch, responsividade, e disposicao visual nao verificaveis programaticamente

### 2. QR scanner com camera real

**Test:** Tocar no icone QR ao lado do telefone, permitir camera, escanear QR wa.me
**Expected:** Overlay abre, camera liga, QR detectado preenche telefone, overlay fecha, toast "Telefone detectado"
**Why human:** Requer camera fisica e QR code real

### 3. Captura de foto com camera nativa

**Test:** Tocar "Tirar foto", tirar foto com camera, verificar preview
**Expected:** Camera nativa abre, foto aparece como preview 80x80px, botao X remove foto
**Why human:** Requer dispositivo com camera e interacao nativa

### 4. Fluxo offline completo

**Test:** Desabilitar rede no dispositivo, criar lead, reabilitar rede
**Expected:** Lead salva com sucesso offline (toast "Lead salvo!"), sync automatico quando rede volta
**Why human:** Requer manipulacao de conectividade real

### 5. Upload de foto para Supabase Storage

**Test:** Criar lead com foto, aguardar sync, verificar bucket no Supabase Dashboard
**Expected:** Foto aparece em lead-photos/{userId}/{localId}.jpg
**Why human:** Requer Supabase Storage bucket configurado com RLS policies

### Gaps Summary

Nenhum gap automatizado encontrado. Todos os 12 truths verificados, todos os 12 artifacts substantivos e wired, todas as 12 key links conectadas, todos os 8 requirements CAPT-01 a CAPT-08 satisfeitos. 32 testes unitarios passando (25 lead utilities + 7 photo upload).

A verificacao humana e necessaria para confirmar comportamento em dispositivo fisico (camera, QR, offline, sync) e validacao visual do layout.

---

_Verified: 2026-03-24T22:55:00Z_
_Verifier: Claude (gsd-verifier)_
