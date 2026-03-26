# Phase 3: Lead Capture - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 03-lead-capture
**Areas discussed:** Formulario rapido, QR scan WhatsApp, Foto de cartao, Tag de interesse

---

## Formulario rapido

| Option | Description | Selected |
|--------|-------------|----------|
| Pagina dedicada /leads/new | FAB no dashboard leva para form full-screen | ✓ |
| Bottom sheet sobre o dashboard | Desliza de baixo | |
| Modal centrado | Overlay | |

**User's choice:** Pagina dedicada /leads/new

| Option | Description | Selected |
|--------|-------------|----------|
| 3 toques = FAB + preencher + salvar | Tag default morno, opcionais colapsados | ✓ |
| 3 toques literal | Auto-advance entre campos | |
| Nao precisa ser literal | Aspiracional, sem otimizacao forcada | |

**User's choice:** 3 toques = FAB + preencher + salvar

| Option | Description | Selected |
|--------|-------------|----------|
| Colapsados | 'Mais detalhes' expande opcionais | ✓ |
| Todos visiveis | Scroll longo | |
| Tabs: rapido vs completo | Duas abas | |

**User's choice:** Colapsados

---

## QR scan WhatsApp

| Option | Description | Selected |
|--------|-------------|----------|
| Camera via JS library | html5-qrcode ou similar, camera inline | ✓ |
| Camera nativa do dispositivo | App de camera do celular | |
| Input manual da URL | Colar URL | |

**User's choice:** Camera via JS library

| Option | Description | Selected |
|--------|-------------|----------|
| Botao dentro do form | Icone QR ao lado do campo telefone | ✓ |
| Botao separado no dashboard | Entry point separado | |
| You decide | Claude escolhe | |

**User's choice:** Botao dentro do form

---

## Foto de cartao

| Option | Description | Selected |
|--------|-------------|----------|
| Camera direto via input capture | <input type="file" capture="environment"> | ✓ |
| Camera inline via getUserMedia | Stream live | |
| File picker sem camera | Galeria | |

**User's choice:** Camera direto via input capture

| Option | Description | Selected |
|--------|-------------|----------|
| Uma foto | Um lead = uma foto | ✓ |
| Multiplas fotos | Galeria por lead | |
| You decide | Claude escolhe | |

**User's choice:** Uma foto

---

## Tag de interesse

| Option | Description | Selected |
|--------|-------------|----------|
| 3 botoes toggle com cor | Quente (vermelho), Morno (amarelo), Frio (azul) | ✓ |
| Segmented control | Estilo iOS | |
| Dropdown | Select com 3 opcoes | |

**User's choice:** 3 botoes toggle com cor, default morno

---

## Claude's Discretion

- Biblioteca de QR scan
- Compressao de imagem (canvas)
- FAB design
- Form validation UX
- Supabase Storage upload integration

## Deferred Ideas

None
