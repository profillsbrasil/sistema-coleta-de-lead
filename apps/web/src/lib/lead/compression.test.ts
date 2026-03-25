import { describe, expect, it } from "vitest";
import { calculateDimensions } from "./compression";

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
