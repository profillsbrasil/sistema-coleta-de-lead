import { describe, expect, it } from "vitest";
import type { Participant, StateMachineConfig } from "../state-machine";
import { handleInbound } from "../state-machine";
import type { InboundMessage } from "../types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_CONFIG: StateMachineConfig = {
	eventName: "Sorteio Profills Fispal 2026",
	raffleDate: "05/06/2026",
	termsVersion: "v1",
	vendorName: "Fulano Vendedor",
	vendorPhone: "5511999990000",
	eventStartBR: "26/05",
	eventEndBR: "29/05",
};

const CONFIG_WITH_IMAGE: StateMachineConfig = {
	...BASE_CONFIG,
	welcomeImageUrl: "https://example.com/banner.jpg",
};

function makeParticipant(overrides: Partial<Participant> = {}): Participant {
	return {
		id: "00000000-0000-0000-0000-000000000001",
		waId: "5511999990001",
		state: "AWAITING_CONSENT",
		name: null,
		company: null,
		raffleCode: null,
		consentAt: null,
		declinedAt: null,
		termsVersion: null,
		retryCount: 0,
		redirectSentAt: null,
		redirectCount: 0,
		createdAt: new Date(),
		updatedAt: new Date(), // recente por padrão — testes de TTL sobrescrevem explicitamente
		...overrides,
	};
}

function textMsg(body: string): InboundMessage {
	return {
		id: "wamid.test",
		from: "5511999990001",
		timestamp: "1700000000",
		type: "text",
		text: { body },
	};
}

function buttonReplyMsg(id: string, title: string): InboundMessage {
	return {
		id: "wamid.test",
		from: "5511999990001",
		timestamp: "1700000000",
		type: "interactive",
		interactive: { type: "button_reply", button_reply: { id, title } },
	};
}

function unknownMsg(): InboundMessage {
	return {
		id: "wamid.test",
		from: "5511999990001",
		timestamp: "1700000000",
		type: "image",
	} as InboundMessage;
}

// ---------------------------------------------------------------------------
// describe: null participant (NEW)
// ---------------------------------------------------------------------------

describe("handleInbound — participant=null (first inbound)", () => {
	it("texto 'Sorteio Profills Fispal 2026' (keyword) → cria AWAITING_CONSENT + welcome", () => {
		const result = handleInbound({
			participant: null,
			message: textMsg("Sorteio Profills Fispal 2026"),
			config: BASE_CONFIG,
		});

		expect(result.createParticipant?.state).toBe("AWAITING_CONSENT");
		expect(result.outbounds).toHaveLength(1);
		expect(result.outbounds[0]?.kind).toBe("interactive");
	});

	it("texto 'oi' (não-keyword) → cria NON_PARTICIPANT + redirect", () => {
		const result = handleInbound({
			participant: null,
			message: textMsg("oi"),
			config: BASE_CONFIG,
		});

		expect(result.createParticipant?.state).toBe("NON_PARTICIPANT");
		expect(result.outbounds).toHaveLength(1);
		expect(result.outbounds[0]?.kind).toBe("interactive");
		// Confirmar que é o redirect (button id want_to_participate)
		const action = result.outbounds[0] as {
			kind: "interactive";
			interactive: { action: { buttons: Array<{ reply: { id: string } }> } };
		};
		expect(action.interactive.action.buttons[0]?.reply.id).toBe(
			"want_to_participate"
		);
	});

	it("welcome com imageUrl tem header.image.link (single message)", () => {
		const result = handleInbound({
			participant: null,
			message: textMsg("sorteio"),
			config: CONFIG_WITH_IMAGE,
		});

		expect(result.outbounds).toHaveLength(1);
		const action = result.outbounds[0] as {
			kind: "interactive";
			interactive: { header?: { image: { link: string } } };
		};
		expect(action.interactive.header?.image.link).toBe(
			"https://example.com/banner.jpg"
		);
	});

	it("botão want_to_participate (vindo de redirect) → AWAITING_CONSENT", () => {
		const result = handleInbound({
			participant: null,
			message: buttonReplyMsg("want_to_participate", "Participar sorteio"),
			config: BASE_CONFIG,
		});

		expect(result.createParticipant?.state).toBe("AWAITING_CONSENT");
	});
});

// ---------------------------------------------------------------------------
// describe: AWAITING_CONSENT
// ---------------------------------------------------------------------------

describe("handleInbound — state=AWAITING_CONSENT", () => {
	it("button id=accept → AWAITING_NAME + askName", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_CONSENT" }),
			message: buttonReplyMsg("accept", "Aceito"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("AWAITING_NAME");
		expect(result.participantPatch?.consentAt).toBeInstanceOf(Date);
		expect(result.participantPatch?.termsVersion).toBe("v1");
		expect(result.outbounds).toHaveLength(1);
		expect(result.outbounds[0]?.kind).toBe("text");
	});

	it("button id=decline → DECLINED + declined message", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_CONSENT" }),
			message: buttonReplyMsg("decline", "Nao aceito"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("DECLINED");
		expect(result.participantPatch?.declinedAt).toBeInstanceOf(Date);
		expect(result.outbounds[0]?.kind).toBe("text");
	});

	it("texto 'aceito' → AWAITING_NAME", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_CONSENT" }),
			message: textMsg("aceito"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("AWAITING_NAME");
	});

	it("texto 'Sim' (maiúsculo) → AWAITING_NAME", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_CONSENT" }),
			message: textMsg("Sim"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("AWAITING_NAME");
	});

	it("texto 'quero' → AWAITING_NAME", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_CONSENT" }),
			message: textMsg("quero"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("AWAITING_NAME");
	});

	it("texto 'ok' → AWAITING_NAME", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_CONSENT" }),
			message: textMsg("ok"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("AWAITING_NAME");
	});

	it("texto 'não' (com acento) → DECLINED", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_CONSENT" }),
			message: textMsg("não"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("DECLINED");
	});

	it("texto 'NÃO' (maiúsculo com acento) → DECLINED", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_CONSENT" }),
			message: textMsg("NÃO"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("DECLINED");
	});

	it("texto 'NÂO' (acento circunflexo malformado) → DECLINED", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_CONSENT" }),
			message: textMsg("NÂO"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("DECLINED");
	});

	it("texto 'recuso' → DECLINED", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_CONSENT" }),
			message: textMsg("recuso"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("DECLINED");
	});

	it("texto 'recusar' → DECLINED", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_CONSENT" }),
			message: textMsg("recusar"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("DECLINED");
	});

	it("texto 'nao aceito' → DECLINED (two-word exact match)", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_CONSENT" }),
			message: textMsg("nao aceito"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("DECLINED");
	});

	it("texto 'Não Aceito' (acento + maiúsculo + dois termos) → DECLINED", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_CONSENT" }),
			message: textMsg("Não Aceito"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("DECLINED");
	});

	it("resposta inválida → incrementa retryCount e reenvia interactive", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "AWAITING_CONSENT",
				retryCount: 0,
			}),
			message: textMsg("talvez"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.retryCount).toBe(1);
		expect(result.outbounds).toHaveLength(1);
		expect(result.outbounds[0]?.kind).toBe("interactive");
	});

	it("2ª resposta inválida → retryCount=2 e ainda reenvia interactive", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "AWAITING_CONSENT",
				retryCount: 1,
			}),
			message: textMsg("sei lá"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.retryCount).toBe(2);
		expect(result.outbounds).toHaveLength(1);
		expect(result.outbounds[0]?.kind).toBe("interactive");
	});

	// Fix #9: após 3 tentativas inválidas → NON_PARTICIPANT + redirect (não mais silêncio)
	it("3ª resposta inválida (retryCount=2 → 3) → NON_PARTICIPANT + redirect", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "AWAITING_CONSENT",
				retryCount: 2,
			}),
			message: textMsg("hmm"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.retryCount).toBe(3);
		expect(result.participantPatch?.state).toBe("NON_PARTICIPANT");
		expect(result.outbounds).toHaveLength(1);
		expect(result.outbounds[0]?.kind).toBe("interactive");
	});

	// Fix #9 + #12: 3 retries mas redirectCount já exaurido → silêncio
	it("3ª resposta inválida mas redirectCount >= 3 → NON_PARTICIPANT + silêncio", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "AWAITING_CONSENT",
				retryCount: 2,
				redirectCount: 3,
			}),
			message: textMsg("hmm"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("NON_PARTICIPANT");
		expect(result.outbounds).toHaveLength(0);
	});

	it("whole-word: 'simsim' não deve casar como yes", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "AWAITING_CONSENT",
				retryCount: 0,
			}),
			message: textMsg("simsim"),
			config: BASE_CONFIG,
		});

		// Não deve ser aceito como yes → cai no caminho de invalid
		expect(result.participantPatch?.state).toBeUndefined();
		expect(result.participantPatch?.retryCount).toBe(1);
	});

	it("whole-word: 'naozinho' não deve casar como no", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "AWAITING_CONSENT",
				retryCount: 0,
			}),
			message: textMsg("naozinho"),
			config: BASE_CONFIG,
		});

		// Não deve ser declínio → cai no caminho de invalid
		expect(result.participantPatch?.state).toBeUndefined();
		expect(result.participantPatch?.retryCount).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// describe: TTL 24h — Fix #10 + #13
// ---------------------------------------------------------------------------

describe("handleInbound — TTL 24h em estados intermediários", () => {
	const STALE_DATE = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25h atrás

	it("AWAITING_CONSENT com updatedAt > 24h → trata como NEW (keyword → AWAITING_CONSENT)", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "AWAITING_CONSENT",
				updatedAt: STALE_DATE,
			}),
			message: textMsg("sorteio"),
			config: BASE_CONFIG,
		});

		// handleNew: keyword detectada → createParticipant com AWAITING_CONSENT
		expect(result.createParticipant?.state).toBe("AWAITING_CONSENT");
		expect(result.outbounds[0]?.kind).toBe("interactive");
	});

	it("AWAITING_CONSENT com updatedAt > 24h → trata como NEW (não-keyword → NON_PARTICIPANT)", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "AWAITING_CONSENT",
				updatedAt: STALE_DATE,
			}),
			message: textMsg("oi"),
			config: BASE_CONFIG,
		});

		expect(result.createParticipant?.state).toBe("NON_PARTICIPANT");
	});

	it("AWAITING_NAME com updatedAt > 24h → trata como NEW", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "AWAITING_NAME",
				updatedAt: STALE_DATE,
			}),
			message: textMsg("sorteio"),
			config: BASE_CONFIG,
		});

		expect(result.createParticipant?.state).toBe("AWAITING_CONSENT");
	});

	it("AWAITING_COMPANY com updatedAt > 24h → trata como NEW", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "AWAITING_COMPANY",
				updatedAt: STALE_DATE,
			}),
			message: textMsg("sorteio"),
			config: BASE_CONFIG,
		});

		expect(result.createParticipant?.state).toBe("AWAITING_CONSENT");
	});

	it("AWAITING_CONSENT com updatedAt recente → NÃO reseta, processa normalmente", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "AWAITING_CONSENT",
				updatedAt: new Date(), // agora
			}),
			message: buttonReplyMsg("accept", "Aceito"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("AWAITING_NAME");
	});

	it("COMPLETED com updatedAt > 24h → NÃO reseta (TTL só afeta intermediários)", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "COMPLETED",
				name: "João",
				raffleCode: "PROF-0001",
				updatedAt: STALE_DATE,
			}),
			message: textMsg("oi"),
			config: BASE_CONFIG,
		});

		// Deve responder com alreadyParticipated, não tratar como NEW
		expect(result.participantPatch).toBeNull();
		expect(result.outbounds[0]?.kind).toBe("text");
	});
});

// ---------------------------------------------------------------------------
// describe: AWAITING_NAME
// ---------------------------------------------------------------------------

describe("handleInbound — state=AWAITING_NAME", () => {
	it("nome válido (>= 2 chars) → AWAITING_COMPANY + askCompany", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_NAME" }),
			message: textMsg("João Silva"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("AWAITING_COMPANY");
		expect(result.participantPatch?.name).toBe("João Silva");
		expect(result.outbounds[0]?.kind).toBe("text");
	});

	it("nome com espaços nas bordas é trimado antes de salvar", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_NAME" }),
			message: textMsg("  Ana  "),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.name).toBe("Ana");
		expect(result.participantPatch?.state).toBe("AWAITING_COMPANY");
	});

	it("nome com apenas 1 char → nameInvalid, retryCount incrementa", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_NAME", retryCount: 0 }),
			message: textMsg("X"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBeUndefined();
		expect(result.participantPatch?.retryCount).toBe(1);
		expect(result.outbounds[0]?.kind).toBe("text");
	});

	it("nome com 81 chars → nameInvalid, retryCount incrementa", () => {
		const longName = "A".repeat(81);
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_NAME", retryCount: 0 }),
			message: textMsg(longName),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBeUndefined();
		expect(result.participantPatch?.retryCount).toBe(1);
		expect(result.outbounds[0]?.kind).toBe("text");
	});

	it("nome com exatamente 80 chars é válido", () => {
		const name80 = "B".repeat(80);
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_NAME" }),
			message: textMsg(name80),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("AWAITING_COMPANY");
		expect(result.participantPatch?.name).toBe(name80);
	});

	// Fix #14: mídia conta retry
	it("mensagem não-texto (button_reply) → nameInvalid + retryCount incrementa", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_NAME", retryCount: 0 }),
			message: buttonReplyMsg("accept", "Aceito"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBeUndefined();
		expect(result.participantPatch?.retryCount).toBe(1);
		expect(result.outbounds[0]?.kind).toBe("text");
	});

	// Fix #14: mídia conta retry
	it("mensagem tipo image (não-texto) → nameInvalid + retryCount incrementa", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_NAME", retryCount: 0 }),
			message: unknownMsg(),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBeUndefined();
		expect(result.participantPatch?.retryCount).toBe(1);
		expect(result.outbounds[0]?.kind).toBe("text");
	});

	// Fix #14: 3 inválidas → NON_PARTICIPANT + redirect
	it("3ª inválida em AWAITING_NAME (retryCount=2) → NON_PARTICIPANT + redirect", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_NAME", retryCount: 2 }),
			message: unknownMsg(),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("NON_PARTICIPANT");
		expect(result.participantPatch?.retryCount).toBe(3);
		expect(result.outbounds).toHaveLength(1);
		expect(result.outbounds[0]?.kind).toBe("interactive");
	});

	// Fix #14 + #12: 3 inválidas mas redirectCount exaurido → silêncio
	it("3ª inválida em AWAITING_NAME mas redirectCount >= 3 → silêncio", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "AWAITING_NAME",
				retryCount: 2,
				redirectCount: 3,
			}),
			message: unknownMsg(),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("NON_PARTICIPANT");
		expect(result.outbounds).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// describe: AWAITING_COMPANY
// ---------------------------------------------------------------------------

describe("handleInbound — state=AWAITING_COMPANY", () => {
	it("empresa válida → COMPLETED + generateAndSendCode", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_COMPANY", name: "João" }),
			message: textMsg("Profills"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("COMPLETED");
		expect(result.participantPatch?.company).toBe("Profills");
		expect(result.outbounds).toHaveLength(1);
		expect(result.outbounds[0]?.kind).toBe("generateAndSendCode");
	});

	it("empresa com espaços é trimada antes de salvar", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "AWAITING_COMPANY",
				name: "Maria",
			}),
			message: textMsg("  Emach Digital  "),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.company).toBe("Emach Digital");
	});

	it("empresa vazia (só espaços) → companyInvalid, retryCount incrementa", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "AWAITING_COMPANY",
				name: "Pedro",
				retryCount: 0,
			}),
			message: textMsg("   "),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBeUndefined();
		expect(result.participantPatch?.retryCount).toBe(1);
		expect(result.outbounds[0]?.kind).toBe("text");
	});

	it("empresa com 81 chars → companyInvalid, retryCount incrementa", () => {
		const longCompany = "C".repeat(81);
		const result = handleInbound({
			participant: makeParticipant({
				state: "AWAITING_COMPANY",
				name: "Pedro",
				retryCount: 0,
			}),
			message: textMsg(longCompany),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBeUndefined();
		expect(result.participantPatch?.retryCount).toBe(1);
		expect(result.outbounds[0]?.kind).toBe("text");
	});

	// Fix #14: mídia conta retry
	it("mensagem não-texto (button_reply) → companyInvalid + retryCount incrementa", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "AWAITING_COMPANY",
				name: "Ana",
				retryCount: 0,
			}),
			message: buttonReplyMsg("accept", "Aceito"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBeUndefined();
		expect(result.participantPatch?.retryCount).toBe(1);
		expect(result.outbounds[0]?.kind).toBe("text");
	});

	// Fix #14: 3 inválidas → NON_PARTICIPANT + redirect
	it("3ª inválida em AWAITING_COMPANY (retryCount=2) → NON_PARTICIPANT + redirect", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "AWAITING_COMPANY",
				name: "Ana",
				retryCount: 2,
			}),
			message: unknownMsg(),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("NON_PARTICIPANT");
		expect(result.participantPatch?.retryCount).toBe(3);
		expect(result.outbounds).toHaveLength(1);
		expect(result.outbounds[0]?.kind).toBe("interactive");
	});
});

// ---------------------------------------------------------------------------
// describe: COMPLETED
// ---------------------------------------------------------------------------

describe("handleInbound — state=COMPLETED", () => {
	const completedParticipant = makeParticipant({
		state: "COMPLETED",
		name: "João Silva",
		raffleCode: "PROF-0001",
	});

	it("qualquer texto → alreadyParticipated (status e help removidos)", () => {
		const result = handleInbound({
			participant: completedParticipant,
			message: textMsg("oi tudo bem?"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch).toBeNull();
		expect(result.outbounds[0]?.kind).toBe("text");
	});

	it("texto 'status' → alreadyParticipated (comando removido)", () => {
		const result = handleInbound({
			participant: completedParticipant,
			message: textMsg("status"),
			config: BASE_CONFIG,
		});

		expect(result.outbounds[0]?.kind).toBe("text");
	});

	it("texto 'ajuda' → alreadyParticipated (comando removido)", () => {
		const result = handleInbound({
			participant: completedParticipant,
			message: textMsg("ajuda"),
			config: BASE_CONFIG,
		});

		expect(result.outbounds[0]?.kind).toBe("text");
	});

	it("mensagem não-texto → alreadyParticipated", () => {
		const result = handleInbound({
			participant: completedParticipant,
			message: unknownMsg(),
			config: BASE_CONFIG,
		});

		expect(result.outbounds[0]?.kind).toBe("text");
	});
});

// ---------------------------------------------------------------------------
// describe: NON_PARTICIPANT
// ---------------------------------------------------------------------------

describe("handleInbound — state=NON_PARTICIPANT", () => {
	it("botão want_to_participate → AWAITING_CONSENT + welcome", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "NON_PARTICIPANT" }),
			message: buttonReplyMsg("want_to_participate", "Participar sorteio"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("AWAITING_CONSENT");
		expect(result.outbounds[0]?.kind).toBe("interactive");
	});

	it("botão already_registered sem código → AWAITING_CONSENT + welcome", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "NON_PARTICIPANT" }),
			message: buttonReplyMsg("already_registered", "Ja me cadastrei"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("AWAITING_CONSENT");
	});

	it("botão already_registered COM código → alreadyParticipated", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "NON_PARTICIPANT",
				name: "João",
				raffleCode: "PROFILLS-1234",
			}),
			message: buttonReplyMsg("already_registered", "Ja me cadastrei"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch).toBeNull();
		expect(result.outbounds[0]?.kind).toBe("text");
	});

	it("keyword 'sorteio' → AWAITING_CONSENT", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "NON_PARTICIPANT" }),
			message: textMsg("vim pelo sorteio"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("AWAITING_CONSENT");
	});

	it("outra mensagem SEM cooldown → reenvia redirect", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "NON_PARTICIPANT",
				redirectSentAt: null,
			}),
			message: textMsg("ainda estou aqui"),
			config: BASE_CONFIG,
		});

		expect(result.outbounds).toHaveLength(1);
		expect(result.outbounds[0]?.kind).toBe("interactive");
	});

	it("outra mensagem DENTRO do cooldown → silêncio", () => {
		const recentSent = new Date(Date.now() - 60_000); // 1 min ago
		const result = handleInbound({
			participant: makeParticipant({
				state: "NON_PARTICIPANT",
				redirectSentAt: recentSent,
			}),
			message: textMsg("oi"),
			config: BASE_CONFIG,
		});

		expect(result.outbounds).toHaveLength(0);
	});

	it("outra mensagem FORA do cooldown → reenvia redirect", () => {
		const oldSent = new Date(Date.now() - 5 * 60 * 60 * 1000); // 5h ago
		const result = handleInbound({
			participant: makeParticipant({
				state: "NON_PARTICIPANT",
				redirectSentAt: oldSent,
			}),
			message: textMsg("oi"),
			config: BASE_CONFIG,
		});

		expect(result.outbounds).toHaveLength(1);
	});

	// Fix #12: redirectCount >= 3 → silêncio permanente
	it("redirectCount >= 3 → silêncio permanente (sem cooldown)", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "NON_PARTICIPANT",
				redirectCount: 3,
				redirectSentAt: null,
			}),
			message: textMsg("oi"),
			config: BASE_CONFIG,
		});

		expect(result.outbounds).toHaveLength(0);
		expect(result.participantPatch).toBeNull();
	});

	// Fix #12: redirectCount >= 3 mesmo com cooldown expirado → silêncio
	it("redirectCount=5 e cooldown expirado → ainda silêncio permanente", () => {
		const oldSent = new Date(Date.now() - 10 * 60 * 60 * 1000); // 10h ago
		const result = handleInbound({
			participant: makeParticipant({
				state: "NON_PARTICIPANT",
				redirectCount: 5,
				redirectSentAt: oldSent,
			}),
			message: textMsg("oi"),
			config: BASE_CONFIG,
		});

		expect(result.outbounds).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// describe: DECLINED — Fix #11 + #12
// ---------------------------------------------------------------------------

describe("handleInbound — state=DECLINED", () => {
	// Fix #11: botão want_to_participate → welcome (não reoffer)
	it("botão want_to_participate → AWAITING_CONSENT + welcome (não reoffer)", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "DECLINED" }),
			message: buttonReplyMsg("want_to_participate", "Participar sorteio"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("AWAITING_CONSENT");
		expect(result.participantPatch?.declinedAt).toBeNull();
		expect(result.participantPatch?.retryCount).toBe(0);
		expect(result.outbounds[0]?.kind).toBe("interactive");
	});

	// Fix #11: keyword → redirect (não mais reoffer)
	it("keyword 'sorteio' → redirect (não reoffer)", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "DECLINED",
				declinedAt: new Date("2026-01-01T12:00:00Z"),
				retryCount: 1,
				redirectSentAt: null,
			}),
			message: textMsg("quero participar do sorteio"),
			config: BASE_CONFIG,
		});

		// Não deve mais ir para AWAITING_CONSENT via keyword
		expect(result.participantPatch?.state).toBeUndefined();
		// Deve enviar redirect (não reoffer, não silêncio)
		expect(result.outbounds).toHaveLength(1);
		expect(result.outbounds[0]?.kind).toBe("interactive");
	});

	it("mensagem não-keyword SEM cooldown → envia redirect", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "DECLINED",
				redirectSentAt: null,
			}),
			message: textMsg("oi"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch).toBeNull();
		expect(result.outbounds).toHaveLength(1);
		expect(result.outbounds[0]?.kind).toBe("interactive");
	});

	it("mensagem não-keyword DENTRO do cooldown → silêncio", () => {
		const recentSent = new Date(Date.now() - 60_000);
		const result = handleInbound({
			participant: makeParticipant({
				state: "DECLINED",
				redirectSentAt: recentSent,
			}),
			message: textMsg("oi"),
			config: BASE_CONFIG,
		});

		expect(result.outbounds).toHaveLength(0);
	});

	it("mensagem não-keyword FORA do cooldown → reenvia redirect", () => {
		const oldSent = new Date(Date.now() - 5 * 60 * 60 * 1000); // 5h ago
		const result = handleInbound({
			participant: makeParticipant({
				state: "DECLINED",
				redirectSentAt: oldSent,
			}),
			message: textMsg("oi"),
			config: BASE_CONFIG,
		});

		expect(result.outbounds).toHaveLength(1);
		expect(result.outbounds[0]?.kind).toBe("interactive");
	});

	// Fix #12: DECLINED + redirectCount >= 3 → silêncio permanente
	it("redirectCount >= 3 em DECLINED → silêncio permanente", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "DECLINED",
				redirectCount: 3,
				redirectSentAt: null,
			}),
			message: textMsg("oi"),
			config: BASE_CONFIG,
		});

		expect(result.outbounds).toHaveLength(0);
	});

	// Fix #12: redirectCount >= 3 mas want_to_participate ainda funciona
	it("redirectCount >= 3 mas botão want_to_participate → ainda transiciona para AWAITING_CONSENT", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "DECLINED",
				redirectCount: 3,
			}),
			message: buttonReplyMsg("want_to_participate", "Participar sorteio"),
			config: BASE_CONFIG,
		});

		// O botão explícito ainda funciona mesmo com redirectCount exaurido
		expect(result.participantPatch?.state).toBe("AWAITING_CONSENT");
	});
});
