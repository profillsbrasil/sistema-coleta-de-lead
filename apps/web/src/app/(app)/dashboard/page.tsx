"use client";

import FAB from "@/components/fab";
import { useRequiredAppAuth } from "@/components/app-auth-provider";

import Dashboard from "./dashboard";

export default function DashboardPage() {
	const { snapshot } = useRequiredAppAuth();
	const isAdmin = snapshot.userRole === "admin";

	return (
		<div className="w-full">
			<Dashboard isAdmin={isAdmin} userId={snapshot.userId} />
			<FAB />
		</div>
	);
}
