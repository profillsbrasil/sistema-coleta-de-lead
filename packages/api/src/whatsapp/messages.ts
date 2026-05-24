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

interface InteractiveMessage {
	interactive: {
		type: "button";
		header?: { type: "image"; image: { link: string } };
		body: { text: string };
		footer?: { text: string };
		action: { buttons: InteractiveButton[] };
	};
	type: "interactive";
}

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
): InteractiveMessage {
	const interactivePayload: InteractiveMessage["interactive"] = {
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

const CONSENT_BUTTONS = [
	{ id: "accept", title: "Aceito" },
	{ id: "decline", title: "Nao aceito" },
];

const REDIRECT_BUTTONS = [
	{ id: "want_to_participate", title: "Participar sorteio" },
	{ id: "already_registered", title: "Ja me cadastrei" },
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
}: {
	name: string;
	raffleCode: string;
}): TextMessage {
	return text(
		`Olá, *${name}*! Você já está inscrito.\n\n` +
			`🎟️ Seu código: *${raffleCode}*\n\n` +
			"📅 *Sorteio:* 05/06/2026\n\n" +
			"A equipe Profills entrará em contato neste WhatsApp caso você seja sorteado."
	);
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

export function redirect({
	vendorName,
	vendorPhone,
	eventStart,
	eventEnd,
}: {
	vendorName: string;
	vendorPhone: string;
	eventStart: string; // formato "DD/MM"
	eventEnd: string; // formato "DD/MM"
}): InteractiveMessage {
	return interactive(
		"👋 Olá!\n\n" +
			"A *Profills* está participando da *Fispal 2026* " +
			`nesta semana (*${eventStart} a ${eventEnd}*).\n\n` +
			"Durante o evento, o atendimento comercial está " +
			"temporariamente neste contato:\n\n" +
			`📱 *${vendorName}*\n` +
			`▸ wa.me/${vendorPhone}\n\n` +
			"Voltamos ao atendimento normal neste número " +
			"logo após o evento.\n\n" +
			"━━━━━━━━━━━━━━━━━━━\n\n" +
			"*Veio pelo sorteio da Profills no Fispal?*",
		REDIRECT_BUTTONS
	);
}

// Exporta o tipo unificado para uso pelos módulos de envio
export type { BotMessage, InteractiveMessage, TextMessage };
