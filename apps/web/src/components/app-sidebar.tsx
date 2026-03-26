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
	Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const VENDEDOR_ITEMS = [
	{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
	{ href: "/leads", label: "Leads", icon: ClipboardList },
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

export default function AppSidebar({ isAdmin }: AppSidebarProps) {
	const pathname = usePathname();

	return (
		<Sidebar collapsible="offcanvas">
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
									isActive={pathname.startsWith(href)}
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
			<SidebarFooter />
		</Sidebar>
	);
}
