import { redirect } from "next/navigation";

import FAB from "@/components/fab";
import { createClient } from "@/lib/supabase/server";

import Dashboard from "./dashboard";

export default async function DashboardPage() {
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
	const isAdmin = userRole === "admin";

	return (
		<div className="mx-auto w-full max-w-[480px] px-4 pt-8">
			<Dashboard isAdmin={isAdmin} userId={user.id} />
			<FAB />
		</div>
	);
}
