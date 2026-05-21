import { PageHeader } from "@/components/page/page-header";
import { SorteioClient } from "./_components/sorteio-client";

export default function AdminSorteioPage() {
	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col gap-6 pb-6">
			<PageHeader
				eyebrow="Admin"
				subtitle="Gerencie os sorteios dos prêmios e notifique os vencedores via WhatsApp."
				title="Sorteio Profills Fispal 2026"
			/>
			<SorteioClient />
		</div>
	);
}
