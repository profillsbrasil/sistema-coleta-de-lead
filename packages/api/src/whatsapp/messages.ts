/**
 * Textos PT-BR centralizados do bot WhatsApp Profills.
 *
 * Módulo puro: apenas constantes e helpers de interpolação. Sem I/O.
 */

import type { ValidationError } from "./validation";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface TextMessage {
	body: string;
	type: "text";
}

interface InteractiveButton {
	reply: { id: string; title: string };
	type: "reply";
}

interface InteractiveButtonMessage {
	interactive: {
		type: "button";
		header?: { type: "image"; image: { link: string } };
		body: { text: string };
		footer?: { text: string };
		action: { buttons: InteractiveButton[] };
	};
	type: "interactive";
}

interface InteractiveCtaMessage {
	interactive: {
		type: "cta_url";
		header?: { type: "image"; image: { link: string } };
		body: { text: string };
		footer?: { text: string };
		action: {
			name: "cta_url";
			parameters: { display_text: string; url: string };
		};
	};
	type: "interactive";
}

type InteractiveMessage = InteractiveButtonMessage | InteractiveCtaMessage;

type BotMessage = TextMessage | InteractiveMessage;

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function text(body: string): TextMessage {
	return { type: "text", body };
}

function interactive(
	bodyText: string,
	buttons: Array<{ id: string; title: string }>,
	options?: {
		header?: { type: "image"; image: { link: string } };
		footer?: { text: string };
	}
): InteractiveButtonMessage {
	const interactivePayload: InteractiveButtonMessage["interactive"] = {
		type: "button",
		body: { text: bodyText },
		action: {
			buttons: buttons.map((b) => ({
				type: "reply",
				reply: { id: b.id, title: b.title },
			})),
		},
	};
	if (options?.header) {
		interactivePayload.header = options.header;
	}
	if (options?.footer) {
		interactivePayload.footer = options.footer;
	}
	return { type: "interactive", interactive: interactivePayload };
}

function interactiveCta(
	bodyText: string,
	cta: { displayText: string; url: string },
	options?: {
		header?: { type: "image"; image: { link: string } };
		footer?: { text: string };
	}
): InteractiveCtaMessage {
	const interactivePayload: InteractiveCtaMessage["interactive"] = {
		type: "cta_url",
		body: { text: bodyText },
		action: {
			name: "cta_url",
			parameters: { display_text: cta.displayText, url: cta.url },
		},
	};
	if (options?.header) {
		interactivePayload.header = options.header;
	}
	if (options?.footer) {
		interactivePayload.footer = options.footer;
	}
	return { type: "interactive", interactive: interactivePayload };
}

const CONSENT_BUTTONS = [
	{ id: "accept", title: "Aceito" },
	{ id: "decline", title: "Nao aceito" },
];

// ---------------------------------------------------------------------------
// Pré-requisitos no Instagram (3 perfis + comentário). Placeholders pra teste —
// substituir pelos handles, post e frase definitivos.
// ---------------------------------------------------------------------------

export const INSTAGRAM_PROFILES = [
	{ handle: "@profills", url: "https://instagram.com/profills" },
	{ handle: "@profills_perfil_2", url: "https://instagram.com/profills" },
	{ handle: "@profills_perfil_3", url: "https://instagram.com/profills" },
] as const;

export const LAST_POST_URL = "https://instagram.com/profills";
export const COMMENT_TEXT = "[mensagem a definir]";

export const TASKS_DONE_BUTTON_ID = "tasks_done";

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export function welcome({
	eventName: _eventName,
	imageUrl,
}: {
	eventName: string;
	imageUrl?: string;
}): InteractiveMessage {
	const bodyText =
		"*Sorteio Profills Fispal 2026* 🎉\n\n" +
		"Participe e concorra a vários prêmios:\n" +
		`• TV 65"\n` +
		"• Churrasqueira Champions Grill\n" +
		"• Cooler Profills\n\n" +
		"📅 Sorteio: *05/06/2026*\n\n" +
		"Ao aceitar, você autoriza a Profills a utilizar seus dados para o sorteio e contato comercial relacionado.\n\n" +
		"Deseja participar?";

	return interactive(
		bodyText,
		CONSENT_BUTTONS,
		imageUrl
			? { header: { type: "image", image: { link: imageUrl } } }
			: undefined
	);
}

export function askName(): TextMessage {
	return text("Para começar, qual é o seu *nome completo*?");
}

export function askCompany({ name }: { name: string }): TextMessage {
	return text(`Em qual *empresa* você trabalha, *${name}*?`);
}

export function codeGenerated({
	name,
	raffleCode,
	raffleDate,
}: {
	name: string;
	raffleCode: string;
	raffleDate?: string;
}): TextMessage {
	return text(
		`Inscrição confirmada, *${name}*.\n\n` +
			`Código: *${raffleCode}*\n` +
			`Sorteio: ${raffleDate ?? "05/06/2026"}\n\n` +
			"Se você for sorteado, a equipe Profills entrará em contato por este WhatsApp. Boa sorte!"
	);
}

export function tasksIntro({
	name,
}: {
	name: string;
}): InteractiveButtonMessage {
	const bodyText =
		`Falta pouco, *${name}*.\n\n` +
		"Antes de liberar seu código, conclua os passos abaixo:\n\n" +
		`*1.* Seguir ${INSTAGRAM_PROFILES[0].handle} — ${INSTAGRAM_PROFILES[0].url}\n` +
		`*2.* Seguir ${INSTAGRAM_PROFILES[1].handle} — ${INSTAGRAM_PROFILES[1].url}\n` +
		`*3.* Seguir ${INSTAGRAM_PROFILES[2].handle} — ${INSTAGRAM_PROFILES[2].url}\n` +
		`*4.* Comentar no último post: ${LAST_POST_URL}\n` +
		`Frase a comentar: "${COMMENT_TEXT}"\n\n` +
		"Quando terminar, toque no botão para confirmar.";

	return interactive(bodyText, [
		{ id: TASKS_DONE_BUTTON_ID, title: "Já concluí" },
	]);
}

export function alreadyParticipated({
	name,
	raffleCode,
	vendorPhone,
}: {
	name: string;
	raffleCode: string;
	vendorPhone: string;
}): InteractiveCtaMessage {
	const bodyText =
		`Olá, *${name}*! Você já está inscrito. 🎉\n\n` +
		`🎟️ Código: *${raffleCode}*\n` +
		"📅 Sorteio: 05/06/2026\n\n" +
		"Precisa falar com a gente? Toque no botão abaixo.";

	return interactiveCta(bodyText, {
		displayText: "Entrar em contato",
		url: `https://wa.me/${vendorPhone}`,
	});
}


export function declined({
	vendorPhone,
}: {
	vendorPhone: string;
}): InteractiveCtaMessage {
	const bodyText =
		"Sem problemas! Você optou por não participar do sorteio.\n" +
		"A Profills agradece pelo seu tempo. 👋\n\n" +
		"Para falar com nosso time durante o evento, toque no botão abaixo.";

	return interactiveCta(bodyText, {
		displayText: "Falar com a equipe",
		url: `https://wa.me/${vendorPhone}`,
	});
}


export function invalidConsentRetry(): InteractiveMessage {
	return interactive(
		"Não entendi sua resposta 😅\n\n" +
			"Por favor, use os botões abaixo para confirmar sua participação no *Sorteio Profills Fispal 2026*:",
		CONSENT_BUTTONS
	);
}

export function nameInvalid(reason: ValidationError): TextMessage {
	const body: Record<ValidationError, string> = {
		empty: "Não consegui identificar seu nome. Pode tentar de novo?",
		too_short: "Seu nome está muito curto. Tente de novo.",
		too_long: "Seu nome está muito longo. Pode encurtar?",
		invalid_chars: "Use apenas letras no nome, por favor.",
		missing_surname: "Por favor, envie seu nome e sobrenome.",
		only_digits: "Use apenas letras no nome, por favor.",
	};
	return text(body[reason]);
}

export function companyInvalid(reason: ValidationError): TextMessage {
	const body: Record<ValidationError, string> = {
		empty: "Por favor, informe o nome da empresa.",
		too_short: "Nome da empresa está muito curto. Tente de novo.",
		too_long: "Nome da empresa está muito longo. Pode encurtar?",
		invalid_chars: "Nome de empresa inválido. Tente de novo.",
		missing_surname: "Nome de empresa inválido. Tente de novo.",
		only_digits: "O nome da empresa precisa conter letras.",
	};
	return text(body[reason]);
}

export function eventNotice({
	vendorPhone,
	eventStart,
	eventEnd,
	logoUrl,
}: {
	vendorPhone: string;
	eventStart: string; // formato "DD/MM"
	eventEnd: string; // formato "DD/MM"
	logoUrl?: string;
}): InteractiveCtaMessage {
	const bodyText =
		"Olá! 👋\n\n" +
		"Obrigado por entrar em contato com a *Profills*.\n\n" +
		`Esta semana (*${eventStart} a ${eventEnd}*) nossa equipe comercial está participando da *Fispal 2026* em São Paulo. ` +
		"Para um atendimento ágil, toque no botão abaixo e fale com nosso time agora mesmo.\n\n" +
		"Após o evento voltamos ao atendimento normal por este número.";

	return interactiveCta(
		bodyText,
		{
			displayText: "Falar com a equipe",
			url: `https://wa.me/${vendorPhone}`,
		},
		logoUrl
			? { header: { type: "image", image: { link: logoUrl } } }
			: undefined
	);
}

// Exporta o tipo unificado para uso pelos módulos de envio
export type {
	BotMessage,
	InteractiveButtonMessage,
	InteractiveCtaMessage,
	InteractiveMessage,
	TextMessage,
};
