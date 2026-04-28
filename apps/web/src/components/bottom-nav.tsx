"use client";

import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import { Plus, Trophy, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useKeyboardVisible } from "@/components/fab";
import { useSyncStatus } from "@/components/sync-status-provider";

interface NavSlotProps {
	active: boolean;
	href: string;
	icon: React.ComponentType<{ className?: string }>;
	indicator?: React.ReactNode;
	label: string;
}

function NavSlot({ active, href, icon: Icon, label, indicator }: NavSlotProps) {
	return (
		<Link
			aria-current={active ? "page" : undefined}
			className="flex flex-1 flex-col items-center gap-1 py-2.5"
			href={href as unknown as "/"}
		>
			<span className="relative">
				<Icon
					className={cn(
						"size-5",
						active ? "text-primary" : "text-muted-foreground"
					)}
				/>
				{indicator}
			</span>
			<span
				className={cn(
					"text-xs",
					active ? "font-medium text-primary" : "text-muted-foreground"
				)}
			>
				{label}
			</span>
		</Link>
	);
}

export default function BottomNav() {
	const pathname = usePathname();
	const keyboardVisible = useKeyboardVisible();
	const { isOnline, pendingCount } = useSyncStatus();

	if (keyboardVisible) {
		return null;
	}

	const showSyncDot = !isOnline || pendingCount > 0;
	const isVoceActive =
		pathname === "/voce" ||
		pathname.startsWith("/voce/") ||
		pathname.startsWith("/account");

	return (
		<nav
			aria-label="Navegação principal"
			className="fixed inset-x-0 bottom-0 z-50 border-border border-t bg-card md:hidden"
		>
			<div className="relative flex items-center justify-around pb-[env(safe-area-inset-bottom)]">
				<NavSlot
					active={pathname === "/dashboard"}
					href="/dashboard"
					icon={Trophy}
					label="Ranking"
				/>

				<Link
					aria-label="Adicionar novo lead"
					className="relative -top-3 flex items-center justify-center"
					href={"/leads/new" as unknown as "/"}
				>
					<div className="flex size-[52px] items-center justify-center rounded-full border-[3px] border-card bg-primary shadow-glow-primary">
						<Plus
							className="size-6 text-primary-foreground"
							strokeWidth={2.5}
						/>
					</div>
				</Link>

				<NavSlot
					active={isVoceActive}
					href="/voce"
					icon={User}
					indicator={
						showSyncDot ? (
							<span
								aria-hidden="true"
								className={cn(
									"absolute -top-0.5 -right-0.5 size-2 rounded-full ring-2 ring-card",
									isOnline ? "bg-warning" : "bg-warning"
								)}
							/>
						) : null
					}
					label="Você"
				/>
			</div>
		</nav>
	);
}
