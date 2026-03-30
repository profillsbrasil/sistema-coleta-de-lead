/**
 * Phone mask utilities for Brazilian phone numbers.
 *
 * Supports:
 * - Celular: (XX) XXXXX-XXXX (11 digits)
 * - Fixo:    (XX) XXXX-XXXX  (10 digits)
 *
 * All functions strip non-digit characters first,
 * so letters and symbols are never preserved.
 */

/** Strip everything that is not a digit. */
export function unmaskPhone(value: string): string {
	return value.replace(/\D/g, "");
}

/**
 * Format a digit-only string into a Brazilian phone display.
 * Returns the raw digits if the length doesn't match 10 or 11.
 */
export function formatPhone(value: string): string {
	const digits = unmaskPhone(value);

	if (digits.length === 11) {
		return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
	}

	if (digits.length === 10) {
		return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
	}

	return digits;
}

/**
 * Live input mask — strips non-digits, caps at 11, and formats progressively.
 * Use this as the onChange handler value transformer.
 */
export function maskPhoneInput(value: string): string {
	const digits = unmaskPhone(value).slice(0, 11);

	if (digits.length === 0) {
		return "";
	}
	if (digits.length <= 2) {
		return `(${digits}`;
	}
	if (digits.length <= 6) {
		return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
	}
	if (digits.length <= 10) {
		return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
	}

	return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
