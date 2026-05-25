import { PageHeader } from "@/components/page/page-header";
import { HealthDashboard } from "./_components/health-dashboard";

export default function AdminWhatsappHealthPage() {
	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-6">
			<PageHeader
				eyebrow="Admin · WhatsApp"
				subtitle="Métricas das últimas 24h: mensagens, taxa de falha, distribuição de leads, custo estimado."
				title="Saúde do bot"
			/>
			<HealthDashboard />
		</div>
	);
}
