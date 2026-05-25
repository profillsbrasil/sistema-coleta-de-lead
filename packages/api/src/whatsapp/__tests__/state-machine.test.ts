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
	vendorPhone: "5511999990000",
	eventStartBR: "26/05",
	eventEndBR: "29/05",
	instagramProfiles: [
		{ handle: "@p1", url: "https://instagram.com/p1" },
		{ handle: "@p2", url: "https://instagram.com/p2" },
		{ handle: "@p3", url: "https://instagram.com/p3" },
	],
	officialPostUrl: "https://instagram.com/profillsdobrasil",
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
		lastResponseAt: null,
		taskProgress: {
			follow_1: false,
			follow_2: false,
			follow_3: false,
			comment: false,
		},
		optedOutAt: null,
		optedOutReason: null,
		humanHandoffRequestedAt: null,
		lastInboundAt: null,
		termsUrlSnapshot: null,
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

	it("texto 'oi' (não-keyword) → cria NON_PARTICIPANT + eventNotice cta_url", () => {
		const result = handleInbound({
			participant: null,
			message: textMsg("oi"),
			config: BASE_CONFIG,
		});

		expect(result.createParticipant?.state).toBe("NON_PARTICIPANT");
		expect(result.outbounds).toHaveLength(1);
		expect(result.outbounds[0]?.kind).toBe("interactive");
		expect(result.wasEventNotice).toBe(true);
		const action = result.outbounds[0] as {
			kind: "interactive";
			interactive: {
				type: string;
				action: { parameters: { display_text: string; url: string } };
			};
		};
		expect(action.interactive.type).toBe("cta_url");
		expect(action.interactive.action.parameters.display_text).toBe(
			"Falar com a equipe"
		);
		expect(action.interactive.action.parameters.url).toBe(
			`https://wa.me/${BASE_CONFIG.vendorPhone}`
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

	it("button_reply legacy (sem keyword) → cliente comum, eventNotice", () => {
		// Após remoção dos botões REDIRECT_BUTTONS, um button_reply lingering
		// de mensagem antiga não dispara fluxo de sorteio — cai em eventNotice.
		const result = handleInbound({
			participant: null,
			message: buttonReplyMsg("want_to_participate", "Participar sorteio"),
			config: BASE_CONFIG,
		});

		expect(result.createParticipant?.state).toBe("NON_PARTICIPANT");
		expect(result.wasEventNotice).toBe(true);
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
		expect(result.outbounds[0]?.kind).toBe("interactive");
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

	// Fix #9 + #12 (A5): 3 retries mas eventNotice já enviado → silêncio
	it("3ª resposta inválida mas redirectCount >= 1 → NON_PARTICIPANT + silêncio", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "AWAITING_CONSENT",
				retryCount: 2,
				redirectCount: 1,
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
		expect(result.participantPatch?.state).toBeUndefined();
		expect(result.participantPatch?.lastResponseAt).toBeInstanceOf(Date);
		expect(result.outbounds[0]?.kind).toBe("interactive");
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
			message: textMsg("  Ana Silva  "),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.name).toBe("Ana Silva");
		expect(result.participantPatch?.state).toBe("AWAITING_COMPANY");
	});

	it("nome sem sobrenome → nameInvalid + retryCount incrementa", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_NAME", retryCount: 0 }),
			message: textMsg("Othavio"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBeUndefined();
		expect(result.participantPatch?.retryCount).toBe(1);
		expect(result.outbounds[0]?.kind).toBe("text");
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
		// Padrão alternado pra não disparar long-run (4+ chars iguais).
		const first = "Ab".repeat(20); // 40 chars
		const last = "Cd".repeat(19) + "e"; // 39 chars
		const name80 = `${first} ${last}`;
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

	// Fix #14 + #12 (A5): 3 inválidas mas eventNotice já enviado → silêncio
	it("3ª inválida em AWAITING_NAME mas redirectCount >= 1 → silêncio", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "AWAITING_NAME",
				retryCount: 2,
				redirectCount: 1,
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
	it("empresa válida → AWAITING_TASKS + tasksList + tasksConfirm", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_COMPANY", name: "João" }),
			message: textMsg("Profills"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("AWAITING_TASKS");
		expect(result.participantPatch?.company).toBe("Profills");
		expect(result.outbounds).toHaveLength(2);
		expect(result.outbounds[0]?.kind).toBe("interactive");
		expect(result.outbounds[1]?.kind).toBe("interactive");
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
// describe: AWAITING_TASKS
// ---------------------------------------------------------------------------

describe("handleInbound — state=AWAITING_TASKS", () => {
	function tasksParticipant(overrides: Partial<Participant> = {}): Participant {
		return makeParticipant({
			state: "AWAITING_TASKS",
			name: "João Silva",
			company: "Profills",
			...overrides,
		});
	}

	it("botão tasks_done → COMPLETED + generateAndSendCode", () => {
		const result = handleInbound({
			participant: tasksParticipant(),
			message: buttonReplyMsg("tasks_done", "Já concluí"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("COMPLETED");
		expect(result.participantPatch?.taskProgress).toEqual({
			follow_1: true,
			follow_2: true,
			follow_3: true,
			comment: true,
		});
		expect(result.outbounds[0]?.kind).toBe("generateAndSendCode");
	});

	it("texto livre em AWAITING_TASKS → repete tasksIntro", () => {
		const result = handleInbound({
			participant: tasksParticipant(),
			message: textMsg("já segui"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.taskProgress).toBeUndefined();
		expect(result.outbounds[0]?.kind).toBe("interactive");
	});

	it("button_reply inesperado em AWAITING_TASKS → repete tasksIntro", () => {
		const result = handleInbound({
			participant: tasksParticipant(),
			message: buttonReplyMsg("follow_1", "Segui o 1º"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.taskProgress).toBeUndefined();
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

	it("qualquer texto → alreadyParticipated com botão CTA contato vendedor", () => {
		const result = handleInbound({
			participant: completedParticipant,
			message: textMsg("oi tudo bem?"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.lastResponseAt).toBeInstanceOf(Date);
		const action = result.outbounds[0];
		expect(action?.kind).toBe("interactive");
		if (action?.kind !== "interactive") {
			throw new Error("expected interactive");
		}
		expect(action.interactive.type).toBe("cta_url");
		if (action.interactive.type !== "cta_url") {
			throw new Error("expected cta_url");
		}
		expect(action.interactive.action.parameters.url).toBe(
			`https://wa.me/${BASE_CONFIG.vendorPhone}`
		);
		expect(action.interactive.action.parameters.display_text).toBe(
			"Entrar em contato"
		);
	});

	it("texto 'status' → alreadyParticipated (comando removido)", () => {
		const result = handleInbound({
			participant: completedParticipant,
			message: textMsg("status"),
			config: BASE_CONFIG,
		});

		expect(result.outbounds[0]?.kind).toBe("interactive");
	});

	it("texto 'ajuda' → alreadyParticipated (comando removido)", () => {
		const result = handleInbound({
			participant: completedParticipant,
			message: textMsg("ajuda"),
			config: BASE_CONFIG,
		});

		expect(result.outbounds[0]?.kind).toBe("interactive");
	});

	it("mensagem não-texto → alreadyParticipated", () => {
		const result = handleInbound({
			participant: completedParticipant,
			message: unknownMsg(),
			config: BASE_CONFIG,
		});

		expect(result.outbounds[0]?.kind).toBe("interactive");
	});

	it("dentro do cooldown de resposta → silêncio (anti-flood)", () => {
		const recent = new Date(Date.now() - 2_000);
		const result = handleInbound({
			participant: makeParticipant({
				state: "COMPLETED",
				name: "João Silva",
				raffleCode: "PROF-0001",
				lastResponseAt: recent,
			}),
			message: textMsg("oi"),
			config: BASE_CONFIG,
		});

		expect(result.outbounds).toHaveLength(0);
		expect(result.participantPatch).toBeNull();
	});

	it("fora do cooldown → responde normalmente", () => {
		const old = new Date(Date.now() - 30_000);
		const result = handleInbound({
			participant: makeParticipant({
				state: "COMPLETED",
				name: "João Silva",
				raffleCode: "PROF-0001",
				lastResponseAt: old,
			}),
			message: textMsg("oi"),
			config: BASE_CONFIG,
		});

		expect(result.outbounds).toHaveLength(1);
		expect(result.participantPatch?.lastResponseAt).toBeInstanceOf(Date);
	});
});

// ---------------------------------------------------------------------------
// describe: NON_PARTICIPANT
// ---------------------------------------------------------------------------

describe("handleInbound — state=NON_PARTICIPANT", () => {
	it("button_reply legacy (sem keyword) → eventNotice", () => {
		// Botões antigos foram removidos; button_reply lingering cai no caminho não-keyword.
		const result = handleInbound({
			participant: makeParticipant({
				state: "NON_PARTICIPANT",
				redirectCount: 0,
			}),
			message: buttonReplyMsg("want_to_participate", "Participar sorteio"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch).toBeNull();
		expect(result.wasEventNotice).toBe(true);
	});

	it("keyword 'sorteio' → AWAITING_CONSENT", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "NON_PARTICIPANT" }),
			message: textMsg("vim pelo sorteio"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("AWAITING_CONSENT");
	});

	it("primeira mensagem genérica (redirectCount=0) → envia eventNotice único", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "NON_PARTICIPANT",
				redirectCount: 0,
			}),
			message: textMsg("ainda estou aqui"),
			config: BASE_CONFIG,
		});

		expect(result.outbounds).toHaveLength(1);
		expect(result.outbounds[0]?.kind).toBe("interactive");
		expect(result.wasEventNotice).toBe(true);
	});

	// A5: envio único — segunda mensagem genérica vira silêncio permanente
	it("segunda mensagem genérica (redirectCount=1) → silêncio permanente", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "NON_PARTICIPANT",
				redirectCount: 1,
			}),
			message: textMsg("oi"),
			config: BASE_CONFIG,
		});

		expect(result.outbounds).toHaveLength(0);
		expect(result.participantPatch).toBeNull();
	});

	// A5: keyword ainda reabre fluxo mesmo após eventNotice exaurido
	it("redirectCount=1 mas keyword → reabre fluxo (override do silêncio)", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "NON_PARTICIPANT",
				redirectCount: 1,
			}),
			message: textMsg("vim pelo sorteio"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("AWAITING_CONSENT");
	});
});

// ---------------------------------------------------------------------------
// describe: DECLINED — Fix #11 + #12
// ---------------------------------------------------------------------------

describe("handleInbound — state=DECLINED", () => {
	it("keyword 'sorteio' → reabre fluxo (AWAITING_CONSENT + welcome)", () => {
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

		expect(result.participantPatch?.state).toBe("AWAITING_CONSENT");
		expect(result.participantPatch?.declinedAt).toBeNull();
		expect(result.participantPatch?.retryCount).toBe(0);
		expect(result.outbounds[0]?.kind).toBe("interactive");
	});

	it("mensagem não-keyword com redirectCount=0 → envia eventNotice único", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "DECLINED",
				redirectCount: 0,
			}),
			message: textMsg("oi"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch).toBeNull();
		expect(result.outbounds).toHaveLength(1);
		expect(result.outbounds[0]?.kind).toBe("interactive");
		expect(result.wasEventNotice).toBe(true);
	});

	// A5: envio único — segunda mensagem genérica vira silêncio permanente
	it("redirectCount >= 1 em DECLINED → silêncio permanente", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "DECLINED",
				redirectCount: 1,
			}),
			message: textMsg("oi"),
			config: BASE_CONFIG,
		});

		expect(result.outbounds).toHaveLength(0);
		expect(result.wasEventNotice).toBeUndefined();
	});

	it("redirectCount >= 1 mas keyword → ainda reabre fluxo (override do limite)", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "DECLINED",
				redirectCount: 1,
			}),
			message: textMsg("vim pelo sorteio"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("AWAITING_CONSENT");
	});
});
