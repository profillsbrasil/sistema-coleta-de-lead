"use client";

import { use } from "react";
import { useRequiredAppAuth } from "@/components/app-auth-provider";

import LeadDetail from "./lead-detail";

export default function LeadDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { snapshot } = useRequiredAppAuth();
	const { id } = use(params);

	return <LeadDetail localId={id} userId={snapshot.userId} />;
}
