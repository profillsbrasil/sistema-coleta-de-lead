"use client";

import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@dashboard-leads-profills/ui/components/tabs";

import LeaderboardTab from "./leaderboard-tab";
import PersonalDashboard from "./personal-dashboard";

interface DashboardProps {
	userId: string;
}

export default function Dashboard({ userId }: DashboardProps) {
	return (
		<Tabs defaultValue="dashboard">
			<TabsList>
				<TabsTrigger value="dashboard">Meu Dashboard</TabsTrigger>
				<TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
			</TabsList>
			<TabsContent className="mt-4" value="dashboard">
				<PersonalDashboard userId={userId} />
			</TabsContent>
			<TabsContent className="mt-4" value="leaderboard">
				<LeaderboardTab userId={userId} />
			</TabsContent>
		</Tabs>
	);
}
