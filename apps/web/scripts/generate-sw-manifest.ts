/**
 * generate-sw-manifest.ts
 *
 * Script pos-build que le .next/static/ e gera public/sw-manifest.json
 * com todos os chunks JS/CSS para o Service Worker precachear no install.
 *
 * Execucao: bun scripts/generate-sw-manifest.ts
 * Integrado automaticamente via "postbuild" no package.json.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1MB — evita precache de chunks gigantes
const ALLOWED_EXTENSIONS = new Set([".js", ".css"]);

const webDir = join(import.meta.dirname, "..");
const nextOutputDir = join(webDir, ".next");
const staticDir = join(nextOutputDir, "static");
const manifestPath = join(webDir, "public", "sw-manifest.json");
const buildConfigPath = join(webDir, "public", "sw-build.js");

function collectAssets(dir: string): string[] {
	const assets: string[] = [];

	const entries = readdirSync(dir, { recursive: true, encoding: "utf-8" });

	for (const entry of entries) {
		const fullPath = join(dir, entry);

		// Pular diretorios (readdir recursive retorna tanto arquivos quanto dirs)
		let stat: ReturnType<typeof statSync> | undefined;
		try {
			stat = statSync(fullPath);
		} catch {
			continue;
		}

		if (!stat.isFile()) {
			continue;
		}

		// Filtrar por extensao — apenas .js e .css
		const hasValidExtension = [...ALLOWED_EXTENSIONS].some((ext) =>
			entry.endsWith(ext)
		);
		if (!hasValidExtension) {
			continue;
		}

		// Ignorar source maps disfarçados e arquivos grandes demais
		if (entry.endsWith(".map.js") || entry.endsWith(".map.css")) {
			continue;
		}

		if (stat.size > MAX_FILE_SIZE_BYTES) {
			continue;
		}

		// Converter path relativo para URL: /_next/static/chunks/abc123.js
		const relativePath = relative(nextOutputDir, fullPath);
		const urlPath = `/_next/${relativePath}`;

		assets.push(urlPath);
	}

	return assets.sort();
}

// Ler BUILD_ID para versionamento do cache
let buildId = "unknown";
try {
	buildId = readFileSync(join(nextOutputDir, "BUILD_ID"), "utf-8").trim();
} catch {
	console.warn("WARN: .next/BUILD_ID nao encontrado — usando 'unknown'");
}

const assets = collectAssets(staticDir);

const manifest = {
	buildId,
	generatedAt: new Date().toISOString(),
	assetCount: assets.length,
	assets,
};

writeFileSync(manifestPath, JSON.stringify(manifest, null, "\t"));

// Gerar sw-build.js com o buildId para o Service Worker usar como revision.
// importScripts("/sw-build.js") no sw.js carrega este arquivo.
// O browser compara TODOS os scripts importados ao checar updates de SW,
// entao mudar o buildId aqui aciona instalacao do SW novo automaticamente.
writeFileSync(
	buildConfigPath,
	`// Gerado automaticamente pelo postbuild — NAO editar manualmente\nself.__SW_BUILD_ID = "${buildId}";\n`
);

console.log(
	`sw-manifest.json + sw-build.js gerados: ${assets.length} assets (buildId: ${buildId})`
);
