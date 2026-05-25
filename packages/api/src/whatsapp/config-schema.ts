import { z } from "zod";

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

const isoDateString = z
	.string()
	.regex(isoDateRegex, "Use o formato YYYY-MM-DD");

const optionalUrl = z
	.string()
	.url("URL inválida")
	.or(z.literal(""))
	.transform((v) => (v === "" ? null : v))
	.nullable();

export const whatsappConfigSchema = z
	.object({
		vendorPhone: z
			.string()
			.min(10, "Número muito curto")
			.regex(/^\d+$/, "Apenas dígitos, sem espaços ou símbolos"),
		eventName: z.string().min(3, "Nome muito curto").max(120),
		eventStart: isoDateString,
		eventEnd: isoDateString,
		raffleDate: isoDateString,
		welcomeImageUrl: optionalUrl,
		logoUrl: optionalUrl,
		instagramProfiles: z
			.array(
				z.object({
					handle: z
						.string()
						.regex(/^@[A-Za-z0-9._]{1,30}$/, "Use @handle (sem espaços)"),
					url: z.string().url("URL inválida"),
				})
			)
			.length(3, "Precisa de exatamente 3 perfis"),
		officialPostUrl: z.string().url("URL inválida"),
		privacyPolicyUrl: optionalUrl,
	})
	.refine((v) => v.eventEnd >= v.eventStart, {
		message: "Fim do evento precisa ser depois do início",
		path: ["eventEnd"],
	});

export type WhatsappConfigInput = z.infer<typeof whatsappConfigSchema>;
