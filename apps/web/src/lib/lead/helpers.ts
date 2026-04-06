export function emptyToNull(value: string | undefined): string | null {
	return !value || value === "" ? null : value;
}
