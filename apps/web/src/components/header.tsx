"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

const links = [
	{ to: "/", label: "Home" },
	{ to: "/dashboard", label: "Dashboard" },
	{ to: "/leads" as unknown as "/", label: "Leads" },
	{ to: "/todos", label: "Todos" },
] as const;

export default function Header() {
	const [isAdmin, setIsAdmin] = useState(false);

	useEffect(() => {
		const supabase = createClient();
		supabase.auth.getUser().then(({ data }) => {
			const userRole =
				(data?.user?.app_metadata as Record<string, unknown>)?.user_role ??
				(data?.user?.user_metadata as Record<string, unknown>)?.user_role;
			setIsAdmin(userRole === "admin");
		});
	}, []);

	return (
		<div>
			<div className="flex flex-row items-center justify-between px-2 py-1">
				<nav className="flex gap-4 text-lg">
					{links.map(({ to, label }) => {
						return (
							<Link href={to} key={to}>
								{label}
							</Link>
						);
					})}
					{isAdmin ? (
						<Link href={"/admin" as unknown as "/"}>Admin</Link>
					) : null}
				</nav>
				<div className="flex items-center gap-2">
					<ModeToggle />
					<UserMenu />
				</div>
			</div>
			<hr />
		</div>
	);
}
