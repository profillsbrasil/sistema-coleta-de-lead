"use client";

import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@dashboard-leads-profills/ui/components/avatar";
import { Button } from "@dashboard-leads-profills/ui/components/button";
import {
	SidebarMenu,
	SidebarMenuItem,
} from "@dashboard-leads-profills/ui/components/sidebar";
import { LogOut, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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

function ThemeIcon({ resolvedTheme }: { resolvedTheme: string | undefined }) {
	if (resolvedTheme === "dark") {
		return <Sun />;
	}
	return <Moon />;
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
		await supabase.auth.signOut();
		router.push("/login");
	}

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<div className="flex items-center gap-3 px-2 py-2">
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
					<Button
						aria-label="Alternar tema"
						onClick={handleToggleTheme}
						size="icon-sm"
						variant="ghost"
					>
						{mounted ? (
							<ThemeIcon resolvedTheme={resolvedTheme} />
						) : (
							<Sun className="opacity-0" />
						)}
					</Button>
					<Button
						aria-label="Sair"
						onClick={handleSignOut}
						size="icon-sm"
						variant="ghost"
					>
						<LogOut />
					</Button>
				</div>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
