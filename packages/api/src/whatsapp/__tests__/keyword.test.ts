import { describe, expect, it } from "vitest";
import { isSorteioKeyword } from "../keyword";

describe("isSorteioKeyword", () => {
	it("retorna true para 'Sorteio Profills Fispal 2026' (exato do wa.me)", () => {
		expect(isSorteioKeyword("Sorteio Profills Fispal 2026")).toBe(true);
	});

	it("retorna true para 'eu quero participar do sorteio'", () => {
		expect(isSorteioKeyword("eu quero participar do sorteio")).toBe(true);
	});

	it("retorna true para 'SORTEIO' (case-insensitive)", () => {
		expect(isSorteioKeyword("SORTEIO")).toBe(true);
	});

	it("retorna true para 'sortêio' (com acento)", () => {
		expect(isSorteioKeyword("sortêio")).toBe(true);
	});

	it("retorna true para 'quero participar'", () => {
		expect(isSorteioKeyword("quero participar")).toBe(true);
	});

	it("retorna false para 'oi tudo bem?'", () => {
		expect(isSorteioKeyword("oi tudo bem?")).toBe(false);
	});

	it("retorna false para texto vazio", () => {
		expect(isSorteioKeyword("")).toBe(false);
	});

	it("retorna false para apenas espaços", () => {
		expect(isSorteioKeyword("   ")).toBe(false);
	});

	it("retorna false para null/undefined-like (não-string)", () => {
		expect(isSorteioKeyword(null as unknown as string)).toBe(false);
	});

	it("retorna true para 'PaRtIcIpAr' isolado (case+substring)", () => {
		expect(isSorteioKeyword("PaRtIcIpAr")).toBe(true);
	});

	it("retorna true para 'não quero participar' (falso positivo conhecido — filtrado por LGPD downstream)", () => {
		expect(isSorteioKeyword("não quero participar")).toBe(true);
	});
});
