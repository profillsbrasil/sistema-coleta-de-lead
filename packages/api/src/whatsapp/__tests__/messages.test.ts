import { describe, expect, it } from "vitest";
import {
	TASK_STEP_BUTTON_IDS,
	taskNudge,
	taskPost,
	taskStep,
	taskStepConfirm,
	tasksIntro,
} from "../messages";

describe("tasksIntro", () => {
	it("inclui o nome do participante em negrito", () => {
		const msg = tasksIntro({ name: "Othavio" });
		expect(msg.type).toBe("text");
		expect(msg.body).toContain("*Othavio*");
	});

	it("menciona 4 ações e o Instagram", () => {
		const msg = tasksIntro({ name: "Maria" });
		expect(msg.body).toContain("4 ações");
		expect(msg.body).toContain("Instagram");
	});

	it("não usa terminologia 'Passo 1/2/3'", () => {
		const msg = tasksIntro({ name: "Maria" });
		expect(msg.body).not.toMatch(/Passo \d/);
	});
});

describe("taskStep", () => {
	it("gera CTA URL com o link do perfil", () => {
		const msg = taskStep({
			index: 1,
			intro: "Para começar, siga a *Profills Brasil*.",
			profileUrl: "https://instagram.com/profillsdobrasil",
		});
		expect(msg.type).toBe("interactive");
		expect(msg.interactive.type).toBe("cta_url");
		if (msg.interactive.type !== "cta_url") return;
		expect(msg.interactive.action.parameters.url).toBe(
			"https://instagram.com/profillsdobrasil"
		);
		expect(msg.interactive.action.parameters.display_text).toBe(
			"Abrir Instagram"
		);
	});

	it("inclui indicador (n/4) no body", () => {
		const msg = taskStep({
			index: 2,
			intro: "Agora siga o *Anderson*.",
			profileUrl: "https://instagram.com/x",
		});
		if (msg.interactive.type !== "cta_url") return;
		expect(msg.interactive.body.text).toContain("*2/4*");
		expect(msg.interactive.body.text).toContain("Agora siga o *Anderson*.");
	});

	it("aceita os 3 índices válidos", () => {
		for (const index of [1, 2, 3] as const) {
			const msg = taskStep({
				index,
				intro: "x",
				profileUrl: "https://instagram.com/x",
			});
			if (msg.interactive.type !== "cta_url") continue;
			expect(msg.interactive.body.text).toContain(`*${index}/4*`);
		}
	});
});

describe("taskPost", () => {
	it("usa CTA com display 'Abrir post oficial' e a URL do post", () => {
		const msg = taskPost({ postUrl: "https://instagram.com/p/ABC" });
		expect(msg.type).toBe("interactive");
		if (msg.interactive.type !== "cta_url") return;
		expect(msg.interactive.action.parameters.display_text).toBe(
			"Abrir post oficial"
		);
		expect(msg.interactive.action.parameters.url).toBe(
			"https://instagram.com/p/ABC"
		);
	});

	it("é o passo 4/4 e menciona curtir + comentar marcando 2 amigos", () => {
		const msg = taskPost({ postUrl: "https://x" });
		if (msg.interactive.type !== "cta_url") return;
		const body = msg.interactive.body.text;
		expect(body).toContain("*4/4*");
		expect(body).toContain("Curta o post");
		expect(body).toContain("*2 amigos*");
	});
});

describe("taskStepConfirm", () => {
	it.each([
		["follow_1", "task_done_1", "✓ Segui"],
		["follow_2", "task_done_2", "✓ Segui"],
		["follow_3", "task_done_3", "✓ Segui"],
		["post", "task_done_post", "✓ Pronto"],
	] as const)("step %s → id %s, title %s", (step, expectedId, expectedTitle) => {
		const msg = taskStepConfirm({ step });
		expect(msg.type).toBe("interactive");
		if (msg.interactive.type !== "button") return;
		expect(msg.interactive.action.buttons).toHaveLength(1);
		const btn = msg.interactive.action.buttons[0]!;
		expect(btn.reply.id).toBe(expectedId);
		expect(btn.reply.title).toBe(expectedTitle);
		expect(TASK_STEP_BUTTON_IDS[step]).toBe(expectedId);
	});

	it("título dos botões cabe em 20 caracteres (limite WhatsApp)", () => {
		for (const step of ["follow_1", "follow_2", "follow_3", "post"] as const) {
			const msg = taskStepConfirm({ step });
			if (msg.interactive.type !== "button") continue;
			const title = msg.interactive.action.buttons[0]!.reply.title;
			expect(title.length).toBeLessThanOrEqual(20);
		}
	});
});

describe("taskNudge", () => {
	it("é mensagem de texto curta sem CTA URL", () => {
		const msg = taskNudge();
		expect(msg.type).toBe("text");
		expect(msg.body).toContain("Toque no botão");
		expect(msg.body.length).toBeLessThan(80);
	});
});
