/**
 * Remove o parametro `_rsc` de uma URL para uso como cache key normalizada.
 *
 * O Next.js App Router adiciona `?_rsc=<random>` em cada navegacao client-side.
 * Sem normalizacao, cada navegacao cria uma entrada diferente no cache,
 * impedindo o reuso de RSC payloads cacheados offline.
 */
export function normalizeRscUrl(urlString: string): string {
	const url = new URL(urlString);
	url.searchParams.delete("_rsc");
	return url.toString();
}
