import { z } from "zod";

// ---------------------------------------------------------------------------
// Inbound message schemas
// ---------------------------------------------------------------------------

export const inboundMessageSchema = z.union([
	z.object({
		id: z.string(),
		from: z.string(),
		timestamp: z.string(),
		type: z.literal("text"),
		text: z.object({ body: z.string() }),
	}),
	z.object({
		id: z.string(),
		from: z.string(),
		timestamp: z.string(),
		type: z.literal("interactive"),
		interactive: z.discriminatedUnion("type", [
			z.object({
				type: z.literal("button_reply"),
				button_reply: z.object({ id: z.string(), title: z.string() }),
			}),
			z.object({
				type: z.literal("list_reply"),
				list_reply: z.object({
					id: z.string(),
					title: z.string(),
					description: z.string().optional(),
				}),
			}),
		]),
	}),
	// Template button click
	z.object({
		id: z.string(),
		from: z.string(),
		timestamp: z.string(),
		type: z.literal("button"),
		button: z.object({ text: z.string(), payload: z.string() }),
	}),
	// Catch-all for unhandled types (image, audio, sticker, etc)
	z
		.object({
			id: z.string(),
			from: z.string(),
			timestamp: z.string(),
			type: z.string(),
		})
		.passthrough(),
]);

export const inboundStatusSchema = z
	.object({
		id: z.string(),
		status: z.enum(["sent", "delivered", "read", "failed"]),
		timestamp: z.string(),
		recipient_id: z.string(),
	})
	.passthrough();

export const webhookPayloadSchema = z.object({
	object: z.literal("whatsapp_business_account"),
	entry: z.array(
		z.object({
			id: z.string(),
			changes: z.array(
				z.object({
					field: z.string(),
					value: z
						.object({
							messaging_product: z.literal("whatsapp").optional(),
							metadata: z
								.object({
									display_phone_number: z.string().optional(),
									phone_number_id: z.string(),
								})
								.optional(),
							contacts: z
								.array(
									z.object({
										wa_id: z.string(),
										profile: z.object({ name: z.string() }).optional(),
									})
								)
								.optional(),
							messages: z.array(inboundMessageSchema).optional(),
							statuses: z.array(inboundStatusSchema).optional(),
						})
						.passthrough(),
				})
			),
		})
	),
});

export type InboundMessage = z.infer<typeof inboundMessageSchema>;
export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;
