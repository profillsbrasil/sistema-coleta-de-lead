"use client";

import { useRequiredAppAuth } from "@/components/app-auth-provider";

import LeadList from "./lead-list";

export default function LeadsPage() {
	const { snapshot } = useRequiredAppAuth();

	return <LeadList userId={snapshot.userId} />;
}
