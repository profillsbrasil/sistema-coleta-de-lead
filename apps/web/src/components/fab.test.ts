import { describe, expect, it, vi } from "vitest";

// Mock next/navigation before importing FAB module
vi.mock("next/navigation", () => ({
	usePathname: vi.fn(),
}));

// Mock UI components to avoid actual rendering dependency
vi.mock("@dashboard-leads-profills/ui/components/button", () => ({
	Button: "button",
}));

vi.mock("lucide-react", () => ({
	Plus: "svg",
}));

vi.mock("next/link", () => ({
	default: "a",
}));

import { isKeyboardOpen, isRouteVisible, VISIBLE_ROUTES } from "./fab";

describe("isKeyboardOpen", () => {
	it("returns false when visualViewport is undefined", () => {
		expect(isKeyboardOpen(undefined, 800)).toBe(false);
	});

	it("returns true when visualViewport.height < innerHeight * 0.75", () => {
		const viewport = { height: 400 } as VisualViewport;
		expect(isKeyboardOpen(viewport, 800)).toBe(true);
	});

	it("returns false when visualViewport.height >= innerHeight * 0.75", () => {
		const viewport = { height: 600 } as VisualViewport;
		expect(isKeyboardOpen(viewport, 800)).toBe(false);
	});

	it("returns false when visualViewport.height equals threshold exactly", () => {
		const viewport = { height: 600 } as VisualViewport;
		expect(isKeyboardOpen(viewport, 800)).toBe(false);
	});

	it("returns true at just below threshold", () => {
		const viewport = { height: 599 } as VisualViewport;
		expect(isKeyboardOpen(viewport, 800)).toBe(true);
	});
});

describe("isRouteVisible", () => {
	it("returns true for /leads", () => {
		expect(isRouteVisible("/leads")).toBe(true);
	});

	it("returns true for /dashboard", () => {
		expect(isRouteVisible("/dashboard")).toBe(true);
	});

	it("returns false for /leads/new", () => {
		expect(isRouteVisible("/leads/new")).toBe(false);
	});

	it("returns false for /leads/abc-123 (lead detail)", () => {
		expect(isRouteVisible("/leads/abc-123")).toBe(false);
	});

	it("returns false for /admin/leads", () => {
		expect(isRouteVisible("/admin/leads")).toBe(false);
	});
});

describe("VISIBLE_ROUTES", () => {
	it("contains exactly /leads and /dashboard", () => {
		expect(VISIBLE_ROUTES).toEqual(["/leads", "/dashboard"]);
	});
});
