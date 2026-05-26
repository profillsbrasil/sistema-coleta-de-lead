import Link from "next/link";

export const metadata = {
	title: "Política de Privacidade — Profills do Brasil",
	description:
		"Política de Privacidade do sistema de coleta de leads e sorteio via WhatsApp da Profills do Brasil Máquinas de Envase.",
};

export default function PrivacyPage() {
	return (
		<main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-10 text-sm leading-relaxed">
			<header className="border-b pb-4">
				<h1 className="font-bold text-2xl tracking-tight">
					Política de Privacidade
				</h1>
				<p className="mt-2 text-muted-foreground text-xs">
					Última atualização: 26 de maio de 2026
				</p>
			</header>

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-lg">1. Controlador dos dados</h2>
				<p>
					Esta Política de Privacidade aplica-se ao sistema de coleta de leads e
					sorteio via WhatsApp operado por{" "}
					<strong>Profills do Brasil Máquinas de Envase</strong>, doravante
					"Profills", inscrita em endereço comercial à Rua Marechal Deodoro,
					717, Centro, com contato comercial pelos canais oficiais da empresa.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-lg">2. Dados coletados</h2>
				<p>
					Durante o fluxo de cadastro no sorteio via WhatsApp, coletamos
					exclusivamente:
				</p>
				<ul className="ml-6 list-disc space-y-1">
					<li>Nome completo informado pelo titular</li>
					<li>Empresa em que o titular atua</li>
					<li>Número de telefone WhatsApp (identificador wa_id)</li>
					<li>
						Conteúdo das mensagens trocadas com o bot durante o fluxo de
						cadastro
					</li>
					<li>
						Metadados técnicos: horário das mensagens, identificadores de
						mensagem (wamid) e estado do fluxo
					</li>
				</ul>
				<p>
					Não coletamos documentos de identidade, dados financeiros, geolocalização
					precisa, dados sensíveis (saúde, biometria, religião, orientação
					política/sexual) ou dados de menores de idade.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-lg">3. Finalidades do tratamento</h2>
				<ul className="ml-6 list-disc space-y-1">
					<li>Participação do titular em sorteio promocional do evento</li>
					<li>Geração e envio do código exclusivo de sorteio</li>
					<li>
						Contato comercial pós-evento sobre produtos e serviços da Profills,
						mediante consentimento prévio
					</li>
					<li>
						Cumprimento de obrigações legais e regulatórias aplicáveis ao
						sorteio
					</li>
				</ul>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-lg">4. Base legal</h2>
				<p>
					O tratamento dos dados ocorre sob a base legal de{" "}
					<strong>consentimento</strong> (art. 7º, I, da Lei 13.709/2018 — LGPD),
					manifestado pelo titular ao aceitar expressamente os termos no início
					do fluxo de cadastro via WhatsApp. O consentimento pode ser revogado a
					qualquer momento.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-lg">5. Compartilhamento</h2>
				<p>
					Os dados são armazenados em infraestrutura segura na nuvem (Supabase /
					AWS) e processados via WhatsApp Business Platform (Meta). Não
					comercializamos, alugamos ou cedemos dados a terceiros não envolvidos
					na operação do sorteio.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-lg">6. Retenção</h2>
				<p>
					Os dados são retidos pelo tempo necessário ao cumprimento das
					finalidades acima e às obrigações legais, sendo excluídos ou
					anonimizados após o término do prazo, salvo solicitação expressa de
					exclusão antecipada pelo titular.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-lg">
					7. Direitos do titular (LGPD art. 18)
				</h2>
				<p>
					Você pode, a qualquer momento, exercer os seguintes direitos:
				</p>
				<ul className="ml-6 list-disc space-y-1">
					<li>Confirmar a existência de tratamento dos seus dados</li>
					<li>Acessar os dados que mantemos sobre você</li>
					<li>Corrigir dados incompletos, inexatos ou desatualizados</li>
					<li>
						Solicitar a anonimização, bloqueio ou eliminação de dados
						desnecessários ou tratados em desconformidade com a LGPD
					</li>
					<li>Solicitar a portabilidade dos dados</li>
					<li>Eliminar os dados tratados com base no consentimento</li>
					<li>Revogar o consentimento</li>
				</ul>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-lg">8. Como exercer seus direitos</h2>
				<p>
					Para exercer qualquer dos direitos acima, ou para tirar dúvidas sobre
					o tratamento dos seus dados, envie mensagem pelo WhatsApp comercial da
					Profills ou pelos canais oficiais da empresa. Atendemos solicitações
					em até 15 dias úteis.
				</p>
				<p>
					Você também pode optar por sair (opt-out) do fluxo do bot a qualquer
					momento enviando as palavras <em>"sair"</em> ou <em>"parar"</em> no
					chat, o que interrompe imediatamente o envio de mensagens.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-lg">9. Cookies e tecnologias</h2>
				<p>
					Este site utiliza apenas cookies estritamente necessários ao
					funcionamento da plataforma administrativa interna. Não há cookies de
					rastreamento publicitário neste domínio.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-lg">10. Alterações</h2>
				<p>
					Esta Política pode ser atualizada periodicamente. A versão vigente
					estará sempre disponível nesta página, com a data da última atualização
					indicada no topo.
				</p>
			</section>

			<footer className="mt-6 border-t pt-4 text-muted-foreground text-xs">
				<Link
					className="underline underline-offset-4"
					href={"/termos" as unknown as "/"}
				>
					Ver Termos de Serviço
				</Link>
			</footer>
		</main>
	);
}
