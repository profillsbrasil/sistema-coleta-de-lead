import Link from "next/link";

export const metadata = {
	title: "Termos de Serviço — Profills do Brasil",
	description:
		"Termos de Serviço do sistema de coleta de leads e sorteio via WhatsApp da Profills do Brasil Máquinas de Envase.",
};

export default function TermosPage() {
	return (
		<main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-10 text-sm leading-relaxed">
			<header className="border-b pb-4">
				<h1 className="font-bold text-2xl tracking-tight">Termos de Serviço</h1>
				<p className="mt-2 text-muted-foreground text-xs">
					Última atualização: 26 de maio de 2026
				</p>
			</header>

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-lg">1. Aceitação</h2>
				<p>
					Ao interagir com o sistema de coleta de leads e sorteio via WhatsApp
					operado pela <strong>Profills do Brasil Máquinas de Envase</strong>{" "}
					("Profills"), você declara estar ciente e de acordo com estes Termos
					de Serviço e com a{" "}
					<Link className="underline underline-offset-4" href={"/privacy" as unknown as "/"}>
						Política de Privacidade
					</Link>
					.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-lg">2. Objeto</h2>
				<p>
					Este serviço oferece, por meio de um chatbot na plataforma WhatsApp
					Business, a possibilidade de cadastro do titular em sorteio
					promocional vinculado a eventos comerciais da Profills, com geração de
					código único de participação.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-lg">3. Elegibilidade</h2>
				<ul className="ml-6 list-disc space-y-1">
					<li>Ser maior de 18 anos</li>
					<li>Residir no território brasileiro</li>
					<li>Atuar profissionalmente em pessoa jurídica</li>
					<li>
						Fornecer dados verídicos durante o fluxo de cadastro (nome e empresa
						reais)
					</li>
				</ul>
				<p>
					A Profills se reserva o direito de invalidar inscrições com dados
					falsos, duplicados ou que violem estes Termos.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-lg">4. Funcionamento do sorteio</h2>
				<ul className="ml-6 list-disc space-y-1">
					<li>
						O titular receberá um <strong>código de sorteio único</strong> ao
						concluir o cadastro
					</li>
					<li>
						O sorteio será realizado na data divulgada na mensagem de
						confirmação
					</li>
					<li>
						Cada participante pode ter apenas <strong>1 (um) código</strong>{" "}
						válido por evento
					</li>
					<li>
						O resultado e prêmios serão comunicados pelos canais oficiais da
						Profills
					</li>
				</ul>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-lg">5. Conduta do titular</h2>
				<p>
					Ao usar este serviço, o titular concorda em:
				</p>
				<ul className="ml-6 list-disc space-y-1">
					<li>
						Não enviar conteúdo ilegal, ofensivo, discriminatório, spam ou
						automatizado
					</li>
					<li>
						Não tentar manipular o sistema para obter múltiplos códigos
					</li>
					<li>
						Não usar o canal para fins não relacionados ao sorteio ou contato
						comercial legítimo
					</li>
				</ul>
				<p>
					O descumprimento pode resultar em exclusão imediata do sorteio e
					bloqueio do número no sistema.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-lg">6. Limitação de responsabilidade</h2>
				<p>
					A Profills se empenha em manter o serviço disponível, mas não garante
					funcionamento ininterrupto ou ausência de erros, especialmente em casos
					de falha da plataforma WhatsApp (Meta), do provedor de nuvem ou de
					eventos de força maior. A Profills não se responsabiliza por danos
					indiretos decorrentes da indisponibilidade temporária do serviço.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-lg">7. Propriedade intelectual</h2>
				<p>
					Marca, identidade visual, conteúdo das mensagens automatizadas e
					arquitetura do sistema são de propriedade da Profills. É vedada a
					reprodução total ou parcial sem autorização expressa.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-lg">8. Alterações nos Termos</h2>
				<p>
					Estes Termos podem ser atualizados a qualquer momento. A versão vigente
					estará sempre disponível nesta página, com a data da última atualização
					no topo. O uso continuado do serviço após mudanças implica aceitação da
					nova versão.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-lg">9. Foro</h2>
				<p>
					Fica eleito o foro da comarca de Curitiba/PR para dirimir quaisquer
					questões oriundas destes Termos, com renúncia expressa a qualquer
					outro, por mais privilegiado que seja.
				</p>
			</section>

			<footer className="mt-6 border-t pt-4 text-muted-foreground text-xs">
				<Link className="underline underline-offset-4" href={"/privacy" as unknown as "/"}>
					Ver Política de Privacidade
				</Link>
			</footer>
		</main>
	);
}
