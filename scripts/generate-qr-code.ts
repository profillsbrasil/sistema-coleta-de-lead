#!/usr/bin/env bun
/**
 * Gera PNG do QR Code apontando para wa.me com texto pré-preenchido.
 *
 * Uso:
 *   bun scripts/generate-qr-code.ts
 *
 * Variáveis lidas de apps/web/.env (mesmo arquivo do bot):
 *   - NEXT_PUBLIC_EVENT_WHATSAPP_NUMBER (E.164 sem +)
 *   - NEXT_PUBLIC_EVENT_NAME
 */
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "dotenv";
import * as qrcode from "qrcode";

config({ path: resolve(import.meta.dirname, "../apps/web/.env") });

const number = process.env.NEXT_PUBLIC_EVENT_WHATSAPP_NUMBER;
const eventName =
	process.env.NEXT_PUBLIC_EVENT_NAME ?? "Sorteio Profills Fispal 2026";

if (!number) {
	console.error(
		"Falta NEXT_PUBLIC_EVENT_WHATSAPP_NUMBER em apps/web/.env (formato E.164 sem +, ex: 5511999990000)"
	);
	process.exit(1);
}

const text = encodeURIComponent(eventName);
const url = `https://wa.me/${number}?text=${text}`;

const outputPath = resolve(import.meta.dirname, "../qr-code-sorteio.png");

await qrcode.toFile(outputPath, url, {
	width: 1024,
	margin: 2,
	errorCorrectionLevel: "H",
	color: { dark: "#0E1A2B", light: "#FFFFFF" },
});

console.log(`QR Code gerado em: ${outputPath}`);
console.log(`URL embarcada: ${url}`);
