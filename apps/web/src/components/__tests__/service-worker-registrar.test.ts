import { describe, expect, it } from "vitest";

describe("ServiceWorkerRegistrar", () => {
	it("exporta ServiceWorkerRegistrar como named export", async () => {
		const mod = await import("../service-worker-registrar");
		expect(typeof mod.ServiceWorkerRegistrar).toBe("function");
	});

	it("nao tem export default", async () => {
		const mod = await import("../service-worker-registrar");
		expect((mod as Record<string, unknown>).default).toBeUndefined();
	});
});
