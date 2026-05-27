import {
	BarChart3,
	ChevronRight,
	ClipboardList,
	Gift,
	MessageCircle,
	Users,
} from "lucide-react";
import Link from "next/link";

interface AdminLink {
	href: string;
	icon: React.ComponentType<{ className?: string }>;
	label: string;
}

const LEADS_LINKS: AdminLink[] = [
	{ href: "/admin/leads", icon: ClipboardList, label: "Leads por vendedor" },
	{ href: "/admin/users", icon: Users, label: "Usuários" },
	{ href: "/admin/stats", icon: BarChart3, label: "Stats globais" },
];

const WHATSAPP_LINKS: AdminLink[] = [
	{ href: "/admin/sorteio", icon: Gift, label: "Sorteio" },
	{ href: "/admin/whatsapp", icon: MessageCircle, label: "Dados do bot" },
];

function AdminLinkRow({ href, icon: Icon, label }: AdminLink) {
	return (
		<li>
			<Link
				className="flex min-h-14 items-center gap-3 px-4 transition-colors hover:bg-accent"
				href={href as unknown as "/"}
			>
				<Icon aria-hidden="true" className="size-5 text-muted-foreground" />
				<span className="flex-1 text-foreground">{label}</span>
				<ChevronRight
					aria-hidden="true"
					className="size-4 text-muted-foreground"
				/>
			</Link>
		</li>
	);
}

function AdminSection({ links, title }: { links: AdminLink[]; title: string }) {
	return (
		<nav aria-label={title} className="flex flex-col">
			<p className="px-4 pb-1 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
				{title}
			</p>
			<ul className="flex list-none flex-col divide-y divide-border-subtle border-border-subtle border-y">
				{links.map((link) => (
					<AdminLinkRow key={link.href} {...link} />
				))}
			</ul>
		</nav>
	);
}

export default function AdminPage() {
	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
			<header className="flex flex-col gap-0.5 px-4 pt-2">
				<h1 className="font-medium text-2xl text-foreground leading-[1.05] tracking-tight">
					Administração
				</h1>
				<p className="text-muted-foreground text-sm">
					Atalhos para gestão do sistema.
				</p>
			</header>

			<AdminSection links={LEADS_LINKS} title="Leads" />
			<AdminSection links={WHATSAPP_LINKS} title="Bot WhatsApp" />
		</div>
	);
}
