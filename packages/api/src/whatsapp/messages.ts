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
		body: { text: string };
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
	buttons: Array<{ id: string; title: string }>
): InteractiveMessage {
	return {
		type: "interactive",
		interactive: {
			type: "button",
			body: { text: bodyText },
			action: {
				buttons: buttons.map((b) => ({
					type: "reply",
					reply: { id: b.id, title: b.title },
				})),
			},
		},
	};
}

const CONSENT_BUTTONS = [
	{ id: "accept", title: "Aceito" },
	{ id: "decline", title: "Nao aceito" },
];

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export function welcome({
	eventName,
}: {
	eventName: string;
}): InteractiveMessage {
	return interactive(
		"Olá! Bem-vindo ao *Sorteio Profills Fispal 2026* 🎉\n\n" +
			"Participe e concorra a 3 prêmios incríveis:\n" +
			`• TV 65"\n` +
			"• Churrasqueira Champions Grill\n" +
			"• Cooler Profills\n\n" +
			`Evento: *${eventName}*\n\n` +
			"📋 *LGPD:* Ao aceitar, você autoriza a Profills a usar seu telefone, nome e empresa apenas para o sorteio e contato comercial relacionado.",
		CONSENT_BUTTONS
	);
}

export function regulamento(): TextMessage {
	return text(
		"📜 *Regulamento Sorteio Profills Fispal 2026*\n\n" +
			"• Sorteio realizado ao vivo no estande Profills.\n" +
			"• Uma inscrição por número de WhatsApp.\n" +
			"• Os vencedores serão notificados por este WhatsApp.\n" +
			`• Prêmios: TV 65", Churrasqueira Champions Grill, Cooler Profills.\n` +
			"• Seus dados (nome, empresa, telefone) são usados exclusivamente para o sorteio e contato comercial Profills.\n\n" +
			"Para participar, responda *Aceito* ou *Não aceito*."
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
	const dateInfo = raffleDate ? ` no dia *${raffleDate}*` : "";
	return text(
		`🎊 *${name}*, você está inscrito no sorteio!\n\n` +
			`Seu código: *${raffleCode}*\n\n` +
			`O sorteio acontece${dateInfo} ao vivo no estande Profills. Boa sorte! 🍀\n\n` +
			"Digite *ajuda* a qualquer momento para ver as opções."
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
		`Oi, *${name}*! Você já está inscrito no sorteio 🎉\n\n` +
			`Seu código é: *${raffleCode}*\n\n` +
			"Aguarde o sorteio ao vivo no estande Profills. Boa sorte! 🍀\n\n" +
			"Digite *ajuda* para ver as opções."
	);
}

export function status({ raffleCode }: { raffleCode: string }): TextMessage {
	return text(
		`✅ Você está inscrito no sorteio!\n\nSeu código: *${raffleCode}*\n\nAcompanhe o sorteio ao vivo no estande Profills.`
	);
}

export function help(): TextMessage {
	return text(
		"ℹ️ *Comandos disponíveis:*\n\n" +
			"• *status* — consulta seu código de inscrição\n" +
			"• *ajuda* — mostra esta lista\n\n" +
			"Em caso de dúvidas, fale com alguém do estande Profills."
	);
}

export function declined(): TextMessage {
	return text(
		"Tudo bem! Você optou por não participar do sorteio. " +
			"Se mudar de ideia, é só enviar uma mensagem aqui novamente. 👋"
	);
}

export function reoffer(): InteractiveMessage {
	return interactive(
		"Que bom ter você de volta! 😊\n\n" +
			"Deseja participar do *Sorteio Profills Fispal 2026* e concorrer a:\n" +
			`• TV 65"\n` +
			"• Churrasqueira Champions Grill\n" +
			"• Cooler Profills\n\n" +
			"📋 Ao aceitar, você autoriza a Profills a usar seu telefone, nome e empresa apenas para o sorteio e contato comercial relacionado.",
		CONSENT_BUTTONS
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
		"Hmm, não consegui identificar um nome válido. Por favor, envie seu *nome completo* (mínimo 2 caracteres)."
	);
}

export function companyInvalid(): TextMessage {
	return text(
		"Não consegui identificar o nome da empresa. Por favor, envie o nome da *empresa* onde você trabalha."
	);
}

export function winnerTv({
	name,
	raffleCode,
}: {
	name: string;
	raffleCode: string;
}): TextMessage {
	return text(
		`🏆 *PARABÉNS, ${name}!* 🎉\n\n` +
			`Você foi sorteado e ganhou uma *TV 65"* no Sorteio Profills Fispal 2026!\n\n` +
			`Seu código vencedor: *${raffleCode}*\n\n` +
			"Nossa equipe entrará em contato para combinar a entrega do prêmio. Aproveite! 🎊"
	);
}

export function winnerChurrasqueira({
	name,
	raffleCode,
}: {
	name: string;
	raffleCode: string;
}): TextMessage {
	return text(
		`🏆 *PARABÉNS, ${name}!* 🎉\n\n` +
			"Você foi sorteado e ganhou uma *Churrasqueira Champions Grill* no Sorteio Profills Fispal 2026!\n\n" +
			`Seu código vencedor: *${raffleCode}*\n\n` +
			"Nossa equipe entrará em contato para combinar a entrega do prêmio. Aproveite! 🎊"
	);
}

export function winnerCooler({
	name,
	raffleCode,
}: {
	name: string;
	raffleCode: string;
}): TextMessage {
	return text(
		`🏆 *PARABÉNS, ${name}!* 🎉\n\n` +
			"Você foi sorteado e ganhou um *Cooler Profills* no Sorteio Profills Fispal 2026!\n\n" +
			`Seu código vencedor: *${raffleCode}*\n\n` +
			"Nossa equipe entrará em contato para combinar a entrega do prêmio. Aproveite! 🎊"
	);
}

// Exporta o tipo unificado para uso pelos módulos de envio
export type { BotMessage, InteractiveMessage, TextMessage };
