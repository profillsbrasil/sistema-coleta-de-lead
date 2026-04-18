"use client";

import { authClient } from "@dashboard-leads-profills/auth/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
	hasStoredAuthSnapshot,
	readAuthSnapshot,
} from "@/lib/auth/auth-snapshot";

export default function HomePage() {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();

	useEffect(() => {
		if (hasStoredAuthSnapshot()) {
			router.replace("/dashboard");
			return;
		}
		if (isPending) return;
		router.replace(session || readAuthSnapshot() ? "/dashboard" : "/login");
	}, [router, session, isPending]);

	return (
		<div className="flex min-h-svh items-center justify-center p-4 text-muted-foreground text-sm">
			Preparando acesso...
		</div>
	);
}
