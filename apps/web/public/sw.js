// sw.js — Service Worker para cache de navegacao offline
// Workbox v7.4.0 via CDN (importScripts — unico mecanismo valido em /public)
// NAO e PWA: sem manifest, sem install prompt, sem background sync

importScripts(
	"https://storage.googleapis.com/workbox-cdn/releases/7.4.0/workbox-sw.js"
);

// Build config gerado pelo postbuild — define self.__SW_BUILD_ID com o buildId do Next.js.
// Em dev mode, sw-build.js nao existe — importScripts falha silenciosamente e __SW_BUILD_ID fica undefined.
// O browser compara todos os importScripts ao checar updates de SW, entao mudanca no buildId
// aciona instalacao automatica do SW novo.
try {
	importScripts("/sw-build.js");
} catch {
	// Dev mode — arquivo nao existe
}

const { registerRoute, setCatchHandler } = workbox.routing;
const { NetworkFirst, CacheFirst } = workbox.strategies;
const { precacheAndRoute, matchPrecache } = workbox.precaching;
const { ExpirationPlugin } = workbox.expiration;
const { clientsClaim } = workbox.core;
const { CacheableResponsePlugin } = workbox.cacheableResponse;

// Nomes dos caches — declarados no topo para uso nos handlers install/activate e nas strategies
const STATIC_CACHE = "static-assets-v1";
const RSC_CACHE = "rsc-payloads-v1";

// D-09: ativar imediatamente sem aguardar reload manual
// NOTA: workbox.core.skipWaiting() foi REMOVIDO no v7 — usar self.skipWaiting() diretamente
self.skipWaiting();
clientsClaim();

// ---------------------------------------------------------------------------
// Pre-cache de TODOS os chunks JS/CSS do build via manifest gerado pelo postbuild.
// Sem isso, hard reload offline falha porque precacheAndRoute cacheia apenas o HTML
// das rotas, nao os JS/CSS referenciados nesse HTML.
// Em dev mode, sw-manifest.json nao existe — o .catch() garante install limpo.
// ---------------------------------------------------------------------------
self.addEventListener("install", (event) => {
	event.waitUntil(
		fetch("/sw-manifest.json")
			.then((r) => r.json())
			.then(async (manifest) => {
				const cache = await caches.open(STATIC_CACHE);
				await Promise.allSettled(
					manifest.assets.map((url) =>
						fetch(url).then((resp) => {
							if (resp.ok) {
								return cache.put(url, resp);
							}
						})
					)
				);
			})
			.catch(() => {
				// Manifest nao encontrado (dev mode) — SW instala sem precache de chunks
			})
	);
});

// Limpar chunks obsoletos de deploys anteriores.
// Compara o cache atual com o manifest — remove o que nao esta na lista.
self.addEventListener("activate", (event) => {
	event.waitUntil(
		fetch("/sw-manifest.json")
			.then((r) => r.json())
			.then(async (manifest) => {
				const cache = await caches.open(STATIC_CACHE);
				const keys = await cache.keys();
				const validUrls = new Set(
					manifest.assets.map((a) =>
						new URL(a, self.location.origin).toString()
					)
				);
				for (const key of keys) {
					if (!validUrls.has(key.url)) {
						await cache.delete(key);
					}
				}
			})
			.catch(() => {
				// Manifest indisponivel — manter cache existente
			})
	);
});

// D-01: pre-cache de todas as rotas autenticadas no install
// revision usa o buildId do Next.js (via sw-build.js) para invalidar o cache a cada deploy.
// Em dev mode, fallback para "dev" — precache nao e confiavel em dev de qualquer forma.
const BUILD_REVISION = self.__SW_BUILD_ID || "dev";

precacheAndRoute([
	{ url: "/dashboard", revision: BUILD_REVISION },
	{ url: "/leads", revision: BUILD_REVISION },
	{ url: "/leads/new", revision: BUILD_REVISION },
	{ url: "/admin/leads", revision: BUILD_REVISION },
	{ url: "/admin/users", revision: BUILD_REVISION },
	{ url: "/admin/stats", revision: BUILD_REVISION },
	{ url: "/offline", revision: BUILD_REVISION }, // D-08: pre-cache da pagina de fallback
]);

// Plugin para normalizar URL antes de usar como cache key
// Remove ?_rsc=<random> gerado pelo Next.js App Router em cada navegacao client-side
// Sem isso: cada navegacao cria uma entrada diferente no cache (Pitfall 1 do RESEARCH.md)
const rscUrlNormalizerPlugin = {
	cacheKeyWillBeUsed: async ({ request }) => {
		const url = new URL(request.url);
		url.searchParams.delete("_rsc");
		return url.toString();
	},
};

// D-03: RSC payloads — NetworkFirst (network first, fallback ao cache offline)
// Detectar pelo header RSC: 1 que o App Router envia em toda navegacao client-side
registerRoute(
	({ request }) =>
		request.headers.get("RSC") === "1" || request.headers.get("Rsc") === "1",
	new NetworkFirst({
		cacheName: RSC_CACHE,
		networkTimeoutSeconds: 3,
		// ignoreVary: true — Next.js envia Vary: rsc, next-router-state-tree, Accept-Encoding
		// O request normalizado (sem headers) causaria mismatch no Vary check do Chromium.
		// Ignorar Vary garante que o cache key normalizado seja suficiente para lookup offline.
		matchOptions: {
			ignoreVary: true,
		},
		plugins: [
			rscUrlNormalizerPlugin,
			// CacheableResponsePlugin: garante que respostas 200 sejam armazenadas
			// mesmo que Next.js envie Cache-Control: private (nao e no-store para RSC)
			new CacheableResponsePlugin({ statuses: [0, 200] }),
			new ExpirationPlugin({
				maxEntries: 50,
				maxAgeSeconds: 60 * 60, // 1 hora
			}),
		],
	})
);

// D-04: assets estaticos Next.js — CacheFirst (imutaveis por hash no nome do arquivo)
registerRoute(
	({ url }) => url.pathname.startsWith("/_next/static/"),
	new CacheFirst({
		cacheName: STATIC_CACHE,
		plugins: [
			new ExpirationPlugin({
				maxEntries: 200,
				maxAgeSeconds: 365 * 24 * 60 * 60, // 1 ano
			}),
		],
	})
);

// D-04: fonts Google (carregadas por next/font/google)
registerRoute(
	({ url }) =>
		url.hostname === "fonts.googleapis.com" ||
		url.hostname === "fonts.gstatic.com",
	new CacheFirst({
		cacheName: "google-fonts-v1",
		plugins: [
			new ExpirationPlugin({
				maxEntries: 20,
				maxAgeSeconds: 365 * 24 * 60 * 60,
			}),
		],
	})
);

// D-07: fallback para rotas offline nao cacheadas
setCatchHandler(({ event }) => {
	// Navegacao HTML: servir pagina offline pre-cacheada
	// matchPrecache() resolve a revision key (?__WB_REVISION__=v1) internamente
	// caches.match("/offline") nao funciona porque a cache key inclui o revision suffix
	if (event.request.destination === "document") {
		return matchPrecache("/offline");
	}
	// RSC payload falhou e nao esta em cache:
	// retornar 503 com Content-Type correto — React nao quebra, mantem estado atual
	if (
		event.request.headers.get("RSC") === "1" ||
		event.request.headers.get("Rsc") === "1"
	) {
		return new Response("", {
			status: 503,
			headers: { "Content-Type": "text/x-component" },
		});
	}
	return Response.error();
});
