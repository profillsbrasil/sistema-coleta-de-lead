import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../db/index";
import { saveLead } from "./save-lead";

const TEST_USER_ID = "user-123";
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T/;

describe("saveLead", () => {
	beforeEach(async () => {
		await db.leads.clear();
		await db.syncQueue.clear();
		vi.stubGlobal("crypto", {
			...globalThis.crypto,
			randomUUID: () => "fixed-uuid-1234",
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("creates a Lead with localId, syncStatus pending, serverId null", async () => {
		await saveLead(
			{
				name: "Maria",
				phone: "11999",
				email: "",
				interestTag: "quente",
				company: "",
				position: "",
				segment: "",
				notes: "",
			},
			TEST_USER_ID,
			null
		);

		const lead = await db.leads.get("fixed-uuid-1234");
		expect(lead).toBeDefined();
		expect(lead?.localId).toBe("fixed-uuid-1234");
		expect(lead?.syncStatus).toBe("pending");
		expect(lead?.serverId).toBeNull();
	});

	it("adds SyncQueueItem with operation create and JSON payload without photo", async () => {
		await saveLead(
			{
				name: "Joao",
				phone: "11888",
				email: "",
				interestTag: "morno",
				company: "Acme",
				position: "",
				segment: "",
				notes: "",
			},
			TEST_USER_ID,
			null
		);

		const items = await db.syncQueue.toArray();
		expect(items).toHaveLength(1);
		expect(items[0]?.operation).toBe("create");

		const payload = JSON.parse(items[0]?.payload ?? "{}");
		expect(payload.name).toBe("Joao");
		expect(payload.photo).toBeUndefined();
	});

	it("stores Blob in lead.photo when photo is provided", async () => {
		const photo = new Blob(["fake-image"], { type: "image/jpeg" });

		await saveLead(
			{
				name: "Ana",
				phone: "11777",
				email: "",
				interestTag: "frio",
				company: "",
				position: "",
				segment: "",
				notes: "",
			},
			TEST_USER_ID,
			photo
		);

		const lead = await db.leads.get("fixed-uuid-1234");
		expect(lead?.photo).not.toBeNull();
	});

	it("stores null in lead.photo when no photo is provided", async () => {
		await saveLead(
			{
				name: "Pedro",
				phone: "11666",
				email: "",
				interestTag: "morno",
				company: "",
				position: "",
				segment: "",
				notes: "",
			},
			TEST_USER_ID,
			null
		);

		const lead = await db.leads.get("fixed-uuid-1234");
		expect(lead?.photo).toBeNull();
	});

	it("sets createdAt and updatedAt to ISO timestamp", async () => {
		await saveLead(
			{
				name: "Carlos",
				phone: "11555",
				email: "",
				interestTag: "morno",
				company: "",
				position: "",
				segment: "",
				notes: "",
			},
			TEST_USER_ID,
			null
		);

		const lead = await db.leads.get("fixed-uuid-1234");
		expect(lead?.createdAt).toMatch(ISO_DATE_REGEX);
		expect(lead?.updatedAt).toMatch(ISO_DATE_REGEX);
		expect(lead?.createdAt).toBe(lead?.updatedAt);
	});

	it("sets userId from parameter", async () => {
		await saveLead(
			{
				name: "Lucia",
				phone: "11444",
				email: "",
				interestTag: "morno",
				company: "",
				position: "",
				segment: "",
				notes: "",
			},
			"custom-user-456",
			null
		);

		const lead = await db.leads.get("fixed-uuid-1234");
		expect(lead?.userId).toBe("custom-user-456");
	});

	it("writes lead and syncQueue atomically (both exist after save)", async () => {
		await saveLead(
			{
				name: "Atomic Test",
				phone: "11222",
				email: "",
				interestTag: "quente",
				company: "",
				position: "",
				segment: "",
				notes: "",
			},
			TEST_USER_ID,
			null,
		);

		const leadCount = await db.leads.count();
		const queueCount = await db.syncQueue.count();
		expect(leadCount).toBe(1);
		expect(queueCount).toBe(1);
	});

	it("converts empty strings to null for optional fields", async () => {
		await saveLead(
			{
				name: "Roberto",
				phone: "11333",
				email: "",
				interestTag: "morno",
				company: "",
				position: "",
				segment: "",
				notes: "",
			},
			TEST_USER_ID,
			null
		);

		const lead = await db.leads.get("fixed-uuid-1234");
		expect(lead?.phone).toBe("11333");
		expect(lead?.email).toBeNull();
		expect(lead?.company).toBeNull();
		expect(lead?.position).toBeNull();
		expect(lead?.segment).toBeNull();
		expect(lead?.notes).toBeNull();
	});
});
