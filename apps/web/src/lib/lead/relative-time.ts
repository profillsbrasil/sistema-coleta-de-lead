const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function relativeTime(isoDate: string): string {
	const diff = Date.now() - new Date(isoDate).getTime();

	if (diff < MINUTE) {
		return "agora";
	}
	if (diff < HOUR) {
		return `ha ${Math.floor(diff / MINUTE)} min`;
	}
	if (diff < DAY) {
		return `ha ${Math.floor(diff / HOUR)}h`;
	}
	return `ha ${Math.floor(diff / DAY)}d`;
}
