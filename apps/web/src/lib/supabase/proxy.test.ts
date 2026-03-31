import { describe, expect, it } from "vitest";
import { isPublicPath, shouldBypassSessionProxy } from "./proxy";

describe("isPublicPath", () => {
	it("permite rotas publicas e assets do service worker", () => {
		expect(isPublicPath("/")).toBe(true);
		expect(isPublicPath("/login")).toBe(true);
		expect(isPublicPath("/auth/callback")).toBe(true);
		expect(isPublicPath("/offline")).toBe(true);
		expect(isPublicPath("/sw.js")).toBe(true);
	});

	it("mantem rotas autenticadas como privadas", () => {
		expect(isPublicPath("/dashboard")).toBe(false);
		expect(isPublicPath("/leads")).toBe(false);
		expect(isPublicPath("/admin/users")).toBe(false);
	});
});

describe("shouldBypassSessionProxy", () => {
	it("ignora requests de API", () => {
		expect(shouldBypassSessionProxy("/api/health")).toBe(true);
		expect(shouldBypassSessionProxy("/api/trpc/healthCheck")).toBe(true);
	});

	it("nao ignora paginas do app", () => {
		expect(shouldBypassSessionProxy("/dashboard")).toBe(false);
	});
});
