import type { AppUserRole } from "@/lib/auth/auth-snapshot";

export interface AccountSyncActionStatus {
	authExpired: boolean;
	isOnline: boolean;
	isStalled: boolean;
	isSyncing: boolean;
	lastError: string | null;
	pendingCount: number;
	retryAttempt: number | null;
}

export function getAccountRoleLabel(role: AppUserRole): string {
	return role === "admin" ? "Admin" : "Vendedor";
}

export function formatAccountRank(rank: number | null | undefined): string {
	return typeof rank === "number" ? `#${rank}` : "Sem ranking";
}

export function canRetryAccountSync(status: AccountSyncActionStatus): boolean {
	if (!status.isOnline || status.isSyncing || status.authExpired) {
		return false;
	}

	return (
		status.pendingCount > 0 ||
		status.lastError !== null ||
		status.isStalled ||
		status.retryAttempt !== null
	);
}

export function getAccountSyncActionLabel(
	status: AccountSyncActionStatus
): string {
	if (!status.isOnline) {
		return "Offline";
	}
	if (status.authExpired) {
		return "Login necessario";
	}
	if (status.isSyncing) {
		return "Sincronizando...";
	}
	return canRetryAccountSync(status) ? "Tentar sincronizar" : "Sincronizado";
}
