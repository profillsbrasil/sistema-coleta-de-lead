/**
 * Helper centralizado pra gravar alertas em whatsapp.alerts.
 * Inserts são best-effort — alertas nunca devem falhar o caller.
 */

import { db } from "@dashboard-leads-profills/db";
import { alerts } from "@dashboard-leads-profills/db/schema/whatsapp";

export type AlertSeverity = "info" | "warning" | "high" | "critical";

export async function recordAlert(
	event: string,
	severity: AlertSeverity,
	payload: Record<string, unknown> = {}
): Promise<void> {
	try {
		await db.insert(alerts).values({ event, severity, payload });
	} catch (err) {
		console.error(
			JSON.stringify({
				tag: "whatsapp:alerts",
				event: "record_failed",
				originalEvent: event,
				severity,
				err: String(err),
			})
		);
	}
}
