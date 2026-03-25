import { describe, expect, it } from "vitest";
import { leadFormSchema } from "./validation";

describe("leadFormSchema", () => {
	it("accepts valid lead with name, phone, and interestTag", () => {
		const result = leadFormSchema.parse({
			name: "Joao",
			phone: "11999",
			interestTag: "morno",
		});

		expect(result.name).toBe("Joao");
		expect(result.phone).toBe("11999");
		expect(result.interestTag).toBe("morno");
	});

	it("rejects empty name with 'Nome e obrigatorio'", () => {
		expect(() => leadFormSchema.parse({ name: "", phone: "11999" })).toThrow(
			"Nome e obrigatorio"
		);
	});

	it("rejects when neither phone nor email is provided", () => {
		expect(() => leadFormSchema.parse({ name: "Joao" })).toThrow(
			"Informe telefone ou email"
		);
	});

	it("accepts lead with email only (no phone)", () => {
		const result = leadFormSchema.parse({
			name: "Joao",
			email: "a@b.com",
		});

		expect(result.email).toBe("a@b.com");
		expect(result.phone).toBe("");
	});

	it("rejects invalid interestTag", () => {
		expect(() =>
			leadFormSchema.parse({
				name: "Joao",
				phone: "11999",
				interestTag: "invalido",
			})
		).toThrow();
	});

	it("defaults interestTag to 'morno' when omitted", () => {
		const result = leadFormSchema.parse({
			name: "Joao",
			phone: "11999",
		});

		expect(result.interestTag).toBe("morno");
	});

	it("defaults optional fields to empty string", () => {
		const result = leadFormSchema.parse({
			name: "Joao",
			phone: "11999",
		});

		expect(result.company).toBe("");
		expect(result.position).toBe("");
		expect(result.segment).toBe("");
		expect(result.notes).toBe("");
	});
});
