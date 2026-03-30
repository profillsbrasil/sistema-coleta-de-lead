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
	Button,
	buttonVariants,
} from "@dashboard-leads-profills/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@dashboard-leads-profills/ui/components/dropdown-menu";
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
import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Download,
	MessageCircle,
	MoreVertical,
	Pencil,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { StatCard } from "@/components/stat-card";
import { buildExportFilename, exportLeadsCsv } from "@/lib/lead/export-csv";
import { formatPhone, unmaskPhone } from "@/lib/masks/phone";
import { trpc } from "@/utils/trpc";
import { AdminLeadCard } from "./admin-lead-card";

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
	const [isExporting, setIsExporting] = useState(false);
	const isExportingRef = useRef(false);

	const queryClient = useQueryClient();
	const adminLeadFilters = selectedVendor ? { userId: selectedVendor } : null;
	const paginatedLeadFilters = adminLeadFilters
		? {
				...adminLeadFilters,
				limit: PAGE_SIZE,
				offset: (page - 1) * PAGE_SIZE,
			}
		: {
				userId: "00000000-0000-0000-0000-000000000000",
				limit: PAGE_SIZE,
				offset: (page - 1) * PAGE_SIZE,
			};

	const vendorsQuery = useQuery(trpc.admin.leads.listVendors.queryOptions());

	const leadsQuery = useQuery(
		trpc.admin.leads.listByUser.queryOptions(paginatedLeadFilters, {
			enabled: adminLeadFilters !== null,
		})
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

	async function handleExport() {
		if (!adminLeadFilters || isExportingRef.current) {
			return;
		}

		isExportingRef.current = true;
		setIsExporting(true);

		try {
			const result = await queryClient.fetchQuery(
				trpc.admin.leads.exportByFilters.queryOptions(adminLeadFilters)
			);

			const filename = buildExportFilename({
				scope: "admin",
				scopeLabel: selectedVendorName,
				date: new Date(),
			});

			exportLeadsCsv(result.leads, filename);
			toast.success(`Exportados ${result.total} leads de ${selectedVendorName}`);
		} finally {
			isExportingRef.current = false;
			setIsExporting(false);
		}
	}

	const total = leadsQuery.data?.total ?? 0;
	const leads = leadsQuery.data?.leads ?? [];
	const totalPages = Math.ceil(total / PAGE_SIZE);
	const offset = (page - 1) * PAGE_SIZE;
	const rangeStart = total > 0 ? offset + 1 : 0;
	const rangeEnd = Math.min(offset + PAGE_SIZE, total);
	const selectedVendorName =
		vendorsQuery.data?.find((v) => v.userId === selectedVendor)?.name ??
		selectedVendor?.slice(0, 8) ??
		"";

	return (
		<div className="flex flex-col gap-6">
			<h1 className="font-semibold text-xl">Leads por Vendedor</h1>

			<Select onValueChange={handleVendorChange} value={selectedVendor}>
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
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
					<div className="flex items-center justify-between">
						<Button
							aria-label="Exportar leads como CSV"
							disabled={adminLeadFilters === null || isExporting}
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
						<p className="text-muted-foreground text-sm">
							Mostrando {rangeStart}-{rangeEnd} de {total}
						</p>
					</div>

					{/* Mobile: card list */}
					<div className="flex flex-col gap-4 md:hidden">
						{leads.map((lead) => (
							<AdminLeadCard
								key={lead.localId}
								lead={lead}
								onDelete={(localId) => setDeletingLeadId(localId)}
								vendorName={selectedVendorName}
							/>
						))}
					</div>

					{/* Desktop: table */}
					<div className="hidden md:block">
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
										<TableCell>
											<span className="flex items-center gap-1">
												{lead.phone
													? formatPhone(lead.phone)
													: (lead.email ?? "-")}
												{lead.phone ? (
													<a
														aria-label="Abrir conversa no WhatsApp"
														className={cn(
															buttonVariants({
																variant: "ghost",
																size: "icon-sm",
															})
														)}
														href={`https://wa.me/55${unmaskPhone(lead.phone)}`}
														rel="noopener noreferrer"
														target="_blank"
													>
														<MessageCircle className="size-4" />
													</a>
												) : null}
											</span>
										</TableCell>
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
											<DropdownMenu>
												<DropdownMenuTrigger
													render={
														<button
															aria-label="Abrir menu de acoes"
															className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg hover:bg-muted"
															type="button"
														/>
													}
												>
													<MoreVertical className="size-4" />
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem
														render={
															<Link
																href={
																	`/admin/leads/${lead.localId}` as unknown as "/"
																}
															/>
														}
													>
														<Pencil className="size-4" />
														Editar lead
													</DropdownMenuItem>
													<DropdownMenuSeparator />
													<DropdownMenuItem
														onClick={() => setDeletingLeadId(lead.localId)}
														variant="destructive"
													>
														<Trash2 className="size-4" />
														Excluir lead
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

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
