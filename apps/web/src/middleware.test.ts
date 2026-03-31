import { describe, expect, it } from "vitest";
import { config } from "./middleware";

describe("middleware matcher", () => {
	it("exclui o service worker do proxy", () => {
		expect(config.matcher[0]).toContain("sw.js");
	});

	it("continua cobrindo rotas autenticadas", () => {
		expect(config.matcher[0]).toContain("_next/static");
		expect(config.matcher[0]).toContain("icon.png");
	});
});
