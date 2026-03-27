import FAB from "@/components/fab";
import { createClient } from "@/lib/supabase/server";

import Dashboard from "./dashboard";

export default async function DashboardPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	const { data: claimsData } = await supabase.auth.getClaims();
	const userRole = (claimsData?.claims as Record<string, unknown>)?.user_role;
	const isAdmin = userRole === "admin";

	return (
		<div className="w-full">
			<Dashboard isAdmin={isAdmin} userId={user?.id ?? ""} />
			<FAB />
		</div>
	);
}
