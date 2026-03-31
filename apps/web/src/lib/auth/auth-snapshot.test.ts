import { describe, expect, it } from "vitest";
import { getSessionUserRole, parseAuthSnapshot } from "./auth-snapshot";

describe("parseAuthSnapshot", () => {
	it("retorna null para JSON invalido", () => {
		expect(parseAuthSnapshot("{")).toBeNull();
	});

	it("retorna null para payload incompleto", () => {
		expect(parseAuthSnapshot(JSON.stringify({ userId: "123" }))).toBeNull();
	});

	it("retorna o snapshot quando o payload e valido", () => {
		expect(
			parseAuthSnapshot(
				JSON.stringify({
					gravatarUrl: "https://gravatar.com/avatar/hash",
					lastValidatedAt: "2026-03-31T12:00:00.000Z",
					userEmail: "vendedor@example.com",
					userId: "user-123",
					userName: "Maria",
					userRole: "vendedor",
				})
			)
		).toEqual({
			gravatarUrl: "https://gravatar.com/avatar/hash",
			lastValidatedAt: "2026-03-31T12:00:00.000Z",
			userEmail: "vendedor@example.com",
			userId: "user-123",
			userName: "Maria",
			userRole: "vendedor",
		});
	});
});

describe("getSessionUserRole", () => {
	it("usa a role do claim quando ela e valida", () => {
		expect(getSessionUserRole({ user_role: "admin" })).toBe("admin");
	});

	it("faz fallback para vendedor quando o claim nao existe", () => {
		expect(getSessionUserRole(undefined)).toBe("vendedor");
	});

	it("mantem o fallback informado quando o claim e invalido", () => {
		expect(getSessionUserRole({ user_role: "root" }, "admin")).toBe("admin");
	});
});
