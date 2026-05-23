import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const CANVAS = { width: 1080, height: 1080 };

export function GET(request: NextRequest): ImageResponse | Response {
	const { searchParams } = new URL(request.url);
	const code = searchParams.get("code");
	const name = searchParams.get("name") ?? "";
	const company = searchParams.get("company") ?? "";
	const date = searchParams.get("date") ?? "";

	if (!code) {
		return new Response("code required", { status: 400 });
	}

	return new ImageResponse(
		(
			<div
				style={{
					width: "100%",
					height: "100%",
					display: "flex",
					flexDirection: "column",
					backgroundColor: "#0E1A2B",
					color: "#FFFFFF",
					padding: 80,
					fontFamily: "sans-serif",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						fontSize: 36,
						opacity: 0.7,
					}}
				>
					<div>PROFILLS</div>
					<div>FISPAL 2026</div>
				</div>

				<div
					style={{
						flex: 1,
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						gap: 40,
					}}
				>
					<div style={{ fontSize: 48, opacity: 0.85 }}>
						CÓDIGO DE PARTICIPAÇÃO
					</div>
					<div
						style={{
							padding: "40px 80px",
							border: "6px solid #FF7A1A",
							borderRadius: 32,
							fontSize: 180,
							fontWeight: 900,
							letterSpacing: 8,
						}}
					>
						{code}
					</div>
				</div>

				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 12,
						fontSize: 36,
						borderTop: "2px solid rgba(255,255,255,0.2)",
						paddingTop: 40,
					}}
				>
					<div>
						<span style={{ opacity: 0.6 }}>Participante: </span>
						<span style={{ fontWeight: 700 }}>{name}</span>
					</div>
					<div>
						<span style={{ opacity: 0.6 }}>Empresa: </span>
						<span style={{ fontWeight: 700 }}>{company}</span>
					</div>
					{date ? (
						<div>
							<span style={{ opacity: 0.6 }}>Cadastrado em: </span>
							<span style={{ fontWeight: 700 }}>{date}</span>
						</div>
					) : null}
				</div>

				<div
					style={{
						marginTop: 40,
						fontSize: 28,
						textAlign: "center",
						opacity: 0.6,
					}}
				>
					Sorteio: 05/06/2026 — profills.com.br
				</div>
			</div>
		),
		{ width: CANVAS.width, height: CANVAS.height }
	);
}
