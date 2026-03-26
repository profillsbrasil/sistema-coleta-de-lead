import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import LeadForm from "@/components/lead-form";

export default async function NewLeadPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	return <LeadForm />;
}
