"use client";

import { useEffect, useState } from "react";

const EVENT_END = process.env.NEXT_PUBLIC_EVENT_END;

function getTimeLeft(target: Date): number {
	return Math.max(0, target.getTime() - Date.now());
}

function formatTimeLeft(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const days = Math.floor(totalSeconds / 86400);
	const hours = Math.floor((totalSeconds % 86400) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	const pad = (n: number) => String(n).padStart(2, "0");

	if (days > 0) {
		return `${pad(days)}d ${pad(hours)}h ${pad(minutes)}m`;
	}
	return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

export function EventCountdown() {
	const [timeLeft, setTimeLeft] = useState<number | null>(null);

	useEffect(() => {
		if (!EVENT_END) return;

		const target = new Date(EVENT_END);
		if (Number.isNaN(target.getTime())) return;

		const initial = getTimeLeft(target);
		if (initial <= 0) return;

		setTimeLeft(initial);

		const id = setInterval(() => {
			const remaining = getTimeLeft(target);
			if (remaining <= 0) {
				setTimeLeft(null);
				clearInterval(id);
				return;
			}
			setTimeLeft(remaining);
		}, 1000);

		return () => clearInterval(id);
	}, []);

	if (timeLeft === null) return null;

	return (
		<span className="font-mono text-xs text-muted-foreground">
			{formatTimeLeft(timeLeft)}
		</span>
	);
}
