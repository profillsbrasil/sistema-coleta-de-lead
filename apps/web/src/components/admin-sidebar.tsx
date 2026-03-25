"use client";

import { Separator } from "@dashboard-leads-profills/ui/components/separator";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@dashboard-leads-profills/ui/components/sidebar";
import { ClipboardList, LayoutDashboard, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
	{ href: "/admin/leads", label: "Leads", icon: ClipboardList },
	{ href: "/admin/users", label: "Usuarios", icon: Users },
	{ href: "/admin/stats", label: "Stats Globais", icon: LayoutDashboard },
] as const;

export default function AdminSidebar() {
	const pathname = usePathname();

	return (
		<Sidebar>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel className="font-normal text-foreground text-sm">
						Admin
					</SidebarGroupLabel>
					<Separator className="mb-2" />
					<SidebarMenu>
						{NAV_ITEMS.map(({ href, label, icon: Icon }) => {
							const isActive = pathname.startsWith(href);
							return (
								<SidebarMenuItem key={href}>
									<SidebarMenuButton
										render={<Link href={href as unknown as "/"} />}
										isActive={isActive}
									>
										<Icon className="size-4" />
										{label}
									</SidebarMenuButton>
								</SidebarMenuItem>
							);
						})}
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>
		</Sidebar>
	);
}
