"use client";

import { Badge } from "@dashboard-leads-profills/ui/components/badge";
import {
	Button,
	buttonVariants,
} from "@dashboard-leads-profills/ui/components/button";
import { Input } from "@dashboard-leads-profills/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@dashboard-leads-profills/ui/components/select";
import { Skeleton } from "@dashboard-leads-profills/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@dashboard-leads-profills/ui/components/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Search } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { StatCard } from "@/components/stat-card";
import { trpc } from "@/utils/trpc";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ParticipantState =
	| "COMPLETED"
	| "DECLINED"
	| "AWAITING_CONSENT"
	| "AWAITING_NAME"
	| "AWAITING_COMPANY"
	| "NEW"
	| "NON_PARTICIPANT";

interface Participant {
	company: string | null;
	consentAt: Date | string | null;
	createdAt: Date | string;
	declinedAt: Date | string | null;
	id: string;
	name: string | null;
	raffleCode: string | null;
	state: string;
	termsVersion: string | null;
	waId: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 50;

const STATE_OPTIONS: { value: ParticipantState | "ALL"; label: string }[] = [
	{ value: "ALL", label: "Todos os estados" },
	{ value: "COMPLETED", label: "Completos" },
	{ value: "DECLINED", label: "Recusas" },
	{ value: "NON_PARTICIPANT", label: "Não-participantes (redirect)" },
	{ value: "AWAITING_CONSENT", label: "Aguardando consentimento" },
	{ value: "AWAITING_NAME", label: "Aguardando nome" },
	{ value: "AWAITING_COMPANY", label: "Aguardando empresa" },
	{ value: "NEW", label: "Novo" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeWaId(waId: string): string {
	return waId.replace(/\D/g, "");
}

function whatsappHref(waId: string): string {
	return `https://wa.me/${normalizeWaId(waId)}`;
}

function isValidWhatsAppId(waId: string): boolean {
	return /^\d{8,15}$/.test(normalizeWaId(waId));
}

function formatDateTime(date: Date | string | null | undefined): string {
	if (!date) {
		return "-";
	}
	const d = new Date(date);
	const day = String(d.getDate()).padStart(2, "0");
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const year = d.getFullYear();
	const hours = String(d.getHours()).padStart(2, "0");
	const mins = String(d.getMinutes()).padStart(2, "0");
	return `${day}/${month}/${year} ${hours}:${mins}`;
}

function stateBadgeVariant(
	state: string
): "default" | "secondary" | "destructive" | "outline" {
	switch (state) {
		case "COMPLETED":
			return "default";
		case "DECLINED":
			return "destructive";
		default:
			return "outline";
	}
}

function stateLabel(state: string): string {
	switch (state) {
		case "COMPLETED":
			return "Completo";
		case "DECLINED":
			return "Recusado";
		case "NON_PARTICIPANT":
			return "Não-participante";
		case "AWAITING_CONSENT":
			return "Aguard. consentimento";
		case "AWAITING_NAME":
			return "Aguard. nome";
		case "AWAITING_COMPANY":
			return "Aguard. empresa";
		case "NEW":
			return "Novo";
		default:
			return state;
	}
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function ParticipantsTableSkeleton() {
	return (
		<div className="flex flex-col gap-2">
			{Array.from({ length: 5 }, (_, i) => (
				<Skeleton className="h-10 w-full" key={`skeleton-${String(i)}`} />
			))}
		</div>
	);
}

function ParticipantRow({ participant }: { participant: Participant }) {
	const canContact = participant.waId ? isValidWhatsAppId(participant.waId) : false;

	return (
		<TableRow key={participant.id}>
			<TableCell>
				<Badge variant={stateBadgeVariant(participant.state)}>
					{stateLabel(participant.state)}
				</Badge>
			</TableCell>
			<TableCell className="font-mono text-xs">
				{participant.raffleCode ?? "-"}
			</TableCell>
			<TableCell className="font-medium">{participant.name ?? "-"}</TableCell>
			<TableCell>{participant.company ?? "-"}</TableCell>
			<TableCell className="font-mono text-xs">
				{participant.waId ?? "-"}
			</TableCell>
			<TableCell className="text-sm">
				{formatDateTime(participant.createdAt)}
			</TableCell>
			<TableCell className="text-sm">
				{participant.termsVersion ?? "-"}
			</TableCell>
			<TableCell className="text-right">
				{canContact && participant.waId ? (
					<a
						className={buttonVariants({ size: "sm", variant: "outline" })}
						href={whatsappHref(participant.waId)}
						rel="noreferrer"
						target="_blank"
					>
						Contato
					</a>
				) : (
					"-"
				)}
			</TableCell>
		</TableRow>
	);
}

// ---------------------------------------------------------------------------
// Stats row sub-component
// ---------------------------------------------------------------------------

function StatsRow({
	data,
	isLoading,
}: {
	data?: {
		completed: number;
		declined: number;
		inProgress: number;
		nonParticipant: number;
		total: number;
	};
	isLoading: boolean;
}) {
	if (isLoading) {
		return (
			<>
				{Array.from({ length: 5 }, (_, i) => (
					<Skeleton
						className="h-20 w-full"
						key={`stat-skeleton-${String(i)}`}
					/>
				))}
			</>
		);
	}
	return (
		<>
			<StatCard label="Total" value={data?.total ?? 0} />
			<StatCard label="Completos" value={data?.completed ?? 0} />
			<StatCard label="Recusas" value={data?.declined ?? 0} />
			<StatCard label="Em andamento" value={data?.inProgress ?? 0} />
			<StatCard
				label="Não-participantes (redirect)"
				value={data?.nonParticipant ?? 0}
			/>
		</>
	);
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

export function SorteioClient() {
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [stateFilter, setStateFilter] = useState<ParticipantState | "ALL">(
		"COMPLETED"
	);
	const [page, setPage] = useState(1);
	const [isExporting, setIsExporting] = useState(false);
	const isExportingRef = useRef(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const queryClient = useQueryClient();

	// --- Queries ---

	const statsQuery = useQuery(trpc.whatsapp.stats.queryOptions());

	const listQuery = useQuery(
		trpc.whatsapp.list.queryOptions({
			state:
				stateFilter === "ALL" ? undefined : (stateFilter as ParticipantState),
			search: debouncedSearch || undefined,
			limit: PAGE_SIZE,
			offset: (page - 1) * PAGE_SIZE,
		})
	);

	// --- Handlers ---

	function handleSearchChange(value: string) {
		setSearch(value);
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}
		debounceRef.current = setTimeout(() => {
			setDebouncedSearch(value);
			setPage(1);
		}, 300);
	}

	function handleStateChange(value: string | null) {
		if (value) {
			setStateFilter(value as ParticipantState | "ALL");
			setPage(1);
		}
	}

	async function handleExport() {
		if (isExportingRef.current) {
			return;
		}
		isExportingRef.current = true;
		setIsExporting(true);

		try {
			const result = await queryClient.fetchQuery(
				trpc.whatsapp.exportCsv.queryOptions()
			);

			const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = result.filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			toast.success("CSV exportado com sucesso.");
		} catch {
			toast.error("Erro ao exportar CSV.");
		} finally {
			isExportingRef.current = false;
			setIsExporting(false);
		}
	}

	// --- Pagination ---

	const total = listQuery.data?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const offset = (page - 1) * PAGE_SIZE;
	const rangeStart = total > 0 ? offset + 1 : 0;
	const rangeEnd = Math.min(offset + PAGE_SIZE, total);

	// --- Render ---

	return (
		<div className="flex flex-col gap-8 px-4">
			{/* Stats row */}
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
				<StatsRow data={statsQuery.data} isLoading={statsQuery.isLoading} />
			</div>

			{/* Participants section */}
			<div className="flex flex-col gap-4">
				{/* Filters + export */}
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
						<div className="relative">
							<Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								aria-label="Buscar participantes"
								className="pl-9 sm:w-64"
								onChange={(e) => handleSearchChange(e.target.value)}
								placeholder="Buscar por nome, empresa ou código"
								value={search}
							/>
						</div>
						<Select onValueChange={handleStateChange} value={stateFilter}>
							<SelectTrigger
								aria-label="Filtrar por estado"
								className="w-full sm:w-56"
							>
								<SelectValue placeholder="Todos os estados">
									{(value) =>
										STATE_OPTIONS.find((o) => o.value === value)?.label ??
										"Todos os estados"
									}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{STATE_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<Button
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
						{isExporting ? "Exportando..." : "Exportar CSV"}
					</Button>
				</div>

				{/* Range info */}
				{total > 0 && (
					<p className="text-muted-foreground text-sm">
						Mostrando {rangeStart}–{rangeEnd} de {total}
					</p>
				)}

				{/* Table */}
				{listQuery.isLoading && <ParticipantsTableSkeleton />}

				{listQuery.isError && (
					<p className="text-destructive text-sm">
						Erro ao carregar participantes. Tente novamente.
					</p>
				)}

				{listQuery.isSuccess && (listQuery.data?.items ?? []).length === 0 && (
					<p className="text-muted-foreground text-sm">
						Nenhum participante encontrado.
					</p>
				)}

				{listQuery.isSuccess && (listQuery.data?.items ?? []).length > 0 && (
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Estado</TableHead>
									<TableHead>Código</TableHead>
									<TableHead>Nome</TableHead>
									<TableHead>Empresa</TableHead>
									<TableHead>WhatsApp</TableHead>
									<TableHead>Inscrição</TableHead>
									<TableHead>Termos</TableHead>
									<TableHead className="text-right">Ação</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{listQuery.data.items.map((participant) => (
									<ParticipantRow
										key={participant.id}
										participant={participant}
									/>
								))}
							</TableBody>
						</Table>
					</div>
				)}

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="flex items-center justify-center gap-2 pt-2">
						<Button
							disabled={page <= 1}
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							size="sm"
							type="button"
							variant="outline"
						>
							Anterior
						</Button>
						<span className="text-muted-foreground text-sm">
							{page} / {totalPages}
						</span>
						<Button
							disabled={page >= totalPages}
							onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
							size="sm"
							type="button"
							variant="outline"
						>
							Próximo
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
