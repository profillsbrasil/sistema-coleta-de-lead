import { createClient } from "@/lib/supabase/server";

import LeadList from "./lead-list";

export default async function LeadsPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	return <LeadList userId={user?.id ?? ""} />;
}
