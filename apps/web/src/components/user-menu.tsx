"use client";

import { authClient } from "@dashboard-leads-profills/auth/client";
import { Button } from "@dashboard-leads-profills/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@dashboard-leads-profills/ui/components/dropdown-menu";
import { Skeleton } from "@dashboard-leads-profills/ui/components/skeleton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearAuthSnapshot } from "@/lib/auth/auth-snapshot";

export default function UserMenu() {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return <Skeleton className="h-9 w-24" />;
	}

	const user = session?.user ?? null;
	if (!user) {
		return (
			<Link href="/login">
				<Button variant="outline">Entrar</Button>
			</Link>
		);
	}

	async function handleSignOut() {
		clearAuthSnapshot();
		await authClient.signOut();
		router.push("/login");
	}

	const displayName = user.name || user.email;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button variant="outline" />}>
				{displayName}
			</DropdownMenuTrigger>
			<DropdownMenuContent className="bg-card">
				<DropdownMenuGroup>
					<DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem>{user.email}</DropdownMenuItem>
					<DropdownMenuItem onClick={handleSignOut} variant="destructive">
						Sair
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
