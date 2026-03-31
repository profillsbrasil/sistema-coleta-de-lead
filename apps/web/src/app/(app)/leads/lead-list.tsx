"use client";

import { Button } from "@dashboard-leads-profills/ui/components/button";
import { Input } from "@dashboard-leads-profills/ui/components/input";
import { Skeleton } from "@dashboard-leads-profills/ui/components/skeleton";
import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { Download, Loader2, Search, Users, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import FAB from "@/components/fab";
import LeadCard from "@/components/lead-card";
import TagFilter from "@/components/tag-filter";
import type { Lead } from "@/lib/db/types";
import { buildExportFilename, exportLeadsCsv } from "@/lib/lead/export-csv";
import { queryLeadExportScope } from "@/lib/lead/export-scope";
import { type FilterTag, queryLeads } from "@/lib/lead/queries";

const PAGE_SIZE = 20;
const LEADS_NEW_HREF = "/leads/new" as unknown as "/";
const SELLER_FILTER_LABELS: Record<FilterTag, string> = {
	todos: "Todos",
	quente: "Quente",
	morno: "Morno",
	frio: "Frio",
};

interface LeadListProps {
	userId: string;
}

function EmptyState({
	activeTag,
	isFiltered,
	searchTerm,
}: {
	activeTag: FilterTag;
	isFiltered: boolean;
	searchTerm: string;
}) {
	if (isFiltered) {
		return (
			<p className="py-8 text-center text-muted-foreground text-sm">
				Nenhum lead encontrado para &ldquo;{searchTerm.trim()}&rdquo;
			</p>
		);
	}

	if (activeTag !== "todos") {
		return (
			<p className="py-8 text-center text-muted-foreground text-sm">
				Nenhum lead {activeTag} encontrado
			</p>
		);
	}

	return (
		<div className="flex flex-col items-center gap-4 py-8 text-center">
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
	);
}

function LeadResults({
	hasMore,
	isFiltered,
	leads,
	onNavigate,
	sentinelRef,
}: {
	hasMore: boolean;
	isFiltered: boolean;
	leads: Lead[];
	onNavigate: (localId: string) => void;
	sentinelRef: React.RefObject<HTMLLIElement | null>;
}) {
	return (
		<ul className="flex list-none flex-col gap-4">
			{leads.map((lead) => (
				<li key={lead.localId}>
					<LeadCard lead={lead} onClick={() => onNavigate(lead.localId)} />
				</li>
			))}

			{hasMore && !isFiltered ? (
				<li className="flex justify-center py-4">
					<Loader2 className="size-6 animate-spin text-muted-foreground" />
				</li>
			) : null}

			<li className="h-px" ref={sentinelRef} />
		</ul>
	);
}

export default function LeadList({ userId }: LeadListProps) {
	const router = useRouter();
	const [activeTag, setActiveTag] = useState<FilterTag>("todos");
	const [searchTerm, setSearchTerm] = useState("");
	const [limit, setLimit] = useState(PAGE_SIZE);
	const [isExporting, setIsExporting] = useState(false);
	const isExportingRef = useRef(false);
	const sentinelRef = useRef<HTMLLIElement>(null);

	const leads = useLiveQuery(
		() => queryLeads(userId, activeTag, limit),
		[userId, activeTag, limit]
	);

	const filteredLeads = useMemo(() => {
		if (leads === undefined) {
			return undefined;
		}

		const term = searchTerm.trim().toLowerCase();
		if (term === "") {
			return leads;
		}

		return leads.filter((lead) => {
			const name = lead.name.toLowerCase();
			const company = (lead.company ?? "").toLowerCase();
			const email = (lead.email ?? "").toLowerCase();
			return (
				name.includes(term) || company.includes(term) || email.includes(term)
			);
		});
	}, [leads, searchTerm]);

	const hasMore = leads !== undefined && leads.length === limit;
	const isFiltered = searchTerm.trim() !== "";

	const loadMore = useCallback(() => {
		setLimit((prev) => prev + PAGE_SIZE);
	}, []);

	const handleNavigate = useCallback(
		(localId: string) => {
			router.push(`/leads/${localId}` as unknown as "/");
		},
		[router]
	);

	const handleExport = useCallback(async () => {
		if (isExportingRef.current) {
			return;
		}

		isExportingRef.current = true;
		setIsExporting(true);

		try {
			const result = await queryLeadExportScope({
				userId,
				tag: activeTag,
				searchTerm,
			});

			const isSearching = searchTerm.trim() !== "";
			const scopeLabel = isSearching ? "busca" : activeTag;
			const scopeMessageLabel = SELLER_FILTER_LABELS[activeTag];
			const filename = buildExportFilename({
				scope: "seller",
				scopeLabel,
				date: new Date(),
			});

			exportLeadsCsv(result.leads, filename);

			if (isSearching) {
				toast.success(`Exportados ${result.total} leads da busca`);
				return;
			}

			toast.success(
				`Exportados ${result.total} leads do filtro ${scopeMessageLabel}`
			);
		} finally {
			isExportingRef.current = false;
			setIsExporting(false);
		}
	}, [activeTag, searchTerm, userId]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: activeTag is intentionally listed to reset pagination when the filter changes
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

	function renderContent() {
		if (filteredLeads === undefined) {
			return (
				<div aria-busy="true" className="flex flex-col gap-4">
					<Skeleton className="h-[72px] w-full rounded-lg" />
					<Skeleton className="h-[72px] w-full rounded-lg" />
					<Skeleton className="h-[72px] w-full rounded-lg" />
				</div>
			);
		}

		if (filteredLeads.length === 0) {
			return (
				<EmptyState
					activeTag={activeTag}
					isFiltered={isFiltered}
					searchTerm={searchTerm}
				/>
			);
		}

		return (
			<LeadResults
				hasMore={hasMore}
				isFiltered={isFiltered}
				leads={filteredLeads}
				onNavigate={handleNavigate}
				sentinelRef={sentinelRef}
			/>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between">
				<h1 className="font-semibold text-xl">Meus Leads</h1>
				<div className="flex items-center gap-2">
					{leads !== undefined && leads.length > 0 && (
						<Button
							aria-label="Exportar leads como CSV"
							disabled={isExporting}
							onClick={() => {
								void handleExport();
							}}
							size="sm"
							type="button"
							variant="outline"
						>
							<Download className="size-4" />
							Exportar
						</Button>
					)}
					{filteredLeads === undefined ? null : (
						<span aria-live="polite" className="text-muted-foreground text-sm">
							{isFiltered
								? `${filteredLeads.length} de ${leads?.length ?? 0} leads`
								: `${filteredLeads.length} leads`}
						</span>
					)}
				</div>
			</div>

			<div className="flex flex-col gap-3">
				<div className="relative">
					<Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						className={cn("h-10 pl-9", searchTerm !== "" && "pr-9")}
						onChange={(e) => setSearchTerm(e.target.value)}
						placeholder="Buscar por nome, empresa ou email..."
						type="search"
						value={searchTerm}
					/>
					{searchTerm !== "" && (
						<button
							aria-label="Limpar busca"
							className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
							onClick={() => setSearchTerm("")}
							type="button"
						>
							<X className="size-4" />
						</button>
					)}
				</div>

				<TagFilter onChange={setActiveTag} value={activeTag} />
			</div>

			{renderContent()}

			<FAB />
		</div>
	);
}
