/**
 * Textos PT-BR centralizados do bot WhatsApp Profills.
 *
 * Módulo puro: apenas constantes e helpers de interpolação. Sem I/O.
 */

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface TextMessage {
	type: 'text';
	body: string;
}

interface InteractiveButton {
	type: 'reply';
	reply: { id: string; title: string };
}

interface InteractiveMessage {
	type: 'interactive';
	interactive: {
		type: 'button';
		body: { text: string };
		action: { buttons: InteractiveButton[] };
	};
}

type BotMessage = TextMessage | InteractiveMessage;

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function text(body: string): TextMessage {
	return { type: 'text', body };
}

function interactive(bodyText: string, buttons: Array<{ id: string; title: string }>): InteractiveMessage {
	return {
		type: 'interactive',
		interactive: {
			type: 'button',
			body: { text: bodyText },
			action: {
				buttons: buttons.map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title } })),
			},
		},
	};
}

const CONSENT_BUTTONS = [
	{ id: 'accept', title: 'Aceito' },
	{ id: 'decline', title: 'Nao aceito' },
];

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export function welcome({ eventName }: { eventName: string }): InteractiveMessage {
	return interactive(
		`Ola! Bem-vindo ao *Sorteio Profills Fispal 2026* 🎉\n\n` +
		`Participe e concorra a premios incriveis:\n` +
		`• TV 65"\n` +
		`• Churrasqueira Champions Grill\n` +
		`• Cooler Profills\n\n` +
		`Evento: *${eventName}*\n\n` +
		`📋 *LGPD:* Ao aceitar, voce autoriza a Profills a usar seu telefone, nome e empresa apenas para sorteio e contato comercial relacionado.`,
		CONSENT_BUTTONS,
	);
}

export function regulamento(): TextMessage {
	return text(
		`📜 *Regulamento Sorteio Profills Fispal 2026*\n\n` +
		`• Sorteio realizado ao vivo no estande Profills.\n` +
		`• Um participante por numero de WhatsApp.\n` +
		`• Os vencedores serao notificados por este WhatsApp.\n` +
		`• Premios: TV 65", Churrasqueira Champions Grill, Cooler Profills.\n` +
		`• Seus dados (nome, empresa, telefone) sao usados exclusivamente para o sorteio e contato comercial Profills.\n\n` +
		`Para participar, responda *Aceito* ou *Nao aceito*.`,
	);
}

export function askName(): TextMessage {
	return text('Show, voce esta participando! 😊 Qual e o seu *nome completo*?');
}

export function askCompany({ name }: { name: string }): TextMessage {
	return text(`Prazer, *${name}*! Em qual *empresa* voce trabalha?`);
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
	const dateInfo = raffleDate ? ` no dia *${raffleDate}*` : '';
	return text(
		`🎊 *${name}*, voce esta inscrito no sorteio!\n\n` +
		`Seu codigo: *${raffleCode}*\n\n` +
		`O sorteio acontece${dateInfo} ao vivo no estande Profills. Boa sorte! 🍀`,
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
		`Oi, *${name}*! Voce ja esta inscrito no sorteio 🎉\n\n` +
		`Seu codigo e: *${raffleCode}*\n\n` +
		`Aguarde o sorteio ao vivo no estande Profills. Boa sorte! 🍀`,
	);
}

export function status({ raffleCode }: { raffleCode: string }): TextMessage {
	return text(
		`✅ Voce esta inscrito no sorteio!\n\nSeu codigo: *${raffleCode}*\n\nAcompanhe o sorteio ao vivo no estande Profills.`,
	);
}

export function help(): TextMessage {
	return text(
		`ℹ️ *Comandos disponíveis:*\n\n` +
		`• *status* — consulta seu codigo de inscricao\n` +
		`• *regulamento* — exibe as regras do sorteio\n\n` +
		`Em caso de duvidas, fale com alguem do estande Profills.`,
	);
}

export function declined(): TextMessage {
	return text(
		`Tudo bem! Voce optou por nao participar do sorteio. ` +
		`Se mudar de ideia, e so entrar em contato novamente. 👋`,
	);
}

export function reoffer(): InteractiveMessage {
	return interactive(
		`Que bom ter voce de volta! 😊\n\n` +
		`Deseja participar do *Sorteio Profills Fispal 2026* e concorrer a:\n` +
		`• TV 65"\n` +
		`• Churrasqueira Champions Grill\n` +
		`• Cooler Profills\n\n` +
		`📋 Ao aceitar, voce autoriza a Profills a usar seu telefone, nome e empresa apenas para sorteio e contato comercial relacionado.`,
		CONSENT_BUTTONS,
	);
}

export function invalidConsentRetry(): InteractiveMessage {
	return interactive(
		`Nao entendi sua resposta 😅\n\n` +
		`Por favor, use os botoes abaixo para confirmar sua participacao no *Sorteio Profills Fispal 2026*:`,
		CONSENT_BUTTONS,
	);
}

export function nameInvalid(): TextMessage {
	return text(
		`Hmm, nao consegui identificar um nome valido. Por favor, envie seu *nome completo* (minimo 2 caracteres).`,
	);
}

export function companyInvalid(): TextMessage {
	return text(
		`Nao consegui identificar o nome da empresa. Por favor, envie o nome da *empresa* onde voce trabalha.`,
	);
}

export function winnerTv({ name, raffleCode }: { name: string; raffleCode: string }): TextMessage {
	return text(
		`🏆 *PARABENS, ${name}!* 🎉\n\n` +
		`Voce foi sorteado e ganhou uma *TV 65"* no Sorteio Profills Fispal 2026!\n\n` +
		`Seu codigo vencedor: *${raffleCode}*\n\n` +
		`Nossa equipe entrara em contato para combinar a entrega do premio. Aproveite! 🎊`,
	);
}

export function winnerChurrasqueira({ name, raffleCode }: { name: string; raffleCode: string }): TextMessage {
	return text(
		`🏆 *PARABENS, ${name}!* 🎉\n\n` +
		`Voce foi sorteado e ganhou uma *Churrasqueira Champions Grill* no Sorteio Profills Fispal 2026!\n\n` +
		`Seu codigo vencedor: *${raffleCode}*\n\n` +
		`Nossa equipe entrara em contato para combinar a entrega do premio. Aproveite! 🎊`,
	);
}

export function winnerCooler({ name, raffleCode }: { name: string; raffleCode: string }): TextMessage {
	return text(
		`🏆 *PARABENS, ${name}!* 🎉\n\n` +
		`Voce foi sorteado e ganhou um *Cooler Profills* no Sorteio Profills Fispal 2026!\n\n` +
		`Seu codigo vencedor: *${raffleCode}*\n\n` +
		`Nossa equipe entrara em contato para combinar a entrega do premio. Aproveite! 🎊`,
	);
}

// Exporta o tipo unificado para uso pelos módulos de envio
export type { BotMessage, TextMessage, InteractiveMessage };
