import { beforeEach, describe, expect, it, vi } from "vitest";
import { calculateDimensions, checkStorageAndCompress } from "./compression";

describe("calculateDimensions", () => {
	it("scales down when width exceeds MAX_DIMENSION", () => {
		const result = calculateDimensions(2560, 1920, 1280);

		expect(result.width).toBe(1280);
		expect(result.height).toBe(960);
	});

	it("scales down when height exceeds MAX_DIMENSION", () => {
		const result = calculateDimensions(1920, 2560, 1280);

		expect(result.width).toBe(960);
		expect(result.height).toBe(1280);
	});

	it("does not scale when both dimensions are within MAX_DIMENSION", () => {
		const result = calculateDimensions(800, 600, 1280);

		expect(result.width).toBe(800);
		expect(result.height).toBe(600);
	});

	it("scales down square images correctly", () => {
		const result = calculateDimensions(2000, 2000, 1280);

		expect(result.width).toBe(1280);
		expect(result.height).toBe(1280);
	});

	it("handles exact MAX_DIMENSION without scaling", () => {
		const result = calculateDimensions(1280, 1280, 1280);

		expect(result.width).toBe(1280);
		expect(result.height).toBe(1280);
	});
});

describe("checkStorageAndCompress", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("retorna o blob sem modificação quando espaço está abaixo de 80%", async () => {
		vi.stubGlobal("navigator", {
			storage: {
				estimate: vi
					.fn()
					.mockResolvedValue({ usage: 400_000_000, quota: 1_000_000_000 }), // 40%
			},
		});

		const blob = new Blob(["photo-data"], { type: "image/jpeg" });
		const result = await checkStorageAndCompress(blob);
		expect(result).toBe(blob);
	});

	it("lança erro quando uso de espaço está acima de 90%", async () => {
		vi.stubGlobal("navigator", {
			storage: {
				estimate: vi
					.fn()
					.mockResolvedValue({ usage: 950_000_000, quota: 1_000_000_000 }), // 95%
			},
		});

		const blob = new Blob(["photo-data"], { type: "image/jpeg" });
		await expect(checkStorageAndCompress(blob)).rejects.toThrow(
			"Armazenamento cheio"
		);
	});

	it("trata quota undefined como espaço ilimitado (não comprime nem rejeita)", async () => {
		vi.stubGlobal("navigator", {
			storage: {
				estimate: vi
					.fn()
					.mockResolvedValue({ usage: 500_000_000, quota: undefined }),
			},
		});

		const blob = new Blob(["photo-data"], { type: "image/jpeg" });
		const result = await checkStorageAndCompress(blob);
		expect(result).toBe(blob);
	});

	it("retorna blob sem modificação quando navigator.storage não está disponível", async () => {
		vi.stubGlobal("navigator", {});

		const blob = new Blob(["photo-data"], { type: "image/jpeg" });
		const result = await checkStorageAndCompress(blob);
		expect(result).toBe(blob);
	});
});
