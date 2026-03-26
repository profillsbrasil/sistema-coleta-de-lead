import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@dashboard-leads-profills/ui/components/sidebar";
import { redirect } from "next/navigation";
import AppSidebar from "@/components/app-sidebar";
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
	const userRole = (claimsData?.claims as Record<string, unknown>)?.user_role;
	const isAdmin = userRole === "admin";

	return (
		<SidebarProvider defaultOpen>
			<AppSidebar isAdmin={isAdmin} />
			<SidebarInset>
				<header className="flex h-14 items-center gap-2 border-b px-4 md:hidden">
					<SidebarTrigger />
				</header>
				<div className="flex-1 p-4 md:p-6">{children}</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
