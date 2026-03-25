import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "jsdom",
		setupFiles: ["fake-indexeddb/auto"],
		include: ["src/**/*.test.ts"],
		passWithNoTests: true,
		alias: {
			"@": path.resolve(import.meta.dirname, "src"),
		},
	},
});
