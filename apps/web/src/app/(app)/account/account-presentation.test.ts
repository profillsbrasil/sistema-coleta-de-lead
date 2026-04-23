import { describe, expect, it } from "vitest";
import {
	type AccountSyncActionStatus,
	canRetryAccountSync,
	formatAccountRank,
	getAccountRoleLabel,
	getAccountSyncActionLabel,
} from "./account-presentation";

const baseStatus: AccountSyncActionStatus = {
	authExpired: false,
	isOnline: true,
	isStalled: false,
	isSyncing: false,
	lastError: null,
	pendingCount: 0,
	retryAttempt: null,
};

describe("account presentation", () => {
	it("formats account role labels", () => {
		expect(getAccountRoleLabel("admin")).toBe("Admin");
		expect(getAccountRoleLabel("vendedor")).toBe("Vendedor");
	});

	it("formats rank with a fallback", () => {
		expect(formatAccountRank(4)).toBe("#4");
		expect(formatAccountRank(null)).toBe("Sem ranking");
		expect(formatAccountRank(undefined)).toBe("Sem ranking");
	});

	it("allows sync retry for pending local changes", () => {
		expect(
			canRetryAccountSync({
				...baseStatus,
				pendingCount: 2,
			})
		).toBe(true);
	});

	it("allows sync retry after sync errors or stalled sync", () => {
		expect(
			canRetryAccountSync({
				...baseStatus,
				lastError: "Falha de rede",
			})
		).toBe(true);
		expect(
			canRetryAccountSync({
				...baseStatus,
				isStalled: true,
			})
		).toBe(true);
	});

	it("disables sync retry while offline, syncing, or auth expired", () => {
		expect(
			canRetryAccountSync({
				...baseStatus,
				isOnline: false,
				pendingCount: 1,
			})
		).toBe(false);
		expect(
			canRetryAccountSync({
				...baseStatus,
				isSyncing: true,
				pendingCount: 1,
			})
		).toBe(false);
		expect(
			canRetryAccountSync({
				...baseStatus,
				authExpired: true,
				pendingCount: 1,
			})
		).toBe(false);
	});

	it("returns action labels for blocked sync states", () => {
		expect(
			getAccountSyncActionLabel({
				...baseStatus,
				isOnline: false,
			})
		).toBe("Offline");
		expect(
			getAccountSyncActionLabel({
				...baseStatus,
				authExpired: true,
			})
		).toBe("Login necessario");
		expect(
			getAccountSyncActionLabel({
				...baseStatus,
				isSyncing: true,
			})
		).toBe("Sincronizando...");
		expect(getAccountSyncActionLabel(baseStatus)).toBe("Sincronizado");
		expect(
			getAccountSyncActionLabel({
				...baseStatus,
				pendingCount: 1,
			})
		).toBe("Tentar sincronizar");
	});
});
