import { describe, expect, it } from "vitest";
import { isHandoffKeyword, isSorteioKeyword } from "../keyword";

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

describe("isHandoffKeyword", () => {
	it("retorna true para 'atendente'", () => {
		expect(isHandoffKeyword("atendente")).toBe(true);
	});

	it("retorna true para 'preciso de ajuda'", () => {
		expect(isHandoffKeyword("preciso de ajuda")).toBe(true);
	});

	it("retorna true para 'falar com alguem' (sem acento)", () => {
		expect(isHandoffKeyword("falar com alguem")).toBe(true);
	});

	it("retorna true para 'tem alguém aí' (com acento)", () => {
		expect(isHandoffKeyword("tem alguém aí")).toBe(true);
	});

	it("retorna true para 'estou com um problema no produto'", () => {
		expect(isHandoffKeyword("estou com um problema no produto")).toBe(true);
	});

	it("retorna true para 'SUPORTE' (case-insensitive)", () => {
		expect(isHandoffKeyword("SUPORTE")).toBe(true);
	});

	it("retorna true para 'humano' (isolado)", () => {
		expect(isHandoffKeyword("humano")).toBe(true);
	});

	it("retorna false para 'oi tudo bem'", () => {
		expect(isHandoffKeyword("oi tudo bem")).toBe(false);
	});

	it("retorna false para texto vazio", () => {
		expect(isHandoffKeyword("")).toBe(false);
	});

	it("retorna false para não-string", () => {
		expect(isHandoffKeyword(null as unknown as string)).toBe(false);
	});
});
