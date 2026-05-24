import { describe, expect, it } from "vitest";
import {
	COMPANY_MAX,
	COMPANY_MIN,
	NAME_MAX,
	NAME_MIN,
	validateCompany,
	validateName,
} from "../validation";

describe("validateName", () => {
	it("aceita nome válido com acento", () => {
		const r = validateName("João Silva");
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.value).toBe("João Silva");
	});

	it("aceita nome com hífen e apóstrofo", () => {
		const r = validateName("Ana-Maria D'Alessandro");
		expect(r.ok).toBe(true);
	});

	it("trim antes de validar", () => {
		const r = validateName("  Ana  ");
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.value).toBe("Ana");
	});

	it("string vazia → empty", () => {
		const r = validateName("");
		expect(r).toEqual({ ok: false, reason: "empty" });
	});

	it("só espaços → empty", () => {
		const r = validateName("   ");
		expect(r).toEqual({ ok: false, reason: "empty" });
	});

	it("não-string → empty", () => {
		const r = validateName(123);
		expect(r).toEqual({ ok: false, reason: "empty" });
	});

	it("1 caractere → too_short", () => {
		const r = validateName("X");
		expect(r).toEqual({ ok: false, reason: "too_short" });
	});

	it("min exato passa", () => {
		const r = validateName("Jo");
		expect(r.ok).toBe(true);
	});

	it("> max → too_long", () => {
		const r = validateName("A".repeat(NAME_MAX + 1));
		expect(r).toEqual({ ok: false, reason: "too_long" });
	});

	it("max exato passa", () => {
		const r = validateName("A".repeat(NAME_MAX));
		expect(r.ok).toBe(true);
	});

	it("rejeita números", () => {
		const r = validateName("João 123");
		expect(r).toEqual({ ok: false, reason: "invalid_chars" });
	});

	it("rejeita símbolos (@, #, !)", () => {
		const r = validateName("João@Silva");
		expect(r).toEqual({ ok: false, reason: "invalid_chars" });
	});

	it("rejeita emoji", () => {
		const r = validateName("João 👋");
		expect(r).toEqual({ ok: false, reason: "invalid_chars" });
	});
});

describe("validateCompany", () => {
	it("aceita nome simples", () => {
		const r = validateCompany("Profills");
		expect(r.ok).toBe(true);
	});

	it("aceita S.A.", () => {
		const r = validateCompany("Indústria XYZ S.A.");
		expect(r.ok).toBe(true);
	});

	it("aceita & (R&D)", () => {
		const r = validateCompany("R&D Soluções");
		expect(r.ok).toBe(true);
	});

	it("aceita números (Tech 360)", () => {
		const r = validateCompany("Tech 360");
		expect(r.ok).toBe(true);
	});

	it("aceita / (Indústria/Comércio)", () => {
		const r = validateCompany("Indústria/Comércio");
		expect(r.ok).toBe(true);
	});

	it("trim antes de validar", () => {
		const r = validateCompany("  Profills  ");
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.value).toBe("Profills");
	});

	it("vazio → empty", () => {
		const r = validateCompany("");
		expect(r).toEqual({ ok: false, reason: "empty" });
	});

	it("só espaços → empty", () => {
		const r = validateCompany("   ");
		expect(r).toEqual({ ok: false, reason: "empty" });
	});

	it("2 caracteres → too_short (min é 3)", () => {
		const r = validateCompany("AB");
		expect(r).toEqual({ ok: false, reason: "too_short" });
	});

	it("min exato (3) passa", () => {
		const r = validateCompany("ABC");
		expect(r.ok).toBe(true);
	});

	it("> max → too_long", () => {
		const r = validateCompany("A".repeat(COMPANY_MAX + 1));
		expect(r).toEqual({ ok: false, reason: "too_long" });
	});

	it("rejeita @", () => {
		const r = validateCompany("Profills@");
		expect(r).toEqual({ ok: false, reason: "invalid_chars" });
	});

	it("rejeita emoji", () => {
		const r = validateCompany("Profills 🚀");
		expect(r).toEqual({ ok: false, reason: "invalid_chars" });
	});
});

describe("constantes exportadas", () => {
	it("NAME_MIN < NAME_MAX", () => {
		expect(NAME_MIN).toBeLessThan(NAME_MAX);
	});

	it("COMPANY_MIN < COMPANY_MAX", () => {
		expect(COMPANY_MIN).toBeLessThan(COMPANY_MAX);
	});
});
