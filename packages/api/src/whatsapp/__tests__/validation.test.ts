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
		const r = validateName("  Ana Silva  ");
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.value).toBe("Ana Silva");
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

	it("min exato com sobrenome passa", () => {
		const r = validateName("Jo Da");
		expect(r.ok).toBe(true);
	});

	it("> max → too_long", () => {
		const r = validateName("A".repeat(NAME_MAX + 1));
		expect(r).toEqual({ ok: false, reason: "too_long" });
	});

	it("max exato com sobrenome passa", () => {
		const first = "A".repeat(40);
		const last = "B".repeat(39);
		const r = validateName(`${first} ${last}`);
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

	it("só primeiro nome → missing_surname", () => {
		const r = validateName("Othavio");
		expect(r).toEqual({ ok: false, reason: "missing_surname" });
	});

	it("sobrenome com 1 letra → missing_surname", () => {
		const r = validateName("Othavio Q");
		expect(r).toEqual({ ok: false, reason: "missing_surname" });
	});

	it("aceita nome composto (3+ palavras)", () => {
		const r = validateName("Maria da Silva");
		expect(r.ok).toBe(true);
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

	it("rejeita só números → only_digits", () => {
		const r = validateCompany("12345");
		expect(r).toEqual({ ok: false, reason: "only_digits" });
	});

	it("rejeita números com símbolos mas sem letras → only_digits", () => {
		const r = validateCompany("123 456");
		expect(r).toEqual({ ok: false, reason: "only_digits" });
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
