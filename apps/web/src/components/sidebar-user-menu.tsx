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
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface SidebarUserMenuProps {
	userName: string;
	userEmail: string;
	userRole: string;
	gravatarUrl: string;
}

function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 2) {
		return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
	}
	return name.slice(0, 2).toUpperCase();
}

export default function SidebarUserMenu({
	userName,
	userEmail,
	userRole,
	gravatarUrl,
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
						<AvatarImage src={gravatarUrl} alt={userName} />
						<AvatarFallback>{getInitials(userName)}</AvatarFallback>
					</Avatar>
					<div className="flex min-w-0 flex-1 flex-col">
						<span className="truncate text-sm font-semibold">
							{userName}
						</span>
						<span className="truncate text-xs text-muted-foreground">
							{userRole === "admin" ? "Admin" : "Vendedor"}
						</span>
					</div>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={handleToggleTheme}
						aria-label="Alternar tema"
					>
						{mounted ? (
							resolvedTheme === "dark" ? (
								<Sun />
							) : (
								<Moon />
							)
						) : (
							<Sun className="opacity-0" />
						)}
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={handleSignOut}
						aria-label="Sair"
					>
						<LogOut />
					</Button>
				</div>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
