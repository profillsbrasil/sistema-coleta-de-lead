"use client";

import { Toaster } from "@dashboard-leads-profills/ui/components/sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect } from "react";

import { queryClient } from "@/utils/trpc";

import { ThemeProvider } from "./theme-provider";

function SyncInitializer() {
	useEffect(() => {
		let cleanup: (() => void) | undefined;

		async function init() {
			const { startSync } = await import("@/lib/sync/engine");
			cleanup = startSync();
		}

		init();
		return () => cleanup?.();
	}, []);

	return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="system"
			disableTransitionOnChange
			enableSystem
		>
			<QueryClientProvider client={queryClient}>
				{children}
				<SyncInitializer />
				<ReactQueryDevtools />
			</QueryClientProvider>
			<Toaster richColors />
		</ThemeProvider>
	);
}
