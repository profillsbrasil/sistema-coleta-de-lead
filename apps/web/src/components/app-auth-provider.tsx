"use client";

import { authClient } from "@dashboard-leads-profills/auth/client";
import { createContext, useContext, useEffect, useState } from "react";
import {
	type AppAuthSnapshot,
	type AppUser,
	clearAuthSnapshot,
	createAuthSnapshot,
	readAuthSnapshot,
	resolveUserRole,
	writeAuthSnapshot,
} from "@/lib/auth/auth-snapshot";
import { coerceSnapshotToOfflineSeller } from "@/lib/auth/bootstrap";

interface AppAuthContextValue {
	isLoading: boolean;
	isOnline: boolean;
	snapshot: AppAuthSnapshot | null;
}

const AppAuthContext = createContext<AppAuthContextValue>({
	isLoading: true,
	isOnline: true,
	snapshot: null,
});

export function AppAuthProvider({ children }: { children: React.ReactNode }) {
	const [snapshot, setSnapshot] = useState<AppAuthSnapshot | null>(null);
	const [isOnline, setIsOnline] = useState(
		typeof navigator === "undefined" ? true : navigator.onLine,
	);
	const { data: session, isPending } = authClient.useSession();

	useEffect(() => {
		function handleOnlineStatus() {
			setIsOnline(navigator.onLine);
		}

		window.addEventListener("online", handleOnlineStatus);
		window.addEventListener("offline", handleOnlineStatus);

		return () => {
			window.removeEventListener("online", handleOnlineStatus);
			window.removeEventListener("offline", handleOnlineStatus);
		};
	}, []);

	useEffect(() => {
		if (snapshot) return;
		const stored = coerceSnapshotToOfflineSeller(readAuthSnapshot());
		if (stored) setSnapshot(stored);
	}, [snapshot]);

	useEffect(() => {
		let active = true;

		async function sync() {
			if (isPending) return;

			if (!session?.user) {
				if (!active) return;
				clearAuthSnapshot();
				setSnapshot(null);
				return;
			}

			const user: AppUser = {
				id: session.user.id,
				email: session.user.email,
				name: session.user.name,
				role: (session.user as { role?: string | null }).role ?? null,
			};
			const role = resolveUserRole(user.role);
			const next = await createAuthSnapshot(user, role);

			if (!active) return;
			setSnapshot((prev) => {
				if (
					prev &&
					prev.userId === next.userId &&
					prev.userRole === next.userRole &&
					prev.userName === next.userName &&
					prev.userEmail === next.userEmail
				) {
					return prev;
				}
				writeAuthSnapshot(next);
				return next;
			});
		}

		sync();

		return () => {
			active = false;
		};
	}, [session, isPending]);

	return (
		<AppAuthContext
			value={{
				isLoading: isPending && !snapshot,
				isOnline,
				snapshot,
			}}
		>
			{children}
		</AppAuthContext>
	);
}

export function useAppAuth(): AppAuthContextValue {
	return useContext(AppAuthContext);
}

export function useRequiredAppAuth(): AppAuthContextValue & {
	snapshot: AppAuthSnapshot;
} {
	const value = useAppAuth();
	if (!value.snapshot) {
		throw new Error("App auth snapshot is required for authenticated routes.");
	}
	return value as AppAuthContextValue & { snapshot: AppAuthSnapshot };
}
