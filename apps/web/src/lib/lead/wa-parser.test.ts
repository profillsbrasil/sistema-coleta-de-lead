import { describe, expect, it } from "vitest";
import { parseWhatsAppUrl } from "./wa-parser";

describe("parseWhatsAppUrl", () => {
	it("extracts phone from https://wa.me/5511999999999", () => {
		expect(parseWhatsAppUrl("https://wa.me/5511999999999")).toBe(
			"+5511999999999"
		);
	});

	it("extracts phone from https://wa.me/+5511999999999", () => {
		expect(parseWhatsAppUrl("https://wa.me/+5511999999999")).toBe(
			"+5511999999999"
		);
	});

	it("extracts phone from wa.me/5511999999999 (no protocol)", () => {
		expect(parseWhatsAppUrl("wa.me/5511999999999")).toBe("+5511999999999");
	});

	it("returns null for non-WhatsApp URL", () => {
		expect(parseWhatsAppUrl("https://google.com")).toBeNull();
	});

	it("returns null for random text", () => {
		expect(parseWhatsAppUrl("random text")).toBeNull();
	});

	it("returns null for wa.me with no number", () => {
		expect(parseWhatsAppUrl("https://wa.me/")).toBeNull();
	});
});
