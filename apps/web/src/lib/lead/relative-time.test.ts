import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { relativeTime } from "./relative-time";

describe("relativeTime", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-03-25T12:00:00.000Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns 'agora' for dates less than 60 seconds ago", () => {
		const date = new Date("2026-03-25T11:59:30.000Z").toISOString();
		expect(relativeTime(date)).toBe("agora");
	});

	it("returns 'ha X min' for dates 1-59 minutes ago", () => {
		const date5min = new Date("2026-03-25T11:55:00.000Z").toISOString();
		expect(relativeTime(date5min)).toBe("ha 5 min");

		const date1min = new Date("2026-03-25T11:59:00.000Z").toISOString();
		expect(relativeTime(date1min)).toBe("ha 1 min");
	});

	it("returns 'ha Xh' for dates 1-23 hours ago", () => {
		const date2h = new Date("2026-03-25T10:00:00.000Z").toISOString();
		expect(relativeTime(date2h)).toBe("ha 2h");

		const date1h = new Date("2026-03-25T11:00:00.000Z").toISOString();
		expect(relativeTime(date1h)).toBe("ha 1h");
	});

	it("returns 'ha Xd' for dates 1+ days ago", () => {
		const date3d = new Date("2026-03-22T12:00:00.000Z").toISOString();
		expect(relativeTime(date3d)).toBe("ha 3d");

		const date1d = new Date("2026-03-24T12:00:00.000Z").toISOString();
		expect(relativeTime(date1d)).toBe("ha 1d");
	});
});
