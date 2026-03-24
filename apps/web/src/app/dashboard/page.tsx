import { redirect } from "next/navigation";

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

	return (
		<div>
			<h1>Dashboard</h1>
			<p>Welcome {user.user_metadata?.full_name ?? user.email}</p>
			<Dashboard />
		</div>
	);
}
