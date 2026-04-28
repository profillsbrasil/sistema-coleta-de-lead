"use client";

import { authClient } from "@dashboard-leads-profills/auth/client";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@dashboard-leads-profills/ui/components/avatar";
import { useLiveQuery } from "dexie-react-hooks";
import {
	ChevronRight,
	ClipboardList,
	LogOut,
	Moon,
	Sun,
	UserCog,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useRequiredAppAuth } from "@/components/app-auth-provider";
import { useSyncStatus } from "@/components/sync-status-provider";
import { clearAuthSnapshot } from "@/lib/auth/auth-snapshot";
import { db } from "@/lib/db/index";

const WHITESPACE_RE = /\s+/;

function getInitials(name: string): string {
	const parts = name.trim().split(WHITESPACE_RE);
	if (parts.length >= 2) {
		return `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
	}
	return name.slice(0, 2).toUpperCase();
}

export default function VocePage() {
	const { snapshot } = useRequiredAppAuth();
	const router = useRouter();
	const { setTheme, resolvedTheme } = useTheme();
	const { isOnline, pendingCount } = useSyncStatus();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const leadCount = useLiveQuery(
		() =>
			db.leads
				.where("userId")
				.equals(snapshot.userId)
				.filter((l) => l.deletedAt === null)
				.count(),
		[snapshot.userId],
		0
	);

	function toggleTheme() {
		setTheme(resolvedTheme === "dark" ? "light" : "dark");
	}

	async function handleSignOut() {
		clearAuthSnapshot();
		await authClient.signOut();
		router.push("/login");
	}

	let themeLabel = "—";
	if (mounted) {
		themeLabel = resolvedTheme === "dark" ? "Dark" : "Light";
	}
	const ThemeIcon = mounted && resolvedTheme === "dark" ? Sun : Moon;

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
			<header className="flex items-center gap-4 px-4 pt-2">
				<Avatar className="size-16 border-2 border-border-subtle">
					<AvatarImage alt={snapshot.userName} src={snapshot.gravatarUrl} />
					<AvatarFallback className="text-base">
						{getInitials(snapshot.userName)}
					</AvatarFallback>
				</Avatar>
				<div className="flex flex-col gap-0.5">
					<h1 className="font-medium text-2xl text-foreground leading-[1.05] tracking-tight">
						{snapshot.userName}
					</h1>
					<p className="text-muted-foreground text-sm">{snapshot.userEmail}</p>
					<p className="mt-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em]">
						<span
							aria-hidden="true"
							className={
								isOnline
									? "size-1.5 rounded-full bg-success"
									: "size-1.5 rounded-full bg-warning"
							}
						/>
						<span className={isOnline ? "text-foreground" : "text-warning"}>
							{isOnline ? "Online" : "Offline"}
						</span>
						{pendingCount > 0 && (
							<span className="text-muted-foreground">
								• {pendingCount} pendente{pendingCount === 1 ? "" : "s"}
							</span>
						)}
					</p>
				</div>
			</header>

			<nav className="flex flex-col">
				<p className="px-4 pb-1 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
					Atalhos
				</p>
				<ul className="flex list-none flex-col divide-y divide-border-subtle border-border-subtle border-y">
					<li>
						<Link
							className="flex min-h-14 items-center gap-3 px-4 transition-colors hover:bg-accent"
							href="/leads"
						>
							<ClipboardList
								aria-hidden="true"
								className="size-5 text-muted-foreground"
							/>
							<span className="flex-1 text-foreground">Meus leads</span>
							<span className="font-mono text-muted-foreground text-sm">
								{leadCount}
							</span>
							<ChevronRight
								aria-hidden="true"
								className="size-4 text-muted-foreground"
							/>
						</Link>
					</li>
					<li>
						<Link
							className="flex min-h-14 items-center gap-3 px-4 transition-colors hover:bg-accent"
							href={"/account" as unknown as "/"}
						>
							<UserCog
								aria-hidden="true"
								className="size-5 text-muted-foreground"
							/>
							<span className="flex-1 text-foreground">Conta</span>
							<ChevronRight
								aria-hidden="true"
								className="size-4 text-muted-foreground"
							/>
						</Link>
					</li>
					<li>
						<button
							className="flex min-h-14 w-full items-center gap-3 px-4 text-left transition-colors hover:bg-accent"
							onClick={toggleTheme}
							type="button"
						>
							<ThemeIcon
								aria-hidden="true"
								className="size-5 text-muted-foreground"
							/>
							<span className="flex-1 text-foreground">Tema</span>
							<span className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
								{themeLabel}
							</span>
						</button>
					</li>
				</ul>
			</nav>

			<div className="px-4">
				<button
					className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 px-4 text-destructive text-sm transition-colors hover:bg-destructive/10"
					onClick={handleSignOut}
					type="button"
				>
					<LogOut aria-hidden="true" className="size-4" />
					Sair
				</button>
			</div>
		</div>
	);
}
