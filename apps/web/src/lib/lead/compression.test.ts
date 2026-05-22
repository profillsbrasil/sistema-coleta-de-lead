import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	calculateDimensions,
	compressForStorage,
	getStorageStatus,
} from "./compression";

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

function stubStorage(usage: number, quota: number | undefined): void {
	vi.stubGlobal("navigator", {
		storage: {
			estimate: vi.fn().mockResolvedValue({ usage, quota }),
		},
	});
}

describe("getStorageStatus", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("retorna 'ok' quando uso está abaixo de 80%", async () => {
		stubStorage(400_000_000, 1_000_000_000); // 40%
		expect(await getStorageStatus()).toBe("ok");
	});

	it("retorna 'warning' quando uso está entre 80% e 90%", async () => {
		stubStorage(850_000_000, 1_000_000_000); // 85%
		expect(await getStorageStatus()).toBe("warning");
	});

	it("retorna 'full' quando uso está em 90% ou acima", async () => {
		stubStorage(950_000_000, 1_000_000_000); // 95%
		expect(await getStorageStatus()).toBe("full");
	});

	it("retorna 'ok' quando quota é undefined", async () => {
		stubStorage(500_000_000, undefined);
		expect(await getStorageStatus()).toBe("ok");
	});

	it("retorna 'ok' quando navigator.storage não está disponível", async () => {
		vi.stubGlobal("navigator", {});
		expect(await getStorageStatus()).toBe("ok");
	});
});

describe("compressForStorage", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("retorna o blob sem modificação quando há espaço (status ok)", async () => {
		stubStorage(400_000_000, 1_000_000_000); // 40%

		const blob = new Blob(["photo-data"], { type: "image/jpeg" });
		const result = await compressForStorage(blob);
		expect(result).toBe(blob);
	});

	it("não lança quando o armazenamento está cheio", async () => {
		stubStorage(950_000_000, 1_000_000_000); // 95%
		vi.stubGlobal(
			"createImageBitmap",
			vi.fn().mockResolvedValue({ width: 100, height: 100, close: vi.fn() })
		);

		const blob = new Blob(["photo-data"], { type: "image/jpeg" });
		await expect(compressForStorage(blob)).resolves.toBeInstanceOf(Blob);
	});
});
