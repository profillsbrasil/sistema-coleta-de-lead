import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import Providers from "@/components/providers";
import "../index.css";

export const metadata: Metadata = {
	title: "dashboard-leads-profills",
	description: "dashboard-leads-profills",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			className={cn("font-sans", GeistSans.variable, GeistMono.variable)}
			lang="pt-BR"
			suppressHydrationWarning
		>
			<body className="antialiased">
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
