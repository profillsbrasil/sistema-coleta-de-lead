import { describe, expect, it } from "vitest";
import type { Participant, StateMachineConfig } from "../state-machine";
import { handleInbound } from "../state-machine";
import type { InboundMessage } from "../types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_CONFIG: StateMachineConfig = {
	eventName: "Sorteio Profills Fispal 2026",
	raffleDate: "25/06/2026",
	termsVersion: "v1",
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
		createdAt: new Date("2026-01-01T00:00:00Z"),
		updatedAt: new Date("2026-01-01T00:00:00Z"),
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
	it("cria participante com state=AWAITING_CONSENT e envia welcome interativo", () => {
		const result = handleInbound({
			participant: null,
			message: textMsg("oi"),
			config: BASE_CONFIG,
		});

		expect(result.createParticipant).toBeDefined();
		expect(result.createParticipant?.waId).toBe("5511999990001");
		expect(result.createParticipant?.state).toBe("AWAITING_CONSENT");
		expect(result.participantPatch).toBeNull();
		expect(result.outbounds).toHaveLength(1);
		expect(result.outbounds[0]?.kind).toBe("interactive");
	});

	it("prepend image action quando welcomeImageUrl está presente", () => {
		const result = handleInbound({
			participant: null,
			message: textMsg("oi"),
			config: CONFIG_WITH_IMAGE,
		});

		expect(result.outbounds).toHaveLength(2);
		expect(result.outbounds[0]?.kind).toBe("image");
		expect((result.outbounds[0] as { kind: "image"; link: string }).link).toBe(
			"https://example.com/banner.jpg"
		);
		expect(result.outbounds[1]?.kind).toBe("interactive");
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

	it("3ª resposta inválida (retryCount=2 → 3) → outbounds vazio (silent timeout)", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "AWAITING_CONSENT",
				retryCount: 2,
			}),
			message: textMsg("hmm"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.retryCount).toBe(3);
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

	it("nome com apenas 1 char → nameInvalid, sem patch de state", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_NAME" }),
			message: textMsg("X"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBeUndefined();
		expect(result.outbounds[0]?.kind).toBe("text");
	});

	it("nome com 81 chars → nameInvalid", () => {
		const longName = "A".repeat(81);
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_NAME" }),
			message: textMsg(longName),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBeUndefined();
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

	it("mensagem não-texto (button_reply) → nameInvalid", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_NAME" }),
			message: buttonReplyMsg("accept", "Aceito"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBeUndefined();
		expect(result.outbounds[0]?.kind).toBe("text");
	});

	it("mensagem tipo image (não-texto) → nameInvalid", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_NAME" }),
			message: unknownMsg(),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBeUndefined();
		expect(result.outbounds[0]?.kind).toBe("text");
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

	it("empresa vazia (só espaços) → companyInvalid", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "AWAITING_COMPANY",
				name: "Pedro",
			}),
			message: textMsg("   "),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBeUndefined();
		expect(result.outbounds[0]?.kind).toBe("text");
	});

	it("empresa com 81 chars → companyInvalid", () => {
		const longCompany = "C".repeat(81);
		const result = handleInbound({
			participant: makeParticipant({
				state: "AWAITING_COMPANY",
				name: "Pedro",
			}),
			message: textMsg(longCompany),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBeUndefined();
		expect(result.outbounds[0]?.kind).toBe("text");
	});

	it("mensagem não-texto (button_reply) → companyInvalid", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "AWAITING_COMPANY", name: "Ana" }),
			message: buttonReplyMsg("accept", "Aceito"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBeUndefined();
		expect(result.outbounds[0]?.kind).toBe("text");
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

	it("texto 'status' → status action", () => {
		const result = handleInbound({
			participant: completedParticipant,
			message: textMsg("status"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch).toBeNull();
		expect(result.outbounds[0]?.kind).toBe("text");
	});

	it("texto 'STATUS' (maiúsculo) → status action", () => {
		const result = handleInbound({
			participant: completedParticipant,
			message: textMsg("STATUS"),
			config: BASE_CONFIG,
		});

		expect(result.outbounds[0]?.kind).toBe("text");
	});

	it("texto 'Status' (capitalizado) → status action", () => {
		const result = handleInbound({
			participant: completedParticipant,
			message: textMsg("Status"),
			config: BASE_CONFIG,
		});

		expect(result.outbounds[0]?.kind).toBe("text");
	});

	it("texto '!status' → status action", () => {
		const result = handleInbound({
			participant: completedParticipant,
			message: textMsg("!status"),
			config: BASE_CONFIG,
		});

		expect(result.outbounds[0]?.kind).toBe("text");
	});

	it("texto '/status' → status action", () => {
		const result = handleInbound({
			participant: completedParticipant,
			message: textMsg("/status"),
			config: BASE_CONFIG,
		});

		expect(result.outbounds[0]?.kind).toBe("text");
	});

	it("texto 'ajuda' → help action", () => {
		const result = handleInbound({
			participant: completedParticipant,
			message: textMsg("ajuda"),
			config: BASE_CONFIG,
		});

		expect(result.outbounds[0]?.kind).toBe("text");
	});

	it("texto 'help' → help action", () => {
		const result = handleInbound({
			participant: completedParticipant,
			message: textMsg("help"),
			config: BASE_CONFIG,
		});

		expect(result.outbounds[0]?.kind).toBe("text");
	});

	it("texto '?' → help action", () => {
		const result = handleInbound({
			participant: completedParticipant,
			message: textMsg("?"),
			config: BASE_CONFIG,
		});

		expect(result.outbounds[0]?.kind).toBe("text");
	});

	it("qualquer outro texto → alreadyParticipated", () => {
		const result = handleInbound({
			participant: completedParticipant,
			message: textMsg("oi tudo bem?"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch).toBeNull();
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
// describe: DECLINED
// ---------------------------------------------------------------------------

describe("handleInbound — state=DECLINED", () => {
	it("qualquer mensagem → reset para AWAITING_CONSENT + reoffer interactive", () => {
		const result = handleInbound({
			participant: makeParticipant({
				state: "DECLINED",
				declinedAt: new Date("2026-01-01T12:00:00Z"),
				retryCount: 1,
			}),
			message: textMsg("oi"),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("AWAITING_CONSENT");
		expect(result.participantPatch?.declinedAt).toBeNull();
		expect(result.participantPatch?.retryCount).toBe(0);
		expect(result.outbounds).toHaveLength(1);
		expect(result.outbounds[0]?.kind).toBe("interactive");
	});

	it("mensagem não-texto também aciona reoffer", () => {
		const result = handleInbound({
			participant: makeParticipant({ state: "DECLINED" }),
			message: unknownMsg(),
			config: BASE_CONFIG,
		});

		expect(result.participantPatch?.state).toBe("AWAITING_CONSENT");
		expect(result.outbounds[0]?.kind).toBe("interactive");
	});
});
