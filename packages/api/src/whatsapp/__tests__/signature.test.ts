import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifySignature } from '../signature';

const SECRET = 'test-app-secret-profills-2026';
const BODY = '{"object":"whatsapp_business_account"}';

function makeSignature(body: string, secret: string): string {
	const hex = createHmac('sha256', secret).update(body, 'utf8').digest('hex');
	return `sha256=${hex}`;
}

describe('verifySignature', () => {
	it('retorna true para assinatura válida', () => {
		const sig = makeSignature(BODY, SECRET);
		expect(verifySignature(BODY, sig, SECRET)).toBe(true);
	});

	it('retorna false quando o corpo foi adulterado', () => {
		const sig = makeSignature(BODY, SECRET);
		const tamperedBody = BODY + ' ';
		expect(verifySignature(tamperedBody, sig, SECRET)).toBe(false);
	});

	it('retorna false quando o segredo é diferente', () => {
		const sig = makeSignature(BODY, 'outro-segredo');
		expect(verifySignature(BODY, sig, SECRET)).toBe(false);
	});

	it('retorna false quando o header é null', () => {
		expect(verifySignature(BODY, null, SECRET)).toBe(false);
	});

	it('retorna false quando o header não tem prefixo sha256=', () => {
		const hex = createHmac('sha256', SECRET).update(BODY, 'utf8').digest('hex');
		expect(verifySignature(BODY, hex, SECRET)).toBe(false);
		expect(verifySignature(BODY, `md5=${hex}`, SECRET)).toBe(false);
	});

	it('retorna false quando o hex tem comprimento diferente do esperado', () => {
		// HMAC-SHA256 produz 64 hex chars — truncar deve falhar
		const sig = makeSignature(BODY, SECRET);
		const truncated = `sha256=${sig.slice('sha256='.length, -4)}`;
		expect(verifySignature(BODY, truncated, SECRET)).toBe(false);
	});

	it('retorna false quando o hex depois do prefixo é vazio', () => {
		expect(verifySignature(BODY, 'sha256=', SECRET)).toBe(false);
	});
});
