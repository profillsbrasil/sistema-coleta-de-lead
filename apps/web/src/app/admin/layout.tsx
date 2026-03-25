import {
	SidebarProvider,
	SidebarTrigger,
} from "@dashboard-leads-profills/ui/components/sidebar";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin-sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
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

	const userRole =
		(user.app_metadata as Record<string, unknown>)?.user_role ??
		(user.user_metadata as Record<string, unknown>)?.user_role;

	if (userRole !== "admin") {
		redirect("/dashboard");
	}

	return (
		<SidebarProvider>
			<div className="flex min-h-[calc(100svh-49px)] w-full">
				<AdminSidebar />
				<main className="flex-1 p-6">
					<div className="mb-4 md:hidden">
						<SidebarTrigger />
					</div>
					{children}
				</main>
			</div>
		</SidebarProvider>
	);
}
