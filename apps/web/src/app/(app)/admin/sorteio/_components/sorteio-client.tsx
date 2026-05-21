"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@dashboard-leads-profills/ui/components/alert-dialog";
import { Badge } from "@dashboard-leads-profills/ui/components/badge";
import { Button } from "@dashboard-leads-profills/ui/components/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@dashboard-leads-profills/ui/components/card";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Download, RefreshCw, Search, Shuffle } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { StatCard } from "@/components/stat-card";
import { trpc } from "@/utils/trpc";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Prize = "tv_65" | "churrasqueira" | "cooler";

type ParticipantState =
	| "COMPLETED"
	| "DECLINED"
	| "AWAITING_CONSENT"
	| "AWAITING_NAME"
	| "AWAITING_COMPANY"
	| "NEW";

interface Participant {
	company: string | null;
	consentAt: string | null;
	createdAt: string;
	declinedAt: string | null;
	id: string;
	name: string | null;
	notifiedAt: string | null;
	raffleCode: string | null;
	state: string;
	termsVersion: string | null;
	waId: string | null;
	winnerAt: string | null;
	winnerOf: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 50;

const PRIZES: {
	key: Prize;
	emoji: string;
	label: string;
	description: string;
}[] = [
	{
		key: "tv_65",
		emoji: "📺",
		label: 'TV 65"',
		description: 'TV LG/Samsung 65"',
	},
	{
		key: "churrasqueira",
		emoji: "🔥",
		label: "Churrasqueira",
		description: "Champions Grill",
	},
	{
		key: "cooler",
		emoji: "🧊",
		label: "Cooler",
		description: "Cooler Profills",
	},
];

const STATE_OPTIONS: { value: ParticipantState | "ALL"; label: string }[] = [
	{ value: "COMPLETED", label: "Completos" },
	{ value: "DECLINED", label: "Recusas" },
	{ value: "AWAITING_CONSENT", label: "Aguardando consentimento" },
	{ value: "AWAITING_NAME", label: "Aguardando nome" },
	{ value: "AWAITING_COMPANY", label: "Aguardando empresa" },
	{ value: "NEW", label: "Novo" },
	{ value: "ALL", label: "Todos" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function maskWaId(waId: string): string {
	if (waId.length <= 8) {
		return waId;
	}
	const first = waId.slice(0, 4);
	const last = waId.slice(-4);
	return `${first}***${last}`;
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

function prizeLabel(prize: string): string {
	switch (prize) {
		case "tv_65":
			return '📺 TV 65"';
		case "churrasqueira":
			return "🔥 Churrasqueira";
		case "cooler":
			return "🧊 Cooler";
		default:
			return prize;
	}
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function PrizeCard({
	prize,
	winner,
	onDraw,
	onNotify,
	onUnmark,
	isDrawing,
	isNotifying,
	isUnmarking,
}: {
	prize: (typeof PRIZES)[number];
	winner: Participant | undefined;
	onDraw: (prize: Prize) => void;
	onNotify: (participant: Participant) => void;
	onUnmark: (participant: Participant) => void;
	isDrawing: boolean;
	isNotifying: boolean;
	isUnmarking: boolean;
}) {
	const [confirmResorteio, setConfirmResorteio] = useState(false);

	const hasWinner = !!winner;
	const isNotified = !!winner?.notifiedAt;

	return (
		<Card className="flex flex-col">
			<CardHeader>
				<div className="flex items-start gap-3">
					<span aria-hidden="true" className="text-4xl leading-none">
						{prize.emoji}
					</span>
					<div className="flex min-w-0 flex-col gap-0.5">
						<CardTitle>{prize.label}</CardTitle>
						<p className="text-muted-foreground text-sm">{prize.description}</p>
					</div>
				</div>
			</CardHeader>

			<CardContent className="flex-1">
				{hasWinner && winner ? (
					<div className="flex flex-col gap-2">
						<p className="font-medium text-foreground text-sm">
							{winner.name ?? "-"}
						</p>
						<p className="text-muted-foreground text-sm">
							{winner.company ?? "-"}
						</p>
						{winner.raffleCode && (
							<p className="font-mono text-muted-foreground text-xs">
								{winner.raffleCode}
							</p>
						)}
						{isNotified && (
							<Badge className="w-fit" variant="secondary">
								Notificado em {formatDateTime(winner.notifiedAt)}
							</Badge>
						)}
					</div>
				) : (
					<p className="text-muted-foreground text-sm">
						Nenhum vencedor sorteado
					</p>
				)}
			</CardContent>

			<CardFooter className="flex flex-col gap-2">
				{!hasWinner && (
					<Button
						className="w-full"
						disabled={isDrawing}
						onClick={() => onDraw(prize.key)}
						type="button"
					>
						<Shuffle className="size-4" />
						{isDrawing ? "Sorteando..." : "Sortear"}
					</Button>
				)}

				{hasWinner && winner && (
					<>
						{!isNotified && (
							<Button
								className="w-full bg-green-600 text-white hover:bg-green-700"
								disabled={isNotifying}
								onClick={() => onNotify(winner)}
								type="button"
							>
								<Bell className="size-4" />
								{isNotifying ? "Notificando..." : "Notificar via WhatsApp"}
							</Button>
						)}

						<Button
							className="w-full"
							disabled={isUnmarking}
							onClick={() => setConfirmResorteio(true)}
							type="button"
							variant="destructive"
						>
							<RefreshCw className="size-4" />
							{isUnmarking ? "Removendo..." : "Re-sortear"}
						</Button>
					</>
				)}
			</CardFooter>

			<AlertDialog
				onOpenChange={(open) => {
					if (!open) {
						setConfirmResorteio(false);
					}
				}}
				open={confirmResorteio}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Re-sortear {prize.label}?</AlertDialogTitle>
						<AlertDialogDescription>
							O vencedor atual <strong>{winner?.name ?? "desconhecido"}</strong>{" "}
							será removido. Um novo sorteio pode ser feito manualmente depois.
							Esta ação não pode ser desfeita.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							disabled={isUnmarking}
							onClick={() => {
								if (winner) {
									onUnmark(winner);
								}
								setConfirmResorteio(false);
							}}
							variant="destructive"
						>
							Confirmar re-sorteio
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Card>
	);
}

function ParticipantsTableSkeleton() {
	return (
		<div className="flex flex-col gap-2">
			{Array.from({ length: 5 }, (_, i) => (
				<Skeleton className="h-10 w-full" key={`skeleton-${String(i)}`} />
			))}
		</div>
	);
}

function ParticipantRow({
	participant,
	isNotifying,
	onNotify,
}: {
	participant: Participant;
	isNotifying: boolean;
	onNotify: (id: string) => void;
}) {
	const canNotify = !!participant.winnerOf && !participant.notifiedAt;

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
				{participant.waId ? maskWaId(participant.waId) : "-"}
			</TableCell>
			<TableCell className="text-sm">
				{formatDateTime(participant.createdAt)}
			</TableCell>
			<TableCell>
				{participant.winnerOf ? (
					<Badge variant="secondary">{prizeLabel(participant.winnerOf)}</Badge>
				) : (
					"-"
				)}
			</TableCell>
			<TableCell className="text-right">
				{canNotify ? (
					<Button
						disabled={isNotifying}
						onClick={() => onNotify(participant.id)}
						size="sm"
						type="button"
						variant="outline"
					>
						<Bell className="size-3" />
						Notificar
					</Button>
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
		total: number;
		winnersCount: number;
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
			<StatCard label="Vencedores" value={data?.winnersCount ?? 0} />
		</>
	);
}

// ---------------------------------------------------------------------------
// Error handlers (outside component to avoid capturing closures)
// ---------------------------------------------------------------------------

function handleDrawError(error: {
	data?: { code?: string } | null;
	message: string;
}) {
	if (error.data?.code === "NOT_FOUND") {
		toast.error("Sem participantes elegíveis ainda.");
	} else if (error.data?.code === "CONFLICT") {
		toast.error("Este prêmio já tem um vencedor. Re-sortear primeiro.");
	} else {
		toast.error(error.message);
	}
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

	// Fetch all winners to populate prize cards
	const winnersQuery = useQuery(
		trpc.whatsapp.list.queryOptions({
			onlyWinners: true,
			limit: 10,
			offset: 0,
		})
	);

	// --- Helpers for prize cards ---

	function getWinnerFor(prize: Prize): Participant | undefined {
		return (winnersQuery.data?.items as Participant[] | undefined)?.find(
			(p) => p.winnerOf === prize
		);
	}

	// --- Mutations ---

	const drawMutation = useMutation(
		trpc.whatsapp.drawRaffle.mutationOptions({
			onSuccess: () => {
				toast.success("Sorteio realizado com sucesso!");
				queryClient.invalidateQueries({
					queryKey: trpc.whatsapp.list.queryKey(),
				});
				queryClient.invalidateQueries({
					queryKey: trpc.whatsapp.stats.queryKey(),
				});
			},
			onError: handleDrawError,
		})
	);

	const notifyMutation = useMutation(
		trpc.whatsapp.notifyWinner.mutationOptions({
			onSuccess: () => {
				toast.success("Vencedor notificado via WhatsApp!");
				queryClient.invalidateQueries({
					queryKey: trpc.whatsapp.list.queryKey(),
				});
			},
			onError: (error, variables) => {
				if (
					error.data?.code === "PRECONDITION_FAILED" &&
					error.message === "OUTSIDE_24H_WINDOW"
				) {
					// Find the participant to get their name and wa_id
					const participant = (
						winnersQuery.data?.items as Participant[] | undefined
					)?.find((p) => p.id === variables.participantId);
					const nome = participant?.name ?? "o vencedor";
					const numero = participant?.waId
						? maskWaId(participant.waId)
						: "número não disponível";
					toast.warning(
						`Janela 24h expirou. Entre em contato manualmente com ${nome} no número ${numero}.`,
						{ duration: 8000 }
					);
				} else {
					toast.error(error.message);
				}
			},
		})
	);

	const unmarkMutation = useMutation(
		trpc.whatsapp.unmarkWinner.mutationOptions({
			onSuccess: () => {
				toast.success("Vencedor removido. Você pode sortear novamente.");
				queryClient.invalidateQueries({
					queryKey: trpc.whatsapp.list.queryKey(),
				});
				queryClient.invalidateQueries({
					queryKey: trpc.whatsapp.stats.queryKey(),
				});
			},
			onError: (error) => {
				toast.error(error.message);
			},
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
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
				<StatsRow data={statsQuery.data} isLoading={statsQuery.isLoading} />
			</div>

			{/* Prize cards */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				{PRIZES.map((prize) => (
					<PrizeCard
						isDrawing={
							drawMutation.isPending &&
							drawMutation.variables?.prize === prize.key
						}
						isNotifying={
							notifyMutation.isPending &&
							notifyMutation.variables?.participantId ===
								getWinnerFor(prize.key)?.id
						}
						isUnmarking={
							unmarkMutation.isPending &&
							unmarkMutation.variables?.participantId ===
								getWinnerFor(prize.key)?.id
						}
						key={prize.key}
						onDraw={(p) => drawMutation.mutate({ prize: p })}
						onNotify={(participant) =>
							notifyMutation.mutate({ participantId: participant.id })
						}
						onUnmark={(participant) =>
							unmarkMutation.mutate({ participantId: participant.id })
						}
						prize={prize}
						winner={getWinnerFor(prize.key)}
					/>
				))}
			</div>

			{/* Participants section */}
			<div className="flex flex-col gap-4">
				{/* Filters + export */}
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
						<div className="relative">
							<Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								className="pl-9 sm:w-64"
								onChange={(e) => handleSearchChange(e.target.value)}
								placeholder="Buscar por nome, empresa ou código"
								value={search}
							/>
						</div>
						<Select onValueChange={handleStateChange} value={stateFilter}>
							<SelectTrigger className="w-full sm:w-56">
								<SelectValue placeholder="Estado" />
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
									<TableHead>WA ID</TableHead>
									<TableHead>Inscrição</TableHead>
									<TableHead>Prêmio</TableHead>
									<TableHead className="text-right">Ação</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{(listQuery.data.items as Participant[]).map((participant) => (
									<ParticipantRow
										isNotifying={
											notifyMutation.isPending &&
											notifyMutation.variables?.participantId === participant.id
										}
										key={participant.id}
										onNotify={(id) =>
											notifyMutation.mutate({ participantId: id })
										}
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
							aria-disabled={page <= 1}
							className={page <= 1 ? "pointer-events-none opacity-50" : ""}
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
							aria-disabled={page >= totalPages}
							className={
								page >= totalPages ? "pointer-events-none opacity-50" : ""
							}
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
