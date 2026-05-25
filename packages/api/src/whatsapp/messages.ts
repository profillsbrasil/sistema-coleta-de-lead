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
	{ id: "decline", title: "Não aceito" },
];

// ---------------------------------------------------------------------------
// Pré-requisitos no Instagram (3 perfis + curtida + comentário).
// Os handles e o URL do post vêm de whatsapp.config (DB), passados via param.
// ---------------------------------------------------------------------------

export type InstagramProfile = { handle: string; url: string };

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export function welcome({
	eventName: _eventName,
	imageUrl,
	privacyPolicyUrl,
}: {
	eventName: string;
	imageUrl?: string;
	privacyPolicyUrl?: string | null;
}): InteractiveMessage {
	const policyLine = privacyPolicyUrl
		? `\n\nTermos e política de privacidade: ${privacyPolicyUrl}`
		: "";

	const bodyText =
		"*Sorteio Profills Fispal 2026* 🎉\n\n" +
		"Participe e concorra a vários prêmios:\n" +
		`• TV 65"\n` +
		"• Churrasqueira Champions Grill\n" +
		"• Cooler Profills\n\n" +
		"📅 Sorteio: *05/06/2026*\n\n" +
		"Ao aceitar, você autoriza a Profills a utilizar seus dados para o sorteio e contato comercial relacionado." +
		policyLine +
		"\n\nDeseja participar?";

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
		`Inscrição confirmada, *${name}*! 🎉\n\n` +
			`🎟️ Código: *${raffleCode}*\n` +
			`📅 Sorteio: ${raffleDate ?? "05/06/2026"}\n\n` +
			"Se você for sorteado, a equipe Profills entrará em contato por este WhatsApp. Boa sorte! 🍀"
	);
}

// ---------------------------------------------------------------------------
// Fluxo guiado de tarefas (Opção B): intro + 3 perfis sequenciais + post.
// Cada step usa CTA URL (abre Instagram) seguido de reply button de confirmação.
// IDs distintos por step alimentam taskProgress incrementalmente.
// ---------------------------------------------------------------------------

export const TASK_STEP_BUTTON_IDS = {
	follow_1: "task_done_1",
	follow_2: "task_done_2",
	follow_3: "task_done_3",
	post: "task_done_post",
} as const;

export type TaskStepKey = keyof typeof TASK_STEP_BUTTON_IDS;

const TASK_TOTAL = 4;

export function tasksIntro({ name }: { name: string }): TextMessage {
	return text(
		`Falta pouco, *${name}*.\n\n` +
			"Para liberar seu código, são 4 ações rápidas no Instagram: seguir 3 perfis e interagir com o post oficial do evento.\n\n" +
			"Vamos começar."
	);
}

export function taskStep({
	index,
	intro,
	profileUrl,
}: {
	index: 1 | 2 | 3;
	intro: string;
	profileUrl: string;
}): InteractiveCtaMessage {
	return interactiveCta(`*${index}/${TASK_TOTAL}*\n\n${intro}`, {
		displayText: "Abrir Instagram",
		url: profileUrl,
	});
}

export function taskPost({
	postUrl,
}: {
	postUrl: string;
}): InteractiveCtaMessage {
	const bodyText =
		`*${TASK_TOTAL}/${TASK_TOTAL}*\n\n` +
		"Última etapa. No post oficial do evento:\n" +
		"• Curta o post\n" +
		"• Comente marcando *2 amigos* que tenham indústria, comércio, produção ou negócio próprio";
	return interactiveCta(bodyText, {
		displayText: "Abrir post oficial",
		url: postUrl,
	});
}

export function taskStepConfirm({
	step,
}: {
	step: TaskStepKey;
}): InteractiveButtonMessage {
	const title = step === "post" ? "✓ Pronto" : "✓ Segui";
	return interactive("Quando concluir, toque abaixo.", [
		{ id: TASK_STEP_BUTTON_IDS[step], title },
	]);
}

export function taskNudge(): TextMessage {
	return text("Toque no botão abaixo quando concluir esta etapa.");
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
		garbage: "Esse nome não parece válido. Pode digitar seu nome completo?",
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
		garbage: "Esse nome de empresa não parece válido. Pode tentar de novo?",
	};
	return text(body[reason]);
}

export function unsupportedMediaReply(): TextMessage {
	return text(
		"Só consigo ler texto e botões por aqui. Mande *sorteio* pra começar."
	);
}

export function optOutConfirm(): TextMessage {
	return text(
		"Beleza, parei por aqui. Se quiser voltar a receber mensagens, é só mandar *VOLTAR*."
	);
}

export function optInConfirm(): TextMessage {
	return text(
		"Show, você voltou! 👋 Se quiser participar do sorteio, mande *sorteio*."
	);
}

export function handoffRedirect({
	vendorPhone,
}: {
	vendorPhone: string;
}): InteractiveCtaMessage {
	return interactiveCta(
		"Beleza! Toque no botão abaixo pra falar com nossa equipe agora mesmo.",
		{
			displayText: "Falar com a equipe",
			url: `https://wa.me/${vendorPhone}`,
		}
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
