"use client";

import { Button } from "@dashboard-leads-profills/ui/components/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LEADS_NEW_HREF = "/leads/new" as unknown as "/";

export const VISIBLE_ROUTES = ["/leads", "/dashboard"];

const KEYBOARD_THRESHOLD = 0.75;

export function isKeyboardOpen(
	viewport: VisualViewport | undefined | null,
	innerHeight: number
): boolean {
	if (!viewport) {
		return false;
	}
	return viewport.height < innerHeight * KEYBOARD_THRESHOLD;
}

export function isRouteVisible(pathname: string): boolean {
	return VISIBLE_ROUTES.some((route) => pathname === route);
}

export function useKeyboardVisible(): boolean {
	const [keyboardVisible, setKeyboardVisible] = useState(false);

	useEffect(() => {
		const viewport = window.visualViewport;
		if (!viewport) {
			return;
		}

		function handleResize() {
			if (!viewport) {
				return;
			}
			setKeyboardVisible(isKeyboardOpen(viewport, window.innerHeight));
		}

		viewport.addEventListener("resize", handleResize);
		return () => viewport.removeEventListener("resize", handleResize);
	}, []);

	return keyboardVisible;
}

export default function FAB() {
	const pathname = usePathname();
	const keyboardVisible = useKeyboardVisible();

	const visible = isRouteVisible(pathname) && !keyboardVisible;

	if (!visible) {
		return null;
	}

	return (
		<Link className="hidden md:block" href={LEADS_NEW_HREF}>
			<Button
				aria-label="Adicionar novo lead"
				className="fixed right-6 bottom-6 z-50 h-14 w-14 rounded-full shadow-lg"
				size="icon-lg"
			>
				<Plus className="size-6" />
			</Button>
		</Link>
	);
}
