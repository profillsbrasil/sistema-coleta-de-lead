import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Source_Code_Pro } from "next/font/google";
import Providers from "@/components/providers";
import "../index.css";

const jakarta = Plus_Jakarta_Sans({
	subsets: ["latin"],
	variable: "--font-sans",
});

const sourceCode = Source_Code_Pro({
	subsets: ["latin"],
	variable: "--font-mono",
});

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
			className={cn("font-sans", jakarta.variable, sourceCode.variable)}
			lang="en"
			suppressHydrationWarning
		>
			<body className="antialiased">
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
