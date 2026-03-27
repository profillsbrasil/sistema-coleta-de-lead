"use client";

import { Skeleton } from "@dashboard-leads-profills/ui/components/skeleton";
import { useLiveQuery } from "dexie-react-hooks";
import { Loader2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import FAB from "@/components/fab";
import LeadCard from "@/components/lead-card";
import TagFilter from "@/components/tag-filter";
import { type FilterTag, queryLeads } from "@/lib/lead/queries";

const PAGE_SIZE = 20;
const LEADS_NEW_HREF = "/leads/new" as unknown as "/";

interface LeadListProps {
	userId: string;
}

export default function LeadList({ userId }: LeadListProps) {
	const router = useRouter();
	const [activeTag, setActiveTag] = useState<FilterTag>("todos");
	const [limit, setLimit] = useState(PAGE_SIZE);
	const sentinelRef = useRef<HTMLDivElement>(null);

	const leads = useLiveQuery(
		() => queryLeads(userId, activeTag, limit),
		[userId, activeTag, limit]
	);

	const hasMore = leads !== undefined && leads.length === limit;

	const loadMore = useCallback(() => {
		setLimit((prev) => prev + PAGE_SIZE);
	}, []);

	useEffect(() => {
		setLimit(PAGE_SIZE);
	}, [activeTag]);

	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!sentinel) {
			return;
		}

		// IntersectionObserver uses root: null (viewport) because document body is the scroll container.
		// The layout does NOT have overflow-auto on any intermediate wrapper, so no nested scroll container exists.
		// If future layout changes add overflow to an ancestor, set root to the scrollable ancestor element.
		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (entry?.isIntersecting && hasMore) {
					loadMore();
				}
			},
			{ rootMargin: "200px" }
		);

		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [hasMore, loadMore]);

	return (
		<div className="flex flex-col px-4 py-8">
			<div className="mx-auto w-full max-w-[480px]">
				<div className="flex items-center justify-between">
					<h1 className="font-semibold text-xl">Meus Leads</h1>
					{leads === undefined ? null : (
						<span aria-live="polite" className="text-muted-foreground text-sm">
							{leads.length} leads
						</span>
					)}
				</div>

				<div className="mt-4">
					<TagFilter onChange={setActiveTag} value={activeTag} />
				</div>

				{leads === undefined ? (
					<div aria-busy="true" className="mt-6 flex flex-col gap-4">
						<Skeleton className="h-[72px] w-full rounded-lg" />
						<Skeleton className="h-[72px] w-full rounded-lg" />
						<Skeleton className="h-[72px] w-full rounded-lg" />
					</div>
				) : leads.length === 0 ? (
					activeTag === "todos" ? (
						<div className="mt-16 flex flex-col items-center gap-4 text-center">
							<Users className="size-12 text-muted-foreground" />
							<h2 className="font-semibold text-lg">Nenhum lead ainda</h2>
							<p className="text-muted-foreground text-sm">
								Comece coletando seu primeiro lead no evento.
							</p>
							<Link
								className="font-medium text-primary text-sm underline-offset-4 hover:underline"
								href={LEADS_NEW_HREF}
							>
								Novo Lead
							</Link>
						</div>
					) : (
						<p className="mt-16 text-center text-muted-foreground text-sm">
							Nenhum lead {activeTag} encontrado
						</p>
					)
				) : (
					<div aria-label="Lista de leads" className="mt-6 flex flex-col gap-4">
						{leads.map((lead) => (
							<LeadCard
								key={lead.localId}
								lead={lead}
								onClick={() =>
									router.push(`/leads/${lead.localId}` as unknown as "/")
								}
							/>
						))}

						{hasMore ? (
							<div className="flex justify-center py-4">
								<Loader2 className="size-6 animate-spin text-muted-foreground" />
							</div>
						) : null}

						<div className="h-px" ref={sentinelRef} />
					</div>
				)}
			</div>

			<FAB />
		</div>
	);
}
