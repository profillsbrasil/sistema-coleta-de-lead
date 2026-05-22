import { z } from "zod";

export const leadFormSchema = z
	.object({
		name: z.string().min(1, "Nome é obrigatório"),
		phone: z.string().optional().default(""),
		email: z.string().email("Email inválido").optional().or(z.literal("")),
		interestTag: z.enum(["quente", "morno", "frio"]).default("morno"),
		company: z.string().min(1, "Empresa é obrigatória"),
		position: z.string().optional().default(""),
		segment: z.string().optional().default(""),
		notes: z.string().optional().default(""),
	})
	.refine((data) => data.phone || data.email, {
		message: "Informe telefone ou email",
		path: ["phone"],
	});

export type LeadFormData = z.infer<typeof leadFormSchema>;
