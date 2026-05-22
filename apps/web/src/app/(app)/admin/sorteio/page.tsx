import { PageHeader } from "@/components/page/page-header";
import { SorteioClient } from "./_components/sorteio-client";

export default function AdminSorteioPage() {
	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col gap-6 pb-6">
			<PageHeader
				eyebrow="Admin"
				subtitle="Acompanhe inscritos, exporte a base e abra contatos para operação manual. O sorteio será realizado fora do sistema."
				title="Inscritos do sorteio"
			/>
			<SorteioClient />
		</div>
	);
}
