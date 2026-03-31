import { describe, expect, it } from "vitest";

describe("OfflinePage", () => {
	it("exporta um componente como default export", async () => {
		const mod = await import("../page");
		expect(typeof mod.default).toBe("function");
	});

	it("o default export e uma funcao (componente React)", async () => {
		const mod = await import("../page");
		expect(mod.default).toBeInstanceOf(Function);
	});

	it("nao exporta propriedade manifest", async () => {
		const mod = await import("../page");
		expect((mod as Record<string, unknown>).manifest).toBeUndefined();
	});
});
