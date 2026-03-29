import { describe, expect, it } from "vitest";
import {
	buildExportFilename,
	generateCsvContent,
} from "@/lib/lead/export-csv";

interface TestLead {
	company: string | null;
	createdAt: string;
	email: string | null;
	followUpStatus?: string | null;
	interestTag: "quente" | "morno" | "frio";
	name: string;
	notes: string | null;
	phone: string | null;
	position: string | null;
	segment: string | null;
}

function makeLead(overrides: Partial<TestLead> = {}): TestLead {
	return {
		name: "Joao Silva",
		phone: "11999887766",
		email: "joao@example.com",
		company: "Acme Corp",
		position: "Gerente",
		segment: "Tecnologia",
		interestTag: "quente",
		followUpStatus: "pendente",
		notes: "Interessado no produto X",
		createdAt: "2025-06-15T14:30:00.000Z",
		...overrides,
	};
}

describe("generateCsvContent", () => {
	it("keeps the BOM and the pt-BR CSV header", () => {
		const csv = generateCsvContent([]);

		expect(csv.startsWith("\uFEFF")).toBe(true);
		expect(csv.split("\n")[0]).toBe(
			"\uFEFFNome,Telefone,Email,Empresa,Cargo,Segmento,Interesse,Follow-up,Notas,Data de Criação"
		);
	});

	it("formats phone numbers using formatPhone", () => {
		const csv = generateCsvContent([makeLead({ phone: "11999887766" })]);
		const dataLine = csv.split("\n")[1] ?? "";
		// formatPhone("11999887766") => "(11) 99988-7766"
		expect(dataLine).toContain("(11) 99988-7766");
	});

	it("formats dates as DD/MM/YYYY", () => {
		const csv = generateCsvContent([
			makeLead({ createdAt: "2025-06-15T14:30:00.000Z" }),
		]);
		const dataLine = csv.split("\n")[1] ?? "";
		expect(dataLine).toContain("15/06/2025");
	});

	it("preserves accented values and multiline notes", () => {
		const csv = generateCsvContent([
			makeLead({
				company: "Ações Integradas",
				followUpStatus: "em_negociacao",
				notes: "Negociação em andamento\nRetornar amanhã",
				segment: "Tecnologia",
			}),
		]);

		expect(csv).toContain("Ações Integradas");
		expect(csv).toContain("Em Negociação");
		expect(csv).toContain('"Negociação em andamento\nRetornar amanhã"');
	});

	it("escapes commas in fields", () => {
		const csv = generateCsvContent([makeLead({ company: "Acme, Inc." })]);
		const dataLine = csv.split("\n")[1] ?? "";
		expect(dataLine).toContain('"Acme, Inc."');
	});

	it("escapes double quotes in fields", () => {
		const csv = generateCsvContent([makeLead({ notes: 'Disse "muito bom"' })]);
		const dataLine = csv.split("\n")[1] ?? "";
		expect(dataLine).toContain('"Disse ""muito bom"""');
	});

	it("translates interest tags to display labels", () => {
		const csvQuente = generateCsvContent([makeLead({ interestTag: "quente" })]);
		expect(csvQuente.split("\n")[1]).toContain("Quente");

		const csvMorno = generateCsvContent([makeLead({ interestTag: "morno" })]);
		expect(csvMorno.split("\n")[1]).toContain("Morno");

		const csvFrio = generateCsvContent([makeLead({ interestTag: "frio" })]);
		expect(csvFrio.split("\n")[1]).toContain("Frio");
	});

	it("neutralizes dangerous spreadsheet prefixes before CSV escaping", () => {
		const csv = generateCsvContent([
			makeLead({
				name: '=HYPERLINK("http://example.com")',
				email: "+contato@example.com",
				company: "-Acme",
				position: "@Diretoria",
				segment: "\tSegmento sigiloso",
				notes: "\r\nComeca em nova linha",
			}),
		]);

		expect(csv).toContain('"\'=HYPERLINK(""http://example.com"")"');
		expect(csv).toContain("'+contato@example.com");
		expect(csv).toContain("'-Acme");
		expect(csv).toContain("'@Diretoria");
		expect(csv).toContain("'\tSegmento sigiloso");
		expect(csv).toContain("\"'\nComeca em nova linha\"");
	});

	it("handles null and empty fields gracefully", () => {
		const csv = generateCsvContent([
			makeLead({
				phone: null,
				email: null,
				company: null,
				position: null,
				segment: null,
				notes: null,
			}),
		]);
		const dataLine = csv.split("\n")[1] ?? "";
		// Null fields should produce empty strings between commas
		const fields = dataLine.split(",");
		// phone (1), email (2), company (3), position (4), segment (5), follow-up (7=Pendente), notes (8) should be empty
		expect(fields[1]).toBe("");
		expect(fields[2]).toBe("");
		expect(fields[3]).toBe("");
		expect(fields[4]).toBe("");
		expect(fields[5]).toBe("");
		expect(fields[8]).toBe("");
	});

	it("generates complete row with all fields", () => {
		const csv = generateCsvContent([makeLead()]);
		const lines = csv.split("\n");
		expect(lines).toHaveLength(2);
		const dataLine = lines[1] ?? "";
		expect(dataLine).toContain("Joao Silva");
		expect(dataLine).toContain("(11) 99988-7766");
		expect(dataLine).toContain("joao@example.com");
		expect(dataLine).toContain("Acme Corp");
		expect(dataLine).toContain("Gerente");
		expect(dataLine).toContain("Tecnologia");
		expect(dataLine).toContain("Quente");
		expect(dataLine).toContain("Interessado no produto X");
	});
});

describe("buildExportFilename", () => {
	it("creates deterministic seller filenames for a filter scope", () => {
		expect(
			buildExportFilename({
				scope: "seller",
				scopeLabel: "Quente",
				date: new Date("2026-03-29T12:00:00.000Z"),
			})
		).toBe("leads-seller-quente-2026-03-29.csv");
	});

	it("slugifies accented admin scope labels", () => {
		expect(
			buildExportFilename({
				scope: "admin",
				scopeLabel: "Maria Silva Ações",
				date: new Date("2026-03-29T12:00:00.000Z"),
			})
		).toBe("leads-admin-maria-silva-acoes-2026-03-29.csv");
	});
});
