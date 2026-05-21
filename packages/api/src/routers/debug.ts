import { z } from "zod";
import { publicProcedure, router } from "../index";

const formDiagnosticInput = z.object({
	source: z.enum(["onInvalid", "handleSubmit"]),
	ts: z.number(),
	userAgent: z.string().max(500),
	viewport: z.object({ w: z.number(), h: z.number() }),
	reactState: z.record(z.string(), z.unknown()),
	domValues: z.record(z.string(), z.string()),
	invalidField: z
		.object({
			id: z.string(),
			name: z.string().nullable(),
			validationMessage: z.string(),
			validity: z.record(z.string(), z.boolean()),
		})
		.optional(),
	checkValidity: z.boolean().optional(),
	invalidSelectors: z.array(z.string()).optional(),
	submitter: z.string().nullable().optional(),
});

export const debugRouter = router({
	logFormDiagnostic: publicProcedure
		.input(formDiagnosticInput)
		.mutation(({ input }) => {
			console.warn("[lead-form-debug]", JSON.stringify(input));
			return { ok: true };
		}),
});
