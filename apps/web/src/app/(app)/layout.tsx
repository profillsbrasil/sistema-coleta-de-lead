import { AuthenticatedAppShell } from "@/components/authenticated-app-shell";

export default async function AppLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <AuthenticatedAppShell>{children}</AuthenticatedAppShell>;
}
