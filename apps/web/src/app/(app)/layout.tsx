import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@dashboard-leads-profills/ui/components/sidebar";
import { redirect } from "next/navigation";
import AppSidebar from "@/components/app-sidebar";
import { getGravatarUrl } from "@/lib/gravatar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	const { data: claimsData } = await supabase.auth.getClaims();
	const claims = claimsData?.claims as Record<string, unknown>;
	const userRole = (claims?.user_role as string) ?? "vendedor";
	const isAdmin = userRole === "admin";
	const userName =
		(user?.user_metadata?.full_name as string) ??
		user?.email?.split("@")[0] ??
		"Usuario";
	const userEmail = user?.email ?? "";
	const gravatarUrl = await getGravatarUrl(userEmail);

	return (
		<SidebarProvider defaultOpen>
			<AppSidebar
				gravatarUrl={gravatarUrl}
				isAdmin={isAdmin}
				userEmail={userEmail}
				userName={userName}
				userRole={userRole}
			/>
			<SidebarInset>
				<header className="flex h-14 items-center gap-2 border-b px-4 md:hidden">
					<SidebarTrigger />
				</header>
				<div className="flex-1 p-4 md:p-6">{children}</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
