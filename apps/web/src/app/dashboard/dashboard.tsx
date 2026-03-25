"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@dashboard-leads-profills/ui/components/select";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@dashboard-leads-profills/ui/components/tabs";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { trpc } from "@/utils/trpc";
import LeaderboardTab from "./leaderboard-tab";
import PersonalDashboard from "./personal-dashboard";

interface DashboardProps {
	isAdmin?: boolean;
	userId: string;
}

export default function Dashboard({ userId, isAdmin }: DashboardProps) {
	const [selectedVendor, setSelectedVendor] = useState<string | undefined>(
		undefined
	);

	const vendorsQuery = useQuery(
		trpc.admin.leads.listVendors.queryOptions(undefined, {
			enabled: !!isAdmin,
		})
	);

	const effectiveUserId = selectedVendor ?? userId;

	return (
		<Tabs defaultValue="dashboard">
			<div className="flex items-center justify-between gap-4">
				<TabsList>
					<TabsTrigger value="dashboard">Meu Dashboard</TabsTrigger>
					<TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
				</TabsList>
				{isAdmin && vendorsQuery.data ? (
					<Select
						onValueChange={(v) =>
							setSelectedVendor(v === "self" || !v ? undefined : v)
						}
						value={selectedVendor ?? "self"}
					>
						<SelectTrigger className="w-[200px]">
							<SelectValue placeholder="Selecionar vendedor" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="self">Meu Dashboard</SelectItem>
							{vendorsQuery.data.map((v) => (
								<SelectItem key={v.userId} value={v.userId}>
									{v.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				) : null}
			</div>
			<TabsContent className="mt-4" value="dashboard">
				<PersonalDashboard userId={effectiveUserId} />
			</TabsContent>
			<TabsContent className="mt-4" value="leaderboard">
				<LeaderboardTab userId={userId} />
			</TabsContent>
		</Tabs>
	);
}
