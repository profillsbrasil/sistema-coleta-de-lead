import { describe, expect, it } from "vitest";
import { formatPhone, maskPhoneInput, unmaskPhone } from "./phone";

describe("unmaskPhone", () => {
	it("remove tudo que nao e digito", () => {
		expect(unmaskPhone("(51) 99647-4579")).toBe("51996474579");
	});

	it("remove letras completamente", () => {
		expect(unmaskPhone("51abc996e47")).toBe("5199647");
	});

	it("retorna string vazia para input sem digitos", () => {
		expect(unmaskPhone("abc")).toBe("");
	});

	it("retorna string vazia para input vazio", () => {
		expect(unmaskPhone("")).toBe("");
	});
});

describe("formatPhone", () => {
	it("formata celular 11 digitos", () => {
		expect(formatPhone("51996474579")).toBe("(51) 99647-4579");
	});

	it("formata fixo 10 digitos", () => {
		expect(formatPhone("5133334579")).toBe("(51) 3333-4579");
	});

	it("formata a partir de string ja mascarada", () => {
		expect(formatPhone("(51) 99647-4579")).toBe("(51) 99647-4579");
	});

	it("retorna digitos crus para quantidade invalida", () => {
		expect(formatPhone("519964")).toBe("519964");
	});

	it("retorna string vazia para input vazio", () => {
		expect(formatPhone("")).toBe("");
	});
});

describe("maskPhoneInput", () => {
	it("retorna vazio para input vazio", () => {
		expect(maskPhoneInput("")).toBe("");
	});

	it("formata apenas DDD parcial", () => {
		expect(maskPhoneInput("5")).toBe("(5");
		expect(maskPhoneInput("51")).toBe("(51");
	});

	it("formata DDD + inicio do numero", () => {
		expect(maskPhoneInput("519")).toBe("(51) 9");
		expect(maskPhoneInput("51996")).toBe("(51) 996");
	});

	it("formata numero fixo parcial com hifen", () => {
		expect(maskPhoneInput("5133334")).toBe("(51) 3333-4");
		expect(maskPhoneInput("5133334579")).toBe("(51) 3333-4579");
	});

	it("formata celular completo 11 digitos", () => {
		expect(maskPhoneInput("51996474579")).toBe("(51) 99647-4579");
	});

	it("limita a 11 digitos", () => {
		expect(maskPhoneInput("519964745791234")).toBe("(51) 99647-4579");
	});

	it("bloqueia letras — so preserva digitos", () => {
		expect(maskPhoneInput("5e1a9b")).toBe("(51) 9");
	});

	it("bloqueia input puramente textual", () => {
		expect(maskPhoneInput("abcdef")).toBe("");
	});
});
