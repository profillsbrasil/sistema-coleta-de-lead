"use client";

import { Button } from "@dashboard-leads-profills/ui/components/button";
import { Input } from "@dashboard-leads-profills/ui/components/input";
import { Skeleton } from "@dashboard-leads-profills/ui/components/skeleton";
import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { Download, Loader2, Plus, Search, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import LeadCard from "@/components/lead-card";
import { EmptyState } from "@/components/page/empty-state";
import { PageHeader } from "@/components/page/page-header";
import TagFilter from "@/components/tag-filter";
import type { Lead } from "@/lib/db/types";
import { buildExportFilename, exportLeadsCsv } from "@/lib/lead/export-csv";
import { queryLeadExportScope } from "@/lib/lead/export-scope";
import { type FilterTag, queryLeads } from "@/lib/lead/queries";

const PAGE_SIZE = 20;
const LEADS_NEW_HREF = "/leads/new";
const SELLER_FILTER_LABELS: Record<FilterTag, string> = {
	todos: "Todos",
	quente: "Quente",
	morno: "Morno",
	frio: "Frio",
};

interface LeadListProps {
	userId: string;
}

function LeadsEmpty({
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
			<EmptyState
				description={`Nenhum lead encontrado para "${searchTerm.trim()}".`}
				title="Sem resultados"
			/>
		);
	}

	if (activeTag !== "todos") {
		return (
			<EmptyState
				description={`Nenhum lead ${activeTag} ainda. Continue coletando — vai aparecer aqui.`}
				title={`Sem leads ${activeTag}`}
			/>
		);
	}

	return (
		<EmptyState
			cta={{
				href: LEADS_NEW_HREF,
				icon: Plus,
				label: "Novo lead",
			}}
			description="Pode coletar leads mesmo sem internet — eles sincronizam quando voltar online."
			icon={Users}
			title="Sem leads ainda"
		/>
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
		<ul className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
				<div
					aria-busy="true"
					className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
				>
					<Skeleton className="h-[72px] w-full rounded-lg" />
					<Skeleton className="h-[72px] w-full rounded-lg" />
					<Skeleton className="h-[72px] w-full rounded-lg" />
					<Skeleton className="hidden h-[72px] w-full rounded-lg sm:block" />
					<Skeleton className="hidden h-[72px] w-full rounded-lg sm:block" />
					<Skeleton className="hidden h-[72px] w-full rounded-lg lg:block" />
				</div>
			);
		}

		if (filteredLeads.length === 0) {
			return (
				<LeadsEmpty
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

	const totalLeads = leads?.length ?? 0;
	const filteredCount = filteredLeads?.length ?? 0;

	function buildCountLabel(): string {
		if (isFiltered) {
			const noun = totalLeads === 1 ? "lead" : "leads";
			return `de ${totalLeads} ${noun}`;
		}
		return filteredCount === 1 ? "lead" : "leads";
	}

	const subtitle =
		filteredLeads === undefined ? null : (
			<span aria-live="polite">
				<span className="text-foreground">{filteredCount}</span>{" "}
				<span className="text-muted-foreground">{buildCountLabel()}</span>
			</span>
		);

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-6">
			<PageHeader
				eyebrow="Você"
				subtitle={subtitle}
				title="Meus leads"
				trailing={
					leads !== undefined && leads.length > 0 ? (
						<Button
							aria-label="Exportar leads como CSV"
							className="rounded-full"
							disabled={isExporting}
							onClick={() => {
								handleExport().catch(() => {
									// erros tratados em handleExport
								});
							}}
							size="sm"
							type="button"
							variant="outline"
						>
							<Download className="size-4" />
							Exportar
						</Button>
					) : null
				}
			/>

			<div className="flex flex-col gap-3 px-4">
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
						<Button
							aria-label="Limpar busca"
							className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
							onClick={() => setSearchTerm("")}
							size="icon-sm"
							type="button"
							variant="ghost"
						>
							<X className="size-4" />
						</Button>
					)}
				</div>

				<TagFilter onChange={setActiveTag} value={activeTag} />
			</div>

			<div className="px-4">{renderContent()}</div>
		</div>
	);
}
