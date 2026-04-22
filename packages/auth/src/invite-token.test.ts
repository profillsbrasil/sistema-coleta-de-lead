import { describe, expect, it } from "vitest";
import { computeInviteToken, timingSafeEqual } from "./invite-token";

const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;

describe("computeInviteToken", () => {
	it("gera token determinístico para mesmo input", async () => {
		const a = await computeInviteToken(
			"367",
			"secret-32-chars-long-xxxxxxxxxxxx"
		);
		const b = await computeInviteToken(
			"367",
			"secret-32-chars-long-xxxxxxxxxxxx"
		);
		expect(a).toBe(b);
	});

	it("gera tokens diferentes para códigos diferentes", async () => {
		const a = await computeInviteToken(
			"367",
			"secret-32-chars-long-xxxxxxxxxxxx"
		);
		const b = await computeInviteToken(
			"368",
			"secret-32-chars-long-xxxxxxxxxxxx"
		);
		expect(a).not.toBe(b);
	});

	it("gera tokens diferentes para secrets diferentes", async () => {
		const a = await computeInviteToken(
			"367",
			"secret-A-32-chars-xxxxxxxxxxxxxxxxx"
		);
		const b = await computeInviteToken(
			"367",
			"secret-B-32-chars-xxxxxxxxxxxxxxxxx"
		);
		expect(a).not.toBe(b);
	});

	it("produz valor base64url sem padding", async () => {
		const token = await computeInviteToken(
			"367",
			"secret-32-chars-long-xxxxxxxxxxxx"
		);
		expect(token).toMatch(BASE64URL_RE);
	});
});

describe("timingSafeEqual", () => {
	it("retorna true para strings iguais", () => {
		expect(timingSafeEqual("abc", "abc")).toBe(true);
	});
	it("retorna false para strings diferentes", () => {
		expect(timingSafeEqual("abc", "abd")).toBe(false);
	});
	it("retorna false para tamanhos diferentes", () => {
		expect(timingSafeEqual("abc", "abcd")).toBe(false);
	});
});
