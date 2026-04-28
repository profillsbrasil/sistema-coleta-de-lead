"use client";

import { authClient } from "@dashboard-leads-profills/auth/client";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@dashboard-leads-profills/ui/components/avatar";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@dashboard-leads-profills/ui/components/collapsible";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@dashboard-leads-profills/ui/components/sidebar";
import {
	BarChart3,
	ChevronUp,
	ClipboardList,
	LogOut,
	Moon,
	PlusCircle,
	Sun,
	Trophy,
	UserCog,
	Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useAppAuth } from "@/components/app-auth-provider";
import { SyncStatusIndicator } from "@/components/sync-status-indicator";
import { clearAuthSnapshot } from "@/lib/auth/auth-snapshot";

const VENDEDOR_ITEMS = [
	{ href: "/dashboard", label: "Ranking", icon: Trophy },
	{ href: "/leads", label: "Meus leads", icon: ClipboardList },
	{ href: "/leads/new", label: "Novo lead", icon: PlusCircle },
] as const;

const ADMIN_ITEMS = [
	{ href: "/admin/leads", label: "Leads", icon: ClipboardList },
	{ href: "/admin/users", label: "Usuários", icon: Users },
	{ href: "/admin/stats", label: "Stats globais", icon: BarChart3 },
] as const;

const WHITESPACE_RE = /\s+/;

function getInitials(name: string): string {
	const parts = name.trim().split(WHITESPACE_RE);
	if (parts.length >= 2) {
		return `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
	}
	return name.slice(0, 2).toUpperCase();
}

interface AppSidebarProps {
	isAdmin: boolean;
}

function isItemActive(href: string, pathname: string): boolean {
	if (href === "/leads") {
		return pathname === "/leads";
	}
	return pathname.startsWith(href);
}

function UserBlock() {
	const { snapshot } = useAppAuth();
	const router = useRouter();
	const pathname = usePathname();
	const { setTheme, resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!snapshot) {
		return null;
	}

	function toggleTheme() {
		setTheme(resolvedTheme === "dark" ? "light" : "dark");
	}

	async function handleSignOut() {
		clearAuthSnapshot();
		await authClient.signOut();
		router.push("/login");
	}

	const isAccountActive = pathname.startsWith("/account");
	let themeLabel = "—";
	if (mounted) {
		themeLabel = resolvedTheme === "dark" ? "Dark" : "Light";
	}
	const ThemeIcon = mounted && resolvedTheme === "dark" ? Sun : Moon;

	return (
		<Collapsible className="group/user" defaultOpen={false}>
			<CollapsibleTrigger className="flex w-full items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent">
				<Avatar className="size-8">
					<AvatarImage alt={snapshot.userName} src={snapshot.gravatarUrl} />
					<AvatarFallback className="text-xs">
						{getInitials(snapshot.userName)}
					</AvatarFallback>
				</Avatar>
				<div className="flex min-w-0 flex-1 flex-col items-start text-left">
					<span className="w-full truncate font-medium text-foreground text-sm">
						{snapshot.userName}
					</span>
					<span className="w-full truncate text-muted-foreground text-xs">
						{snapshot.userEmail}
					</span>
				</div>
				<ChevronUp
					aria-hidden="true"
					className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=closed]/user:rotate-180"
				/>
			</CollapsibleTrigger>
			<CollapsibleContent>
				<ul className="mt-1 flex list-none flex-col gap-0.5">
					<li>
						<Link
							className={`flex min-h-9 items-center gap-2 rounded-md px-2 text-sm transition-colors hover:bg-accent ${
								isAccountActive ? "bg-accent" : ""
							}`}
							href={"/account" as unknown as "/"}
						>
							<UserCog
								aria-hidden="true"
								className="size-4 text-muted-foreground"
							/>
							<span className="flex-1 text-foreground">Conta</span>
						</Link>
					</li>
					<li>
						<button
							className="flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm transition-colors hover:bg-accent"
							onClick={toggleTheme}
							type="button"
						>
							<ThemeIcon
								aria-hidden="true"
								className="size-4 text-muted-foreground"
							/>
							<span className="flex-1 text-foreground">Tema</span>
							<span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.14em]">
								{themeLabel}
							</span>
						</button>
					</li>
					<li>
						<button
							className="flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-destructive text-sm transition-colors hover:bg-destructive/10"
							onClick={handleSignOut}
							type="button"
						>
							<LogOut aria-hidden="true" className="size-4" />
							Sair
						</button>
					</li>
				</ul>
			</CollapsibleContent>
		</Collapsible>
	);
}

export default function AppSidebar({ isAdmin }: AppSidebarProps) {
	const pathname = usePathname();

	return (
		<Sidebar collapsible="none">
			<SidebarContent className="pt-2">
				<SidebarGroup>
					<SidebarGroupLabel>Vendedor</SidebarGroupLabel>
					<SidebarMenu>
						{VENDEDOR_ITEMS.map(({ href, label, icon: Icon }) => (
							<SidebarMenuItem key={href}>
								<SidebarMenuButton
									className="min-h-11"
									isActive={isItemActive(href, pathname)}
									render={<Link href={href as unknown as "/"} />}
								>
									<Icon />
									{label}
								</SidebarMenuButton>
							</SidebarMenuItem>
						))}
					</SidebarMenu>
				</SidebarGroup>
				{isAdmin && (
					<Collapsible className="group/collapsible" defaultOpen>
						<SidebarGroup>
							<SidebarGroupLabel render={<CollapsibleTrigger />}>
								Admin
							</SidebarGroupLabel>
							<CollapsibleContent>
								<SidebarMenu>
									{ADMIN_ITEMS.map(({ href, label, icon: Icon }) => (
										<SidebarMenuItem key={href}>
											<SidebarMenuButton
												className="min-h-11"
												isActive={pathname.startsWith(href)}
												render={<Link href={href as unknown as "/"} />}
											>
												<Icon />
												{label}
											</SidebarMenuButton>
										</SidebarMenuItem>
									))}
								</SidebarMenu>
							</CollapsibleContent>
						</SidebarGroup>
					</Collapsible>
				)}
			</SidebarContent>
			<SidebarFooter className="gap-1 border-border border-t">
				<UserBlock />
				<SyncStatusIndicator />
			</SidebarFooter>
		</Sidebar>
	);
}
