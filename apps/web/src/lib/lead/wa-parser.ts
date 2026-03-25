const WA_ME_REGEX = /(?:https?:\/\/)?wa\.me\/\+?(\d{10,15})/i;

export function parseWhatsAppUrl(text: string): string | null {
	const match = text.match(WA_ME_REGEX);
	if (!match?.[1]) {
		return null;
	}

	return `+${match[1]}`;
}
