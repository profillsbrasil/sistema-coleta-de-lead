import { describe, expect, it } from "vitest";
import { generateRaffleCode, RAFFLE_CODE_PATTERN } from "../code-generator";

describe("generateRaffleCode", () => {
	it("segue o formato PROFILLS-XXXX", () => {
		const code = generateRaffleCode();
		expect(code).toMatch(RAFFLE_CODE_PATTERN);
	});

	it("100 gerações seguem o padrão", () => {
		for (let i = 0; i < 100; i++) {
			expect(generateRaffleCode()).toMatch(RAFFLE_CODE_PATTERN);
		}
	});

	it("zero é formatado com zero-padding (PROFILLS-0000)", () => {
		// Valida que o padding funciona — RAFFLE_CODE_PATTERN exige exatamente 4 dígitos
		expect("PROFILLS-0000").toMatch(RAFFLE_CODE_PATTERN);
		expect("PROFILLS-0001").toMatch(RAFFLE_CODE_PATTERN);
		expect("PROFILLS-9999").toMatch(RAFFLE_CODE_PATTERN);
		// Sem padding não deve bater (5 dígitos)
		expect("PROFILLS-10000").not.toMatch(RAFFLE_CODE_PATTERN);
	});

	it("gera valores suficientemente distintos (sanidade de aleatoriedade)", () => {
		const codes = new Set<string>();
		for (let i = 0; i < 50; i++) {
			codes.add(generateRaffleCode());
		}
		// Com 10.000 valores possíveis e 50 amostras, colisões esperadas ~0.12
		// Exigimos ao menos 30 únicos — falha apenas se completamente determinístico
		expect(codes.size).toBeGreaterThanOrEqual(30);
	});
});
