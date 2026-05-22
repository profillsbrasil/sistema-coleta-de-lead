"use client";

import { Toaster } from "@dashboard-leads-profills/ui/components/sonner";
import { useIsMobile } from "@dashboard-leads-profills/ui/hooks/use-mobile";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { queryClient } from "@/utils/trpc";

import { ThemeProvider } from "./theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
	const isMobile = useIsMobile();

	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="dark"
			disableTransitionOnChange
			enableSystem
		>
			<QueryClientProvider client={queryClient}>
				{children}
				<ReactQueryDevtools />
			</QueryClientProvider>
			<Toaster position={isMobile ? "top-center" : "bottom-right"} richColors />
		</ThemeProvider>
	);
}
