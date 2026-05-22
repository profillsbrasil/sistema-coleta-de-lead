import { describe, expect, it } from "vitest";
import { formatRelativeTime, hasPersonalDivergence } from "./consistency";

describe("formatRelativeTime", () => {
	const now = new Date("2026-05-22T12:00:00.000Z").getTime();

	it("retorna 'agora' para menos de um minuto", () => {
		expect(formatRelativeTime("2026-05-22T11:59:30.000Z", now)).toBe("agora");
	});

	it("formata minutos", () => {
		expect(formatRelativeTime("2026-05-22T11:57:00.000Z", now)).toBe(
			"há 3 min"
		);
	});

	it("formata horas", () => {
		expect(formatRelativeTime("2026-05-22T10:00:00.000Z", now)).toBe("há 2 h");
	});

	it("formata dias", () => {
		expect(formatRelativeTime("2026-05-20T12:00:00.000Z", now)).toBe("há 2 d");
	});
});

describe("hasPersonalDivergence", () => {
	it("detecta divergência em estado estável", () => {
		expect(
			hasPersonalDivergence({
				localTotal: 5,
				serverTotal: 8,
				pendingCount: 0,
				isSyncing: false,
			})
		).toBe(true);
	});

	it("ignora divergência durante o sync", () => {
		expect(
			hasPersonalDivergence({
				localTotal: 5,
				serverTotal: 8,
				pendingCount: 0,
				isSyncing: true,
			})
		).toBe(false);
	});

	it("ignora divergência com operações pendentes", () => {
		expect(
			hasPersonalDivergence({
				localTotal: 5,
				serverTotal: 8,
				pendingCount: 2,
				isSyncing: false,
			})
		).toBe(false);
	});

	it("não diverge sem dado do servidor", () => {
		expect(
			hasPersonalDivergence({
				localTotal: 5,
				serverTotal: null,
				pendingCount: 0,
				isSyncing: false,
			})
		).toBe(false);
	});

	it("não diverge quando os totais batem", () => {
		expect(
			hasPersonalDivergence({
				localTotal: 8,
				serverTotal: 8,
				pendingCount: 0,
				isSyncing: false,
			})
		).toBe(false);
	});
});
