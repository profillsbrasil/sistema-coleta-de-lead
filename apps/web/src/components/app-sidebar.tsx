"use client";

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
	ClipboardList,
	PlusCircle,
	Trophy,
	Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SyncStatusIndicator } from "@/components/sync-status-indicator";

const VENDEDOR_ITEMS = [
	{ href: "/dashboard", label: "Ranking", icon: Trophy },
	{ href: "/leads", label: "Meus Leads", icon: ClipboardList },
	{ href: "/leads/new", label: "Novo Lead", icon: PlusCircle },
] as const;

const ADMIN_ITEMS = [
	{ href: "/admin/leads", label: "Leads", icon: ClipboardList },
	{ href: "/admin/users", label: "Usuarios", icon: Users },
	{ href: "/admin/stats", label: "Stats Globais", icon: BarChart3 },
] as const;

interface AppSidebarProps {
	isAdmin: boolean;
}

function isItemActive(href: string, pathname: string): boolean {
	if (href === "/leads") {
		return pathname === "/leads";
	}
	return pathname.startsWith(href);
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
			<SidebarFooter>
				<SyncStatusIndicator />
			</SidebarFooter>
		</Sidebar>
	);
}
