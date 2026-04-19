import { auth } from "@dashboard-leads-profills/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session?.user) {
		redirect("/login");
	}

	if ((session.user as { role?: string }).role !== "admin") {
		redirect("/dashboard");
	}

	return <>{children}</>;
}
