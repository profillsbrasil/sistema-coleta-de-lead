"use client";

import { useEffect } from "react";

async function unregisterAllServiceWorkers(): Promise<void> {
	try {
		const registrations = await navigator.serviceWorker.getRegistrations();
		await Promise.all(registrations.map((reg) => reg.unregister()));
	} catch {
		// cleanup e best-effort — falhas nao podem quebrar o boot
	}
}

async function clearAllCaches(): Promise<void> {
	if (typeof caches === "undefined") {
		return;
	}
	try {
		const keys = await caches.keys();
		await Promise.all(keys.map((key) => caches.delete(key)));
	} catch {
		// cleanup e best-effort — falhas nao podem quebrar o boot
	}
}

export function ServiceWorkerRegistrar() {
	useEffect(() => {
		if (!("serviceWorker" in navigator)) {
			return;
		}

		// Em dev NAO registramos o SW. Turbopack regenera chunks com hash a cada HMR;
		// um SW com CacheFirst causa "module factory is not available" em módulos com
		// chunks versionados (ex: better-auth, supabase-js).
		// Tambem fazemos cleanup ativo de SW/caches antigos pra usuarios que ja tinham
		// o SW dev instalado antes deste fix — sem precisar de hard reload manual.
		if (process.env.NODE_ENV !== "production") {
			unregisterAllServiceWorkers().then(clearAllCaches);
			return;
		}

		let cancelled = false;

		async function registerServiceWorker() {
			try {
				const { Workbox } = await import("workbox-window");
				if (cancelled) {
					return;
				}

				const wb = new Workbox("/sw.js");

				// D-09: quando nova versao do SW esta waiting, ativar imediatamente
				wb.addEventListener("waiting", () => {
					wb.messageSkipWaiting();
				});

				await wb.register();
			} catch (error) {
				console.error("Service worker registration failed", error);
			}
		}

		registerServiceWorker();

		return () => {
			cancelled = true;
		};
	}, []);

	return null;
}
