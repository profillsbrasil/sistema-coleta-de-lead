import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verifica se o header de assinatura do WhatsApp Cloud API é válido.
 *
 * Formato esperado: `sha256=<hex>`.
 * Retorna `false` em qualquer condição de falha sem vazar timing information.
 */
export function verifySignature(
	rawBody: string,
	signatureHeader: string | null,
	appSecret: string,
): boolean {
	if (!signatureHeader) return false;

	const PREFIX = 'sha256=';
	if (!signatureHeader.startsWith(PREFIX)) return false;

	const receivedHex = signatureHeader.slice(PREFIX.length);
	if (receivedHex.length === 0) return false;

	const expectedHex = createHmac('sha256', appSecret)
		.update(rawBody, 'utf8')
		.digest('hex');

	// timingSafeEqual exige buffers de mesmo tamanho — retorna false se diferir
	if (receivedHex.length !== expectedHex.length) return false;

	const receivedBuf = Buffer.from(receivedHex, 'hex');
	const expectedBuf = Buffer.from(expectedHex, 'hex');

	// Segundo nível de tamanho: buffers hex-decodificados devem ser iguais em length
	if (receivedBuf.length !== expectedBuf.length) return false;

	return timingSafeEqual(receivedBuf, expectedBuf);
}
