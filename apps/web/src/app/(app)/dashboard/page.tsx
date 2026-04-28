"use client";

import { useRequiredAppAuth } from "@/components/app-auth-provider";
import Dashboard from "./dashboard";

const WHITESPACE_RE = /\s+/;

function getPeriod(hour: number): string {
	if (hour < 12) {
		return "Bom dia";
	}
	if (hour < 18) {
		return "Boa tarde";
	}
	return "Boa noite";
}

function buildGreeting(name: string | null | undefined): string {
	const period = getPeriod(new Date().getHours());
	const firstName = name?.trim().split(WHITESPACE_RE)[0];
	return firstName ? `${period}, ${firstName}` : period;
}

export default function DashboardPage() {
	const { snapshot } = useRequiredAppAuth();

	return (
		<Dashboard
			greeting={buildGreeting(snapshot.userName)}
			userId={snapshot.userId}
		/>
	);
}
