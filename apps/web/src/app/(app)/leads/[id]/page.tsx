import { createClient } from "@/lib/supabase/server";

import LeadDetail from "./lead-detail";

export default async function LeadDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	return <LeadDetail localId={id} userId={user?.id ?? ""} />;
}
