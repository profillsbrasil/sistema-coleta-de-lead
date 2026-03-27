"use client";

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@dashboard-leads-profills/ui/components/breadcrumb";
import { SidebarTrigger } from "@dashboard-leads-profills/ui/components/sidebar";
import { usePathname } from "next/navigation";

const ROUTE_LABELS: Record<string, string> = {
	dashboard: "Dashboard",
	leads: "Leads",
	new: "Novo Lead",
	admin: "Admin",
	users: "Usuarios",
	stats: "Estatisticas",
};

const UUID_REGEX = /^[0-9a-f-]{8,}$/;

function isUuid(segment: string): boolean {
	return UUID_REGEX.test(segment);
}

function buildSegments(pathname: string) {
	const parts = pathname.split("/").filter(Boolean);
	return parts.map((part, i) => ({
		label: ROUTE_LABELS[part] ?? (isUuid(part) ? "Detalhe" : part),
		href: `/${parts.slice(0, i + 1).join("/")}`,
		isLast: i === parts.length - 1,
	}));
}

export function AppTopbar() {
	const pathname = usePathname();
	const segments = buildSegments(pathname);

	return (
		<header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
			<SidebarTrigger className="-ml-1 md:hidden" />
			<Breadcrumb>
				<BreadcrumbList>
					{segments.map((seg) => (
						<BreadcrumbItem key={seg.href}>
							{seg.isLast ? (
								<BreadcrumbPage>{seg.label}</BreadcrumbPage>
							) : (
								<>
									<BreadcrumbLink href={seg.href}>{seg.label}</BreadcrumbLink>
									<BreadcrumbSeparator />
								</>
							)}
						</BreadcrumbItem>
					))}
				</BreadcrumbList>
			</Breadcrumb>
		</header>
	);
}
