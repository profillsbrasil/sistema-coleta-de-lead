import Link from "next/link";

export default function OfflinePage() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
			<h1 className="text-2xl font-semibold">Sem conexao</h1>
			<p className="text-muted-foreground max-w-sm text-sm">
				Voce esta offline. As rotas que voce visitou anteriormente continuam
				disponiveis.
			</p>
			<Link
				className="text-primary text-sm underline underline-offset-4"
				href="/dashboard"
			>
				Ir para o dashboard
			</Link>
		</main>
	);
}
