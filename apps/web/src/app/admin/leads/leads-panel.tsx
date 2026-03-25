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
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@dashboard-leads-profills/ui/components/empty";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@dashboard-leads-profills/ui/components/pagination";
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
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@dashboard-leads-profills/ui/components/tooltip";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { StatCard } from "@/components/stat-card";
import { trpc } from "@/utils/trpc";

const PAGE_SIZE = 20;

const TAG_COLORS: Record<string, string> = {
	quente: "oklch(0.45 0.18 17)",
	morno: "oklch(0.5 0.13 85)",
	frio: "oklch(0.45 0.15 240)",
};

const TAG_LABELS: Record<string, string> = {
	quente: "Quente",
	morno: "Morno",
	frio: "Frio",
};

function formatDate(dateStr: string | Date): string {
	const date = new Date(dateStr);
	const day = String(date.getDate()).padStart(2, "0");
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const year = date.getFullYear();
	return `${day}/${month}/${year}`;
}

export default function LeadsPanel() {
	const [selectedVendor, setSelectedVendor] = useState<string>("");
	const [page, setPage] = useState(1);
	const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);

	const queryClient = useQueryClient();

	const vendorsQuery = useQuery(trpc.admin.leads.listVendors.queryOptions());

	const leadsQuery = useQuery(
		trpc.admin.leads.listByUser.queryOptions(
			{
				userId: selectedVendor ?? "",
				limit: PAGE_SIZE,
				offset: (page - 1) * PAGE_SIZE,
			},
			{ enabled: !!selectedVendor }
		)
	);

	const statsQuery = useQuery(
		trpc.admin.stats.getGlobalStats.queryOptions(
			{ userId: selectedVendor ?? undefined },
			{ enabled: !!selectedVendor }
		)
	);

	const deleteMutation = useMutation(
		trpc.admin.leads.delete.mutationOptions({
			onSuccess: () => {
				toast.success("Lead excluido!");
				queryClient.invalidateQueries();
				setDeletingLeadId(null);
			},
			onError: () => {
				toast.error("Erro ao excluir lead.");
			},
		})
	);

	function handleVendorChange(value: string | null) {
		if (value) {
			setSelectedVendor(value);
			setPage(1);
		}
	}

	function handleDelete() {
		if (!deletingLeadId) {
			return;
		}
		deleteMutation.mutate({ localId: deletingLeadId });
	}

	const total = leadsQuery.data?.total ?? 0;
	const leads = leadsQuery.data?.leads ?? [];
	const totalPages = Math.ceil(total / PAGE_SIZE);
	const offset = (page - 1) * PAGE_SIZE;
	const rangeStart = total > 0 ? offset + 1 : 0;
	const rangeEnd = Math.min(offset + PAGE_SIZE, total);

	return (
		<div className="flex flex-col gap-6">
			<h1 className="font-semibold text-xl">Leads por Vendedor</h1>

			<Select
				onValueChange={handleVendorChange}
				value={selectedVendor}
			>
				<SelectTrigger className="w-full max-w-sm">
					<SelectValue placeholder="Selecionar vendedor" />
				</SelectTrigger>
				<SelectContent>
					{vendorsQuery.data?.map((vendor) => (
						<SelectItem key={vendor.userId} value={vendor.userId}>
							{vendor.name ?? vendor.userId.slice(0, 8)}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{!selectedVendor && (
				<Empty>
					<EmptyHeader>
						<EmptyTitle>Nenhum vendedor selecionado</EmptyTitle>
						<EmptyDescription>
							Selecione um vendedor no seletor acima para visualizar seus leads.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)}

			{selectedVendor && statsQuery.data && (
				<div className="grid grid-cols-3 gap-4">
					<StatCard label="Total de Leads" value={statsQuery.data.total} />
					<StatCard label="Score" value={statsQuery.data.score} />
					<StatCard label="Leads Hoje" value={statsQuery.data.today} />
				</div>
			)}

			{selectedVendor && leadsQuery.isLoading && (
				<div className="flex flex-col gap-2">
					{Array.from({ length: 5 }, (_, i) => (
						<Skeleton className="h-12 w-full" key={`skeleton-${String(i)}`} />
					))}
				</div>
			)}

			{selectedVendor && leadsQuery.isError && (
				<Empty>
					<EmptyHeader>
						<EmptyTitle>Erro ao carregar dados</EmptyTitle>
						<EmptyDescription>
							Verifique sua conexao e tente novamente.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)}

			{selectedVendor && leadsQuery.isSuccess && leads.length === 0 && (
				<Empty>
					<EmptyHeader>
						<EmptyTitle>Nenhum lead encontrado</EmptyTitle>
						<EmptyDescription>
							Este vendedor ainda nao coletou nenhum lead.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)}

			{selectedVendor && leadsQuery.isSuccess && leads.length > 0 && (
				<>
					<p className="text-right text-muted-foreground text-sm">
						Mostrando {rangeStart}-{rangeEnd} de {total}
					</p>

					<TooltipProvider>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Nome</TableHead>
									<TableHead>Telefone/Email</TableHead>
									<TableHead>Tag</TableHead>
									<TableHead>Segmento</TableHead>
									<TableHead>Criado em</TableHead>
									<TableHead className="text-right">Acoes</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{leads.map((lead) => (
									<TableRow key={lead.localId}>
										<TableCell className="font-medium">{lead.name}</TableCell>
										<TableCell>{lead.phone ?? lead.email ?? "-"}</TableCell>
										<TableCell>
											<Badge
												className="text-white"
												style={{
													backgroundColor:
														TAG_COLORS[lead.interestTag] ?? TAG_COLORS.morno,
												}}
											>
												{TAG_LABELS[lead.interestTag] ?? lead.interestTag}
											</Badge>
										</TableCell>
										<TableCell>{lead.segment ?? "-"}</TableCell>
										<TableCell>{formatDate(lead.createdAt)}</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-1">
												<Tooltip>
													<TooltipTrigger
														render={
															<Link
																aria-label="Editar lead"
																className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-sm outline-none hover:bg-muted"
																href={
																	`/admin/leads/${lead.localId}` as unknown as "/"
																}
															>
																<Pencil className="size-4" />
															</Link>
														}
													/>
													<TooltipContent>Editar</TooltipContent>
												</Tooltip>
												<Tooltip>
													<TooltipTrigger
														render={
															<button
																aria-label="Excluir lead"
																className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-sm outline-none hover:bg-muted"
																onClick={() => setDeletingLeadId(lead.localId)}
																type="button"
															>
																<Trash2 className="size-4 text-destructive" />
															</button>
														}
													/>
													<TooltipContent>Excluir</TooltipContent>
												</Tooltip>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TooltipProvider>

					{totalPages > 1 && (
						<Pagination>
							<PaginationContent>
								<PaginationItem>
									<PaginationPrevious
										aria-disabled={page <= 1}
										className={
											page <= 1 ? "pointer-events-none opacity-50" : ""
										}
										href="#"
										onClick={(e) => {
											e.preventDefault();
											if (page > 1) {
												setPage(page - 1);
											}
										}}
									/>
								</PaginationItem>
								{Array.from({ length: totalPages }, (_, i) => i + 1)
									.filter((p) => {
										if (totalPages <= 7) {
											return true;
										}
										if (p === 1 || p === totalPages) {
											return true;
										}
										return Math.abs(p - page) <= 1;
									})
									.map((p) => (
										<PaginationItem key={p}>
											<PaginationLink
												href="#"
												isActive={p === page}
												onClick={(e) => {
													e.preventDefault();
													setPage(p);
												}}
											>
												{p}
											</PaginationLink>
										</PaginationItem>
									))}
								<PaginationItem>
									<PaginationNext
										aria-disabled={page >= totalPages}
										className={
											page >= totalPages ? "pointer-events-none opacity-50" : ""
										}
										href="#"
										onClick={(e) => {
											e.preventDefault();
											if (page < totalPages) {
												setPage(page + 1);
											}
										}}
									/>
								</PaginationItem>
							</PaginationContent>
						</Pagination>
					)}
				</>
			)}

			<AlertDialog
				onOpenChange={(open) => {
					if (!open) {
						setDeletingLeadId(null);
					}
				}}
				open={!!deletingLeadId}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir Lead</AlertDialogTitle>
						<AlertDialogDescription>
							Tem certeza que deseja excluir este lead? Essa acao nao pode ser
							desfeita.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-white hover:bg-destructive/90"
							disabled={deleteMutation.isPending}
							onClick={handleDelete}
						>
							Excluir
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
