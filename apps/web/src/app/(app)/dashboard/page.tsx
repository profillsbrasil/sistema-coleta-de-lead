"use client";

import { useRequiredAppAuth } from "@/components/app-auth-provider";
import Dashboard from "./dashboard";

export default function DashboardPage() {
	const { snapshot } = useRequiredAppAuth();

	return <Dashboard userId={snapshot.userId} />;
}
