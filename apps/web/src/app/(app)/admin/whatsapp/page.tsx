import { PageHeader } from "@/components/page/page-header";
import { WhatsappConfigForm } from "./_components/config-form";

export default function AdminWhatsappConfigPage() {
	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col gap-6 pb-6">
			<PageHeader
				eyebrow="Admin"
				subtitle="Edite as informações que o bot do WhatsApp usa no fluxo do sorteio. Mudanças aqui são aplicadas em tempo real, sem deploy."
				title="Configuração do bot"
			/>
			<WhatsappConfigForm />
		</div>
	);
}
