import { PageHeader } from "@/components/page/page-header";
import { AlertsInbox } from "./_components/alerts-inbox";

export default function AdminWhatsappAlertsPage() {
	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col gap-6 pb-6">
			<PageHeader
				eyebrow="Admin · WhatsApp"
				subtitle="Eventos críticos do bot — dead-letter, código esgotado, envio bloqueado, falhas permanentes."
				title="Alertas"
			/>
			<AlertsInbox />
		</div>
	);
}
