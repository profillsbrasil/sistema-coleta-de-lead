"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
	useEffect(() => {
		if (!("serviceWorker" in navigator)) return;

		import("workbox-window").then(({ Workbox }) => {
			const wb = new Workbox("/sw.js");

			// D-09: quando nova versao do SW esta waiting, ativar imediatamente
			wb.addEventListener("waiting", () => {
				wb.messageSkipWaiting();
			});

			wb.register();
		});
	}, []);

	return null;
}
