"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
	hasStoredAuthSnapshot,
	readAuthSnapshot,
} from "@/lib/auth/auth-snapshot";
import { resolveWithTimeout, SESSION_TIMEOUT_MS } from "@/lib/auth/bootstrap";
import { createClient } from "@/lib/supabase/client";

export default function HomePage() {
	const router = useRouter();

	useEffect(() => {
		let cancelled = false;

		async function redirectToEntryPoint() {
			if (hasStoredAuthSnapshot()) {
				router.replace("/dashboard");
				return;
			}

			try {
				const supabase = createClient();
				const session = await resolveWithTimeout(
					supabase.auth.getSession().then(({ data }) => data.session),
					SESSION_TIMEOUT_MS
				);
				if (cancelled) {
					return;
				}

				router.replace(session || readAuthSnapshot() ? "/dashboard" : "/login");
			} catch {
				if (!cancelled) {
					router.replace("/login");
				}
			}
		}

		redirectToEntryPoint().catch(() => {
			if (!cancelled) {
				router.replace("/login");
			}
		});

		return () => {
			cancelled = true;
		};
	}, [router]);

	return (
		<div className="flex min-h-svh items-center justify-center p-4 text-muted-foreground text-sm">
			Preparando acesso...
		</div>
	);
}
