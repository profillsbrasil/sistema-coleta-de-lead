"use client";

import { useRequiredAppAuth } from "@/components/app-auth-provider";
import LeadForm from "@/components/lead-form";

export default function NewLeadPage() {
	const { snapshot } = useRequiredAppAuth();

	return <LeadForm userId={snapshot.userId} />;
}
