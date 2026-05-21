# 06 - Frontend: Landing do Sorteio e QR Code

A landing é o que o cliente vê após escanear o QR Code. Função: informar sobre o sorteio e oferecer o botão "Participar" que abre o WhatsApp com mensagem pré-preenchida.

## Decisão de arquitetura: QR aponta para a landing OU direto para `wa.me`?

**Recomendação: QR aponta para a LANDING**, e a landing tem o botão `wa.me`.

| Critério | QR → Landing | QR → wa.me direto |
|---|---|---|
| Flexibilidade pós-impressão | ✅ Mude regras sem reimprimir | ❌ Locked |
| Branding e UX | ✅ Mostra info do evento | ❌ Abre WhatsApp sem contexto |
| Analytics | ✅ Vercel Analytics no acesso | ❌ Nada |
| Cliques a mais | ❌ 1 clique extra | ✅ Direto |
| Iframe/preview na câmera | ✅ Preview rico | ❌ Só URL crua |

Para 200 pessoas, 1 clique a mais é irrelevante. O ganho de flexibilidade compensa.

## Como construir o link `wa.me`

Formato canônico documentado pela WhatsApp Help Center:

```
https://wa.me/{phone}?text={urlencoded_text}
```

Regras estritas:
- `{phone}`: telefone internacional **sem `+`, sem `0` à esquerda, sem hífens, sem parênteses, sem espaços**
- Brasil: `55` + DDD + número = ex: `5511987654321`
- `{urlencoded_text}`: passe pelo `encodeURIComponent`

```ts
const phone = process.env.NEXT_PUBLIC_EVENT_WHATSAPP_NUMBER!; // "5511987654321"
const message = "[SORTEIO2026] Quero participar do sorteio da Festa Anual";
const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
```

**Dica importante**: padronize com um prefixo (`[SORTEIO2026]`). Isso permite:
- Identificar no webhook se é um participante novo ou alguém aleatório chamando o número
- Filtrar facilmente nos logs
- Versionamento de campanha (`[SORTEIO2027]` no próximo evento)

## Implementação da landing

Arquivo: `app/sorteio/page.tsx` (ou onde fizer sentido no seu projeto)

```tsx
import Link from "next/link";

// Variáveis públicas (com NEXT_PUBLIC_) são embutidas no bundle do cliente.
// Não coloque secrets aqui.
const PHONE = process.env.NEXT_PUBLIC_EVENT_WHATSAPP_NUMBER!;
const EVENT_NAME = process.env.NEXT_PUBLIC_EVENT_NAME ?? "Sorteio";
const INITIAL_MESSAGE = `[SORTEIO2026] Quero participar do sorteio de ${EVENT_NAME}`;

export const metadata = {
  title: `Sorteio • ${EVENT_NAME}`,
  description: "Participe do nosso sorteio via WhatsApp",
};

export default function SorteioPage() {
  const waLink = `https://wa.me/${PHONE}?text=${encodeURIComponent(INITIAL_MESSAGE)}`;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-purple-900 via-indigo-900 to-black text-white">
      {/* Logo / título */}
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-4xl font-bold mb-2">{EVENT_NAME}</h1>
        <p className="text-lg text-purple-200 mb-8">
          Participe do nosso sorteio exclusivo!
        </p>

        {/* Como funciona */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-8 text-left">
          <h2 className="font-bold text-lg mb-3">Como participar:</h2>
          <ol className="space-y-2 text-sm">
            <li>1. Toque no botão abaixo</li>
            <li>2. Envie a mensagem pré-preenchida no WhatsApp</li>
            <li>3. Aceite os termos e informe nome + e-mail</li>
            <li>4. Receba seu código exclusivo de participação</li>
          </ol>
        </div>

        {/* CTA principal */}
        <Link
          href={waLink}
          className="inline-flex items-center justify-center gap-3 bg-green-500 hover:bg-green-600 active:bg-green-700 transition-colors px-8 py-4 rounded-full text-xl font-bold shadow-lg shadow-green-500/30 w-full"
        >
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Participar pelo WhatsApp
        </Link>

        {/* Aviso LGPD curto */}
        <p className="text-xs text-purple-200/70 mt-6 leading-relaxed">
          Ao continuar, você verá os termos de uso e a política de privacidade
          (LGPD) na primeira mensagem do WhatsApp. Sem aceite, não há
          cadastro.
        </p>

        {/* Rodapé */}
        <p className="text-xs text-purple-300/50 mt-8">
          Sorteio organizado por {EVENT_NAME}. Realizado durante o evento.
        </p>
      </div>
    </main>
  );
}
```

## Variáveis de ambiente para o frontend

No `.env.local`:

```bash
NEXT_PUBLIC_EVENT_WHATSAPP_NUMBER=5511987654321
NEXT_PUBLIC_EVENT_NAME=Festa Anual 2026
```

⚠️ Variáveis com `NEXT_PUBLIC_` são embutidas no bundle do cliente — **não coloque secrets aí** (como `WHATSAPP_ACCESS_TOKEN`).

## Geração do QR Code

### Opção A: Gerador online (recomendado para evento único)

1. Acesse <https://qr-code-generator.com> ou <https://www.qrcode-monkey.com>
2. Cole a URL final: `https://seu-projeto.vercel.app/sorteio`
3. Configure:
   - **Error correction**: H (30%) — resistente a manchas/dobras
   - **Tamanho mínimo**: 1024×1024 px para banner impresso
   - **Logo no centro**: opcional, mas reduz capacidade de dados
4. Baixe em PNG ou SVG

### Opção B: Programaticamente com `qrcode`

Útil se for gerar múltiplos QR Codes (vários eventos, vários códigos rastreáveis).

Instalar:
```bash
npm install qrcode
npm install -D @types/qrcode
```

Script: `scripts/generate-qr.ts`

```ts
import QRCode from "qrcode";
import path from "path";

const TARGET_URL = "https://seu-projeto.vercel.app/sorteio";
const OUTPUT_PATH = path.join(process.cwd(), "public", "qr-evento.png");

async function main() {
  await QRCode.toFile(OUTPUT_PATH, TARGET_URL, {
    errorCorrectionLevel: "H", // 30% redundância
    width: 1024,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
  console.log(`✅ QR Code salvo em ${OUTPUT_PATH}`);
}

main().catch(console.error);
```

Executar:
```bash
npx tsx scripts/generate-qr.ts
```

### Opção C: Gerar dinamicamente no frontend (para múltiplos códigos)

Se cada participante recebe um QR Code com código embutido (ex: ingresso digital):

```tsx
"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrDinamico({ codigo }: { codigo: string }) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    QRCode.toDataURL(`https://seu-projeto.vercel.app/validar?c=${codigo}`, {
      errorCorrectionLevel: "H",
      width: 512,
    }).then(setDataUrl);
  }, [codigo]);

  return <img src={dataUrl} alt={`QR ${codigo}`} className="w-64 h-64" />;
}
```

### Sobre tamanho do QR Code impresso

Regra prática: distância de leitura ÷ 10 = tamanho mínimo do QR.

- Mesa (50 cm de leitura): QR ≥ 5 cm × 5 cm
- Parede (3 m de leitura): QR ≥ 30 cm × 30 cm
- Outdoor (10 m): QR ≥ 1 m × 1 m

Banner de evento de pé em mesa? Use 10-15 cm de lado.

## Teste do QR Code antes de imprimir

1. Gere o QR
2. Abra no celular pela câmera
3. Confirme que abre a landing correta
4. Clique no botão "Participar" → confirma que abre o WhatsApp com mensagem certa
5. Repita com 3 celulares diferentes (iOS recente, Android recente, Android antigo)
6. Teste em luz baixa/alta

## SEO e Open Graph (para compartilhamento)

Se a landing puder ser compartilhada em redes sociais antes do evento:

```tsx
export const metadata = {
  title: "Festa Anual 2026 • Sorteio Exclusivo",
  description: "Participe do nosso sorteio durante o evento. Cadastro via WhatsApp.",
  openGraph: {
    title: "Festa Anual 2026 • Sorteio",
    description: "Cadastre-se agora pelo WhatsApp",
    images: ["/og-image.png"], // 1200×630
  },
  robots: {
    index: false, // se for landing de evento privado, não indexar
  },
};
```

## Tratamento mobile-first

O 95% dos acessos virá de celular (escaneamento via câmera). Garantias:

- Botão grande e fácil de tocar (mínimo 44×44 pt de área tocável)
- Texto legível sem zoom (mínimo 16px)
- Sem hover-only interactions
- Fundo escuro economiza bateria em OLED

A implementação acima já segue mobile-first com Tailwind.

## Componente do botão isolado (reutilizável)

Caso queira reaproveitar em outras páginas do projeto existente:

```tsx
// components/whatsapp-button.tsx
import Link from "next/link";

interface WhatsAppButtonProps {
  phone: string;        // E.164 sem +
  message: string;      // Texto pré-preenchido
  children?: React.ReactNode;
  className?: string;
}

export function WhatsAppButton({
  phone,
  message,
  children = "Falar no WhatsApp",
  className = "",
}: WhatsAppButtonProps) {
  const link = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return (
    <Link
      href={link}
      className={`inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full font-semibold ${className}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      💬 {children}
    </Link>
  );
}
```

Uso:
```tsx
<WhatsAppButton
  phone="5511987654321"
  message="[SORTEIO2026] Quero participar"
>
  Participar do Sorteio
</WhatsAppButton>
```

## Checklist da Fase 6 (Frontend)

- [ ] Página `app/sorteio/page.tsx` (ou onde fizer sentido no projeto)
- [ ] Variáveis `NEXT_PUBLIC_EVENT_WHATSAPP_NUMBER` e `NEXT_PUBLIC_EVENT_NAME` no `.env.local`
- [ ] Link `wa.me` construído corretamente (E.164 sem `+`, `encodeURIComponent` no texto)
- [ ] Mensagem inicial com prefixo identificador (`[SORTEIO2026]`)
- [ ] QR Code gerado (online ou via script)
- [ ] QR Code testado em pelo menos 3 celulares
- [ ] Tamanho impresso adequado à distância de leitura
- [ ] (Opcional) Metadados OG para compartilhamento
- [ ] (Opcional) `robots: { index: false }` se for evento privado

Próximo: `references/07-lgpd-compliance.md` para os termos.
