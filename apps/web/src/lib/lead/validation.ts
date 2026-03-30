import { z } from "zod";

export const leadFormSchema = z
	.object({
		name: z.string().min(1, "Nome e obrigatorio"),
		phone: z.string().optional().default(""),
		email: z.string().email("Email invalido").optional().or(z.literal("")),
		interestTag: z.enum(["quente", "morno", "frio"]).default("morno"),
		company: z.string().optional().default(""),
		position: z.string().optional().default(""),
		segment: z.string().optional().default(""),
		notes: z.string().optional().default(""),
	})
	.refine((data) => data.phone || data.email, {
		message: "Informe telefone ou email",
		path: ["phone"],
	});

export type LeadFormData = z.infer<typeof leadFormSchema>;
