// sw.js — Service Worker para cache de navegacao offline
// Workbox v7.4.0 via CDN (importScripts — unico mecanismo valido em /public)
// NAO e PWA: sem manifest, sem install prompt, sem background sync

importScripts(
	"https://storage.googleapis.com/workbox-cdn/releases/7.4.0/workbox-sw.js"
);

const { registerRoute, setCatchHandler } = workbox.routing;
const { NetworkFirst, CacheFirst } = workbox.strategies;
const { precacheAndRoute } = workbox.precaching;
const { ExpirationPlugin } = workbox.expiration;
const { clientsClaim } = workbox.core;
const { CacheableResponsePlugin } = workbox.cacheableResponse;

// D-09: ativar imediatamente sem aguardar reload manual
// NOTA: workbox.core.skipWaiting() foi REMOVIDO no v7 — usar self.skipWaiting() diretamente
self.skipWaiting();
clientsClaim();

// D-01: pre-cache de todas as rotas autenticadas no install
// revision: "v1" — atualizar ao mudar o app shell para invalidar o cache
precacheAndRoute([
	{ url: "/dashboard", revision: "v1" },
	{ url: "/leads", revision: "v1" },
	{ url: "/leads/new", revision: "v1" },
	{ url: "/admin/leads", revision: "v1" },
	{ url: "/admin/users", revision: "v1" },
	{ url: "/admin/stats", revision: "v1" },
	{ url: "/offline", revision: "v1" }, // D-08: pre-cache da pagina de fallback
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

const RSC_CACHE = "rsc-payloads-v1";

// D-03: RSC payloads — NetworkFirst (network first, fallback ao cache offline)
// Detectar pelo header RSC: 1 que o App Router envia em toda navegacao client-side
registerRoute(
	({ request }) =>
		request.headers.get("RSC") === "1" ||
		request.headers.get("Rsc") === "1",
	new NetworkFirst({
		cacheName: RSC_CACHE,
		networkTimeoutSeconds: 3,
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

const STATIC_CACHE = "static-assets-v1";

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
	// Navegacao HTML: servir pagina offline
	if (event.request.destination === "document") {
		return caches.match("/offline");
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
