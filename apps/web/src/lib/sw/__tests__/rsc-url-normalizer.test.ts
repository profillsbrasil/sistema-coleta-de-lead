import { describe, expect, it } from "vitest";
import { normalizeRscUrl } from "../rsc-url-normalizer";

describe("normalizeRscUrl", () => {
	it("remove o parametro _rsc de uma URL com apenas _rsc", () => {
		const result = normalizeRscUrl(
			"https://example.com/dashboard?_rsc=abc123",
		);
		expect(result).toBe("https://example.com/dashboard");
	});

	it("remove apenas _rsc e mantem outros parametros intactos", () => {
		const result = normalizeRscUrl(
			"https://example.com/leads?_rsc=xyz&other=1",
		);
		expect(result).toBe("https://example.com/leads?other=1");
	});

	it("retorna a URL inalterada quando nao ha parametro _rsc", () => {
		const result = normalizeRscUrl("https://example.com/dashboard");
		expect(result).toBe("https://example.com/dashboard");
	});

	it("remove _rsc de rotas com segmentos dinamicos", () => {
		const result = normalizeRscUrl(
			"https://example.com/leads/new?_rsc=abc",
		);
		expect(result).toBe("https://example.com/leads/new");
	});

	it("e uma funcao pura — mesma entrada produz mesma saida", () => {
		const url = "https://example.com/admin/stats?_rsc=zzz";
		const first = normalizeRscUrl(url);
		const second = normalizeRscUrl(url);
		expect(first).toBe(second);
		expect(first).toBe("https://example.com/admin/stats");
	});
});
