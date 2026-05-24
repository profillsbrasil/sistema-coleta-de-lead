import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const CANVAS = { width: 1080, height: 1080 };

// Cores Profills extraídas do logo
const AZUL = "#1E3A8A";
const VERMELHO = "#E51E2A";

export async function GET(request: NextRequest): Promise<ImageResponse | Response> {
	const { searchParams } = new URL(request.url);
	const code = searchParams.get("code");
	const name = searchParams.get("name") ?? "";
	const company = searchParams.get("company") ?? "";
	const date = searchParams.get("date") ?? "";

	if (!code) {
		return new Response("code required", { status: 400 });
	}

	// URL absoluta do logo para que o Satori consiga buscar
	const baseUrl =
		process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
		`https://${request.headers.get("host")}`;
	const logoUrl = `${baseUrl}/whatsapp/logo.png`;

	return new ImageResponse(
		(
			<div
				style={{
					width: "100%",
					height: "100%",
					display: "flex",
					flexDirection: "row",
					backgroundColor: "#FFFFFF",
					fontFamily: "sans-serif",
					position: "relative",
				}}
			>
				{/* Faixa vermelha vertical na lateral esquerda */}
				<div
					style={{
						width: 12,
						height: "100%",
						backgroundColor: VERMELHO,
						flexShrink: 0,
					}}
				/>

				{/* Conteúdo principal */}
				<div
					style={{
						flex: 1,
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						// Gradient sutil branco → #F5F7FB
						background:
							"linear-gradient(135deg, #FFFFFF 0%, #F5F7FB 100%)",
						padding: "60px 80px",
					}}
				>
					{/* Logo Profills */}
					<img
						src={logoUrl}
						width={360}
						height={120}
						style={{
							objectFit: "contain",
							marginBottom: 20,
						}}
					/>

					{/* Badge evento */}
					<div
						style={{
							fontSize: 32,
							color: AZUL,
							letterSpacing: 6,
							fontWeight: 700,
							textTransform: "uppercase",
							marginBottom: 48,
						}}
					>
						SORTEIO FISPAL 2026
					</div>

					{/* Caixa do código — estilo ticket */}
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							border: `4px dashed ${AZUL}`,
							borderRadius: 28,
							padding: "36px 80px",
							width: "100%",
							marginBottom: 40,
						}}
					>
						<div
							style={{
								fontSize: 32,
								color: AZUL,
								letterSpacing: 4,
								textTransform: "uppercase",
								marginBottom: 16,
								fontWeight: 600,
							}}
						>
							CÓDIGO DE PARTICIPAÇÃO
						</div>
						<div
							style={{
								fontSize: 168,
								fontWeight: 900,
								color: AZUL,
								letterSpacing: 4,
								lineHeight: 1,
							}}
						>
							{code}
						</div>
					</div>

					{/* Linha divisória */}
					<div
						style={{
							width: "100%",
							height: 2,
							backgroundColor: AZUL,
							opacity: 0.2,
							marginBottom: 36,
						}}
					/>

					{/* Dados do participante */}
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: 12,
							width: "100%",
							fontSize: 32,
						}}
					>
						<div style={{ display: "flex" }}>
							<span style={{ color: AZUL, opacity: 0.6, marginRight: 8 }}>
								Participante:
							</span>
							<span style={{ fontWeight: 700, color: "#000000" }}>{name}</span>
						</div>
						<div style={{ display: "flex" }}>
							<span style={{ color: AZUL, opacity: 0.6, marginRight: 8 }}>
								Empresa:
							</span>
							<span style={{ fontWeight: 700, color: "#000000" }}>
								{company}
							</span>
						</div>
						{date ? (
							<div style={{ display: "flex" }}>
								<span style={{ color: AZUL, opacity: 0.6, marginRight: 8 }}>
									Cadastrado:
								</span>
								<span style={{ fontWeight: 700, color: "#000000" }}>{date}</span>
							</div>
						) : null}
					</div>

					{/* Footer */}
					<div
						style={{
							marginTop: "auto",
							paddingTop: 40,
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: 8,
						}}
					>
						<div
							style={{
								fontSize: 28,
								color: VERMELHO,
								fontWeight: 600,
							}}
						>
							🎁 Sorteio: 05/06/2026
						</div>
						<div
							style={{
								fontSize: 24,
								color: AZUL,
								opacity: 0.5,
							}}
						>
							profills.com.br
						</div>
					</div>
				</div>
			</div>
		),
		{ width: CANVAS.width, height: CANVAS.height }
	);
}
