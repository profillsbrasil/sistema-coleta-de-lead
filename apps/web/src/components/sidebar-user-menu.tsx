"use client";

import { clearAuthSnapshot } from "@/lib/auth/auth-snapshot";
import { createClient } from "@/lib/supabase/client";
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
import {
	SidebarMenu,
	SidebarMenuItem,
} from "@dashboard-leads-profills/ui/components/sidebar";
import { LogOut, Moon, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { SyncStatusIcon } from "./sync-status-icon";

interface SidebarUserMenuProps {
	gravatarUrl: string;
	userEmail: string;
	userName: string;
	userRole: string;
}

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
	if (resolvedTheme === "dark") {
		return <Sun />;
	}
	return <Moon />;
}

function themeToggleLabel(
	mounted: boolean,
	resolvedTheme: string | undefined
): string {
	if (!mounted) {
		return "Tema";
	}
	if (resolvedTheme === "dark") {
		return "Tema Claro";
	}
	return "Tema Escuro";
}

export default function SidebarUserMenu({
	gravatarUrl,
	userEmail: _userEmail,
	userName,
	userRole,
}: SidebarUserMenuProps) {
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
		<SidebarMenu>
			<SidebarMenuItem className="flex items-center p-2">
				<DropdownMenu>
					<DropdownMenuTrigger className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md p-1 text-left outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring">
						<Avatar>
							<AvatarImage alt={userName} src={gravatarUrl} />
							<AvatarFallback>{getInitials(userName)}</AvatarFallback>
						</Avatar>
						<div className="flex min-w-0 flex-1 flex-col">
							<span className="truncate font-semibold text-sm">{userName}</span>
							<span className="truncate text-muted-foreground text-xs">
								{userRole === "admin" ? "Admin" : "Vendedor"}
							</span>
						</div>
						<SyncStatusIcon />
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="start"
						className="w-56"
						side="top"
						sideOffset={8}
					>
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
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
