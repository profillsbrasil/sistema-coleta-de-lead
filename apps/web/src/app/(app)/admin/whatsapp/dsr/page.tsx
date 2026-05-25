import { PageHeader } from "@/components/page/page-header";
import { DsrForm } from "./_components/dsr-form";

export default function AdminWhatsappDsrPage() {
	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-6 pb-6">
			<PageHeader
				eyebrow="Admin · LGPD"
				subtitle="Exclusão de dados a pedido do titular (DSR). Apaga o participant, todas as mensagens e o rate-limit. Grava snapshot em dsr_audit pra trilha."
				title="Exclusão LGPD"
			/>
			<DsrForm />
		</div>
	);
}
