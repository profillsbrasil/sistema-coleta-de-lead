"use client";

import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@dashboard-leads-profills/ui/components/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@dashboard-leads-profills/ui/components/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { LogOut, Moon, Sun, User } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { type ReactNode, useEffect, useState } from "react";
import { useAppAuth } from "@/components/app-auth-provider";
import { EventCountdown } from "@/components/event-countdown";
import { clearAuthSnapshot } from "@/lib/auth/auth-snapshot";
import { db } from "@/lib/db/index";
import { getPersonalStats } from "@/lib/lead/stats";
import { createClient } from "@/lib/supabase/client";
import { trpc } from "@/utils/trpc";

const WHITESPACE_RE = /\s+/;

function getInitials(name: string): string {
	const parts = name.trim().split(WHITESPACE_RE);
	if (parts.length >= 2) {
		return `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
	}
	return name.slice(0, 2).toUpperCase();
}

function themeToggleIcon(
	mounted: boolean,
	resolvedTheme: string | undefined
): ReactNode {
	if (!mounted) {
		return <Sun className="opacity-0" />;
	}
	return resolvedTheme === "dark" ? <Sun /> : <Moon />;
}

function themeToggleLabel(
	mounted: boolean,
	resolvedTheme: string | undefined
): string {
	if (!mounted) {
		return "Tema";
	}
	return resolvedTheme === "dark" ? "Tema Claro" : "Tema Escuro";
}

function HeaderStats({
	isAdminContext,
	userId,
}: {
	isAdminContext: boolean;
	userId: string;
}) {
	const personalStats = useLiveQuery(
		() => (isAdminContext ? null : getPersonalStats(userId)),
		[userId, isAdminContext]
	);

	const { data: adminStats } = useQuery({
		...trpc.admin.stats.getGlobalStats.queryOptions({}),
		enabled: isAdminContext,
	});

	const total = isAdminContext
		? (adminStats?.total ?? 0)
		: (personalStats?.total ?? 0);
	const secondary = isAdminContext
		? (adminStats?.activeVendors ?? 0)
		: (personalStats?.hoje ?? 0);
	const secondaryLabel = isAdminContext ? "vendedores" : "hoje";

	return (
		<div className="flex items-baseline gap-4">
			<div className="flex items-baseline gap-1">
				<span className="font-semibold text-[15px] text-foreground">
					{total}
				</span>
				<span className="text-[10px] text-muted-foreground">leads</span>
			</div>
			<div className="flex items-baseline gap-1">
				<span className="font-semibold text-[15px] text-success">
					{secondary}
				</span>
				<span className="text-[10px] text-muted-foreground">
					{secondaryLabel}
				</span>
			</div>
		</div>
	);
}

function HeaderIdentity({
	gravatarUrl,
	rank,
	showName,
	userName,
}: {
	gravatarUrl: string;
	rank: number | null;
	showName: boolean;
	userName: string;
}) {
	const router = useRouter();
	const { setTheme, resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	function handleToggleTheme() {
		setTheme(resolvedTheme === "dark" ? "light" : "dark");
	}

	async function handleSignOut() {
		const supabase = createClient();
		clearAuthSnapshot();
		await supabase.auth.signOut();
		router.push("/login");
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger className="flex cursor-pointer items-center gap-2 rounded-md p-1 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
				{showName && (
					<div className="text-right">
						<p className="font-medium text-foreground text-sm">{userName}</p>
						<p className="text-[10px] text-rank-accent">#{rank ?? "\u2014"}</p>
					</div>
				)}
				<Avatar className={showName ? "size-[30px]" : "size-7"}>
					<AvatarImage alt={userName} src={gravatarUrl} />
					<AvatarFallback className="text-[11px]">
						{getInitials(userName)}
					</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56" sideOffset={8}>
				<DropdownMenuItem
					onClick={() => router.push("/account" as unknown as "/")}
				>
					<User />
					Minha Conta
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={handleToggleTheme}>
					{themeToggleIcon(mounted, resolvedTheme)}
					{themeToggleLabel(mounted, resolvedTheme)}
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={handleSignOut} variant="destructive">
					<LogOut />
					Sair
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function GlobalHeader() {
	const { snapshot } = useAppAuth();
	const pathname = usePathname();

	const entries = useLiveQuery(
		() => db.leaderboardCache.orderBy("rank").toArray(),
		[]
	);

	if (!snapshot) {
		return null;
	}

	const isAdminContext =
		pathname.startsWith("/admin") && snapshot.userRole === "admin";
	const currentUserRank =
		entries?.find((e) => e.userId === snapshot.userId)?.rank ?? null;

	return (
		<>
			{/* Desktop */}
			<header className="hidden h-[52px] shrink-0 border-border border-b md:flex">
				<div className="flex w-(--sidebar-width) items-center border-border border-r px-4">
					<span className="font-semibold text-foreground text-sm">
						Leads{" "}
						<span className="font-normal text-muted-foreground">Profills</span>
					</span>
				</div>
				<div className="flex flex-1 items-center justify-between px-5">
					<HeaderStats
						isAdminContext={isAdminContext}
						userId={snapshot.userId}
					/>
					<div className="flex items-center gap-1.5">
						<span className="size-[5px] shrink-0 animate-pulse rounded-full bg-warning" />
						<EventCountdown />
					</div>
					<HeaderIdentity
						gravatarUrl={snapshot.gravatarUrl}
						rank={currentUserRank}
						showName
						userName={snapshot.userName}
					/>
				</div>
			</header>

			{/* Mobile */}
			<header className="flex h-11 shrink-0 items-center justify-between border-border border-b px-3.5 md:hidden">
				<HeaderStats isAdminContext={isAdminContext} userId={snapshot.userId} />
				<div className="flex items-center gap-1">
					<span className="size-1 shrink-0 rounded-full bg-warning" />
					<EventCountdown />
				</div>
				<HeaderIdentity
					gravatarUrl={snapshot.gravatarUrl}
					rank={currentUserRank}
					showName={false}
					userName={snapshot.userName}
				/>
			</header>
		</>
	);
}
