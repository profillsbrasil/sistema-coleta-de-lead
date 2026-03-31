"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
	useEffect(() => {
		if (!("serviceWorker" in navigator)) {
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
				if (process.env.NODE_ENV !== "production") {
					console.error("Service worker registration failed", error);
				}
			}
		}

		registerServiceWorker();

		return () => {
			cancelled = true;
		};
	}, []);

	return null;
}
