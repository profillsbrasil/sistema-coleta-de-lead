import type { Session, User } from "@supabase/supabase-js";
import { getGravatarUrl } from "@/lib/gravatar";

export const AUTH_SNAPSHOT_STORAGE_KEY = "app-auth-snapshot";

export type AppUserRole = "admin" | "vendedor";

export interface AppAuthSnapshot {
	gravatarUrl: string;
	lastValidatedAt: string;
	userEmail: string;
	userId: string;
	userName: string;
	userRole: AppUserRole;
}

function isUserRole(value: unknown): value is AppUserRole {
	return value === "admin" || value === "vendedor";
}

function isAuthSnapshot(value: unknown): value is AppAuthSnapshot {
	if (!value || typeof value !== "object") {
		return false;
	}

	const snapshot = value as Record<string, unknown>;
	return (
		typeof snapshot.gravatarUrl === "string" &&
		typeof snapshot.lastValidatedAt === "string" &&
		typeof snapshot.userEmail === "string" &&
		typeof snapshot.userId === "string" &&
		typeof snapshot.userName === "string" &&
		isUserRole(snapshot.userRole)
	);
}

export function parseAuthSnapshot(raw: string | null): AppAuthSnapshot | null {
	if (!raw) {
		return null;
	}

	try {
		const parsed: unknown = JSON.parse(raw);
		return isAuthSnapshot(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

export function readAuthSnapshot(): AppAuthSnapshot | null {
	if (typeof window === "undefined") {
		return null;
	}

	return parseAuthSnapshot(
		window.localStorage.getItem(AUTH_SNAPSHOT_STORAGE_KEY)
	);
}

export function writeAuthSnapshot(snapshot: AppAuthSnapshot): void {
	if (typeof window === "undefined") {
		return;
	}

	window.localStorage.setItem(
		AUTH_SNAPSHOT_STORAGE_KEY,
		JSON.stringify(snapshot)
	);
}

export function clearAuthSnapshot(): void {
	if (typeof window === "undefined") {
		return;
	}

	window.localStorage.removeItem(AUTH_SNAPSHOT_STORAGE_KEY);
}

function getUserName(user: Pick<User, "email" | "user_metadata">): string {
	const fullName = user.user_metadata?.full_name;
	if (typeof fullName === "string" && fullName.trim() !== "") {
		return fullName;
	}

	if (typeof user.email === "string" && user.email.includes("@")) {
		return user.email.split("@")[0] ?? "Usuario";
	}

	return "Usuario";
}

export async function createAuthSnapshot(
	user: Pick<User, "email" | "id" | "user_metadata">,
	userRole: AppUserRole
): Promise<AppAuthSnapshot> {
	const userEmail = user.email ?? "";

	return {
		gravatarUrl: await getGravatarUrl(userEmail),
		lastValidatedAt: new Date().toISOString(),
		userEmail,
		userId: user.id,
		userName: getUserName(user),
		userRole,
	};
}

export function getSessionUserRole(
	claims: Record<string, unknown> | null | undefined,
	fallbackRole: AppUserRole = "vendedor"
): AppUserRole {
	const claimRole = claims?.user_role;
	return isUserRole(claimRole) ? claimRole : fallbackRole;
}

export function hasStoredAuthSnapshot(): boolean {
	return readAuthSnapshot() !== null;
}

export function getSessionUser(session: Session | null): User | null {
	return session?.user ?? null;
}
