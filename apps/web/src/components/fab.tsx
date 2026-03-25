"use client";

import { Button } from "@dashboard-leads-profills/ui/components/button";
import { Plus } from "lucide-react";
import Link from "next/link";

const LEADS_NEW_HREF = "/leads/new" as unknown as "/";

export default function FAB() {
	return (
		<Link href={LEADS_NEW_HREF}>
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
