/**
 * Textos PT-BR centralizados do bot WhatsApp Profills.
 *
 * Módulo puro: apenas constantes e helpers de interpolação. Sem I/O.
 */

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
		"Olá! Bem-vindo ao *Sorteio Profills Fispal 2026* 🎉\n\n" +
		"Participe e concorra a 3 prêmios:\n" +
		`• TV 65"\n` +
		"• Churrasqueira Champions Grill\n" +
		"• Cooler Profills\n\n" +
		"📅 Sorteio: *05/06/2026*\n\n" +
		"📋 Ao aceitar, você autoriza a Profills a usar seu telefone, nome e empresa para o sorteio e contato comercial relacionado.";

	return interactive(
		bodyText,
		CONSENT_BUTTONS,
		imageUrl
			? { header: { type: "image", image: { link: imageUrl } } }
			: undefined
	);
}


export function askName(): TextMessage {
	return text("Show, você está participando! 😊 Qual é o seu *nome completo*?");
}

export function askCompany({ name }: { name: string }): TextMessage {
	return text(`Prazer, *${name}*! Em qual *empresa* você trabalha?`);
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
		`Olá, *${name}*, sua inscrição está confirmada!\n\n` +
			`🎟️ Seu código: *${raffleCode}*\n\n` +
			`📅 *Sorteio:* ${raffleDate ?? "05/06/2026"}\n\n` +
			"A equipe entrará em contato neste WhatsApp caso você seja sorteado. Boa sorte! 🍀"
	);
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
		`Olá, *${name}*! Você já está inscrito.\n\n` +
		`🎟️ Seu código: *${raffleCode}*\n\n` +
		"📅 *Sorteio:* 05/06/2026\n\n" +
		"A equipe Profills entrará em contato neste WhatsApp caso você seja sorteado.\n\n" +
		"━━━━━━━━━━━━━━━━━━━\n\n" +
		"Precisa de mais informações? Toque no botão abaixo para falar com a equipe Profills.";

	return interactiveCta(bodyText, {
		displayText: "Entrar em contato",
		url: `https://wa.me/${vendorPhone}`,
	});
}


export function declined(): TextMessage {
	return text(
		"Sem problemas. Você optou por não participar do sorteio.\n\n" +
			"A Profills agradece pelo seu tempo! 👋"
	);
}


export function invalidConsentRetry(): InteractiveMessage {
	return interactive(
		"Não entendi sua resposta 😅\n\n" +
			"Por favor, use os botões abaixo para confirmar sua participação no *Sorteio Profills Fispal 2026*:",
		CONSENT_BUTTONS
	);
}

export function nameInvalid(): TextMessage {
	return text(
		"Não consegui identificar um nome válido. Por favor, envie seu *nome completo* (ex: João Silva)."
	);
}

export function companyInvalid(): TextMessage {
	return text(
		"Não consegui identificar o nome da empresa. Por favor, envie o nome (ex: Indústria XYZ)."
	);
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
