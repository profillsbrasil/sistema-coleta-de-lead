import { redirect } from "next/navigation";
import LeadForm from "@/components/lead-form";
import { createClient } from "@/lib/supabase/server";

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
