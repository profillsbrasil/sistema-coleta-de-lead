import { describe, expect, it } from "vitest";
import { coerceSnapshotToOfflineSeller, resolveWithTimeout } from "./bootstrap";

describe("coerceSnapshotToOfflineSeller", () => {
	it("forca role vendedor offline", () => {
		expect(
			coerceSnapshotToOfflineSeller({
				gravatarUrl: "https://gravatar.com/avatar/hash",
				lastValidatedAt: "2026-03-31T12:00:00.000Z",
				userEmail: "admin@example.com",
				userId: "user-123",
				userName: "Admin",
				userRole: "admin",
			})
		).toEqual({
			gravatarUrl: "https://gravatar.com/avatar/hash",
			lastValidatedAt: "2026-03-31T12:00:00.000Z",
			userEmail: "admin@example.com",
			userId: "user-123",
			userName: "Admin",
			userRole: "vendedor",
		});
	});
});

describe("resolveWithTimeout", () => {
	it("retorna null quando a promise nao resolve a tempo", async () => {
		const result = await resolveWithTimeout(
			new Promise<string>(() => undefined),
			10
		);

		expect(result).toBeNull();
	});

	it("retorna o valor quando a promise resolve dentro do limite", async () => {
		await expect(resolveWithTimeout(Promise.resolve("ok"), 50)).resolves.toBe(
			"ok"
		);
	});
});
