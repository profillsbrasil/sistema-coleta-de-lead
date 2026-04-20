"use client";

import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import { Plus, Trophy, UserPlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useKeyboardVisible } from "@/components/fab";

export default function BottomNav() {
	const pathname = usePathname();
	const keyboardVisible = useKeyboardVisible();

	if (keyboardVisible) {
		return null;
	}

	return (
		<nav className="fixed inset-x-0 bottom-0 z-50 border-border border-t bg-card md:hidden">
			<div className="relative flex items-center justify-around pb-[env(safe-area-inset-bottom)]">
				{/* Left tab: Ranking */}
				<Link
					className="flex flex-1 flex-col items-center gap-1 py-2.5"
					href="/dashboard"
				>
					<Trophy
						className={cn(
							"size-5",
							pathname === "/dashboard"
								? "text-primary"
								: "text-muted-foreground"
						)}
					/>
					<span
						className={cn(
							"text-xs",
							pathname === "/dashboard"
								? "font-medium text-primary"
								: "text-muted-foreground"
						)}
					>
						Ranking
					</span>
				</Link>

				{/* Center FAB: Novo Lead */}
				<Link
					aria-label="Adicionar novo lead"
					className="relative -top-3 flex items-center justify-center"
					href={"/leads/new" as unknown as "/"}
				>
					<div className="flex size-[52px] items-center justify-center rounded-full border-[3px] border-card bg-primary">
						<Plus
							className="size-6 text-primary-foreground"
							strokeWidth={2.5}
						/>
					</div>
				</Link>

				{/* Right tab: Leads */}
				<Link
					className="flex flex-1 flex-col items-center gap-1 py-2.5"
					href="/leads"
				>
					<UserPlus
						className={cn(
							"size-5",
							pathname === "/leads" ? "text-primary" : "text-muted-foreground"
						)}
					/>
					<span
						className={cn(
							"text-xs",
							pathname === "/leads"
								? "font-medium text-primary"
								: "text-muted-foreground"
						)}
					>
						Leads
					</span>
				</Link>
			</div>
		</nav>
	);
}
