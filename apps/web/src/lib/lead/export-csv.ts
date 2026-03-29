import { formatPhone } from "@/lib/masks/phone";

interface ExportableLead {
	company: string | null;
	createdAt: string | Date;
	email: string | null;
	followUpStatus?: string | null;
	interestTag: "quente" | "morno" | "frio";
	name: string;
	notes: string | null;
	phone: string | null;
	position: string | null;
	segment: string | null;
}

interface BuildExportFilenameInput {
	date: Date;
	scope: "seller" | "admin";
	scopeLabel: string;
}

const TAG_LABELS: Record<string, string> = {
	quente: "Quente",
	morno: "Morno",
	frio: "Frio",
};

const FOLLOW_UP_LABELS: Record<string, string> = {
	pendente: "Pendente",
	contatado: "Contatado",
	em_negociacao: "Em Negociação",
	convertido: "Convertido",
	perdido: "Perdido",
};

const CSV_HEADER =
	"Nome,Telefone,Email,Empresa,Cargo,Segmento,Interesse,Follow-up,Notas,Data de Criação";

const DIACRITICS_REGEX = /[\u0300-\u036f]/g;
const NON_SLUG_CHARACTERS_REGEX = /[^a-z0-9]+/g;
const TRIM_HYPHENS_REGEX = /^-+|-+$/g;

export const DANGEROUS_SPREADSHEET_PREFIX = /^[=+\-@\t\r\n]/;

function escapeCsvField(value: string): string {
	if (value.includes(",") || value.includes('"') || value.includes("\n")) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

function formatDate(dateStr: string | Date): string {
	const date = new Date(dateStr);
	const day = String(date.getDate()).padStart(2, "0");
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const year = date.getFullYear();
	return `${day}/${month}/${year}`;
}

function slugifyScopeLabel(
	scope: BuildExportFilenameInput["scope"],
	scopeLabel: string
): string {
	const slug = scopeLabel
		.trim()
		.toLowerCase()
		.normalize("NFD")
		.replace(DIACRITICS_REGEX, "")
		.replace(NON_SLUG_CHARACTERS_REGEX, "-")
		.replace(TRIM_HYPHENS_REGEX, "");

	if (slug !== "") {
		return slug;
	}

	return scope === "seller" ? "todos" : "escopo";
}

function formatCsvCell(value: string): string {
	return escapeCsvField(sanitizeSpreadsheetCell(value));
}

function serializeLeadRow(lead: ExportableLead): string {
	const fields = [
		lead.name,
		lead.phone ? formatPhone(lead.phone) : "",
		lead.email ?? "",
		lead.company ?? "",
		lead.position ?? "",
		lead.segment ?? "",
		TAG_LABELS[lead.interestTag] ?? lead.interestTag,
		lead.followUpStatus
			? (FOLLOW_UP_LABELS[lead.followUpStatus] ?? lead.followUpStatus)
			: "Pendente",
		lead.notes ?? "",
		formatDate(lead.createdAt),
	];

	return fields.map(formatCsvCell).join(",");
}

export function sanitizeSpreadsheetCell(value: string): string {
	const normalizedValue = value.replace(/\r\n/g, "\n");

	if (DANGEROUS_SPREADSHEET_PREFIX.test(normalizedValue)) {
		return `'${normalizedValue}`;
	}

	return normalizedValue;
}

export function buildExportFilename({
	date,
	scope,
	scopeLabel,
}: BuildExportFilenameInput): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const slug = slugifyScopeLabel(scope, scopeLabel);

	return `leads-${scope}-${slug}-${year}-${month}-${day}.csv`;
}

export function generateCsvContent(leads: ExportableLead[]): string {
	const rows = leads.map(serializeLeadRow);

	return `\uFEFF${CSV_HEADER}\n${rows.join("\n")}`;
}

export function exportLeadsCsv(
	leads: ExportableLead[],
	filename = buildExportFilename({
		scope: "seller",
		scopeLabel: "todos",
		date: new Date(),
	})
): void {
	const csv = generateCsvContent(leads);
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);

	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.click();

	URL.revokeObjectURL(url);
}
