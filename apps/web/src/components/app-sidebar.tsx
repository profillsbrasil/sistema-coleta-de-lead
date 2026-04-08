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
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@dashboard-leads-profills/ui/components/sidebar";
import {
	BarChart3,
	ClipboardList,
	LayoutDashboard,
	PlusCircle,
	Trophy,
	Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SidebarUserMenu from "@/components/sidebar-user-menu";

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
	gravatarUrl: string;
	isAdmin: boolean;
	userEmail: string;
	userName: string;
	userRole: string;
}

function isItemActive(href: string, pathname: string): boolean {
	if (href === "/leads") {
		return pathname === "/leads";
	}
	return pathname.startsWith(href);
}

export default function AppSidebar({
	gravatarUrl,
	isAdmin,
	userEmail,
	userName,
	userRole,
}: AppSidebarProps) {
	const pathname = usePathname();

	return (
		<Sidebar collapsible="none">
			<SidebarHeader>
				<div className="flex h-14 items-center px-4">
					<span className="font-semibold text-base text-sidebar-primary">
						Leads Profills
					</span>
				</div>
			</SidebarHeader>
			<SidebarContent>
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
				<SidebarUserMenu
					gravatarUrl={gravatarUrl}
					userEmail={userEmail}
					userName={userName}
					userRole={userRole}
				/>
			</SidebarFooter>
		</Sidebar>
	);
}
