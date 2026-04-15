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
	EmptyMedia,
	EmptyTitle,
} from "@dashboard-leads-profills/ui/components/empty";
import { Input } from "@dashboard-leads-profills/ui/components/input";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Ban,
	CheckCircle,
	MoreVertical,
	Pencil,
	Search,
	Shield,
	Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { trpc } from "@/utils/trpc";
import { AdminUserCard } from "./admin-user-card";

const PER_PAGE = 20;

type UserAction = { id: string; name: string } | null;

interface UserRow {
	email: string;
	id: string;
	isBanned: boolean;
	leadCount: number;
	name: string;
	role: string;
}

export default function UsersPanel() {
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [page, setPage] = useState(1);
	const [editingUserId, setEditingUserId] = useState<string | null>(null);
	const [deactivatingUser, setDeactivatingUser] = useState<UserAction>(null);
	const [reactivatingUser, setReactivatingUser] = useState<UserAction>(null);
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const queryClient = useQueryClient();

	useEffect(() => {
		const supabase = createClient();
		supabase.auth
			.getUser()
			.then(({ data }) => setCurrentUserId(data.user?.id ?? null));
	}, []);

	useEffect(() => {
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}
		debounceRef.current = setTimeout(() => {
			setDebouncedSearch(search);
			setPage(1);
		}, 300);
		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
		};
	}, [search]);

	const usersQuery = useQuery(
		trpc.admin.users.list.queryOptions({
			search: debouncedSearch || undefined,
			page,
			perPage: PER_PAGE,
		})
	);

	const updateRoleMutation = useMutation(
		trpc.admin.users.updateRole.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: trpc.admin.users.list.queryKey(),
				});
				toast.success("Role atualizado com sucesso");
			},
			onError: (error) => {
				toast.error(error.message);
			},
		})
	);

	const deactivateMutation = useMutation(
		trpc.admin.users.deactivate.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: trpc.admin.users.list.queryKey(),
				});
				toast.success("Usuario desativado com sucesso");
				setDeactivatingUser(null);
			},
			onError: (error) => {
				toast.error(error.message);
				setDeactivatingUser(null);
			},
		})
	);

	const reactivateMutation = useMutation(
		trpc.admin.users.reactivate.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: trpc.admin.users.list.queryKey(),
				});
				toast.success("Usuario reativado com sucesso");
				setReactivatingUser(null);
			},
			onError: (error) => {
				toast.error(error.message);
				setReactivatingUser(null);
			},
		})
	);

	const total = usersQuery.data?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
	const start = (page - 1) * PER_PAGE + 1;
	const end = Math.min(page * PER_PAGE, total);

	return (
		<div>
			<h1 className="mb-6 font-semibold text-xl">Gerenciar Usuarios</h1>

			<div className="relative mb-4">
				<Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					className="pl-9"
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Buscar por nome ou email"
					value={search}
				/>
			</div>

			{total > 0 && (
				<p className="mb-2 text-right text-muted-foreground text-sm">
					Mostrando {start}-{end} de {total}
				</p>
			)}

			<UsersContent
				currentUserId={currentUserId}
				debouncedSearch={debouncedSearch}
				editingUserId={editingUserId}
				onDeactivate={setDeactivatingUser}
				onEditRole={setEditingUserId}
				onReactivate={setReactivatingUser}
				onRoleChange={(userId, role) => {
					updateRoleMutation.mutate({
						userId,
						role: role as "admin" | "vendedor",
					});
				}}
				page={page}
				setPage={setPage}
				totalPages={totalPages}
				usersQuery={usersQuery}
			/>

			<DeactivateDialog
				isPending={deactivateMutation.isPending}
				onConfirm={() => {
					if (deactivatingUser) {
						deactivateMutation.mutate({ userId: deactivatingUser.id });
					}
				}}
				onOpenChange={(open) => {
					if (!open) {
						setDeactivatingUser(null);
					}
				}}
				open={deactivatingUser !== null}
				userName={deactivatingUser?.name}
			/>

			<ReactivateDialog
				isPending={reactivateMutation.isPending}
				onConfirm={() => {
					if (reactivatingUser) {
						reactivateMutation.mutate({ userId: reactivatingUser.id });
					}
				}}
				onOpenChange={(open) => {
					if (!open) {
						setReactivatingUser(null);
					}
				}}
				open={reactivatingUser !== null}
				userName={reactivatingUser?.name}
			/>
		</div>
	);
}

function UsersContent({
	usersQuery,
	debouncedSearch,
	editingUserId,
	currentUserId,
	onEditRole,
	onRoleChange,
	onDeactivate,
	onReactivate,
	page,
	setPage,
	totalPages,
}: {
	usersQuery: {
		isLoading: boolean;
		isError: boolean;
		data?: { users: UserRow[]; total: number };
	};
	debouncedSearch: string;
	editingUserId: string | null;
	currentUserId: string | null;
	onEditRole: (userId: string | null) => void;
	onRoleChange: (userId: string, role: string) => void;
	onDeactivate: (user: { id: string; name: string }) => void;
	onReactivate: (user: { id: string; name: string }) => void;
	page: number;
	setPage: (page: number | ((p: number) => number)) => void;
	totalPages: number;
}) {
	if (usersQuery.isLoading) {
		return <UsersTableSkeleton />;
	}

	if (usersQuery.isError) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Users />
					</EmptyMedia>
					<EmptyTitle>Erro ao carregar usuarios</EmptyTitle>
					<EmptyDescription>
						Nao foi possivel carregar a lista de usuarios. Tente novamente.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	const users = usersQuery.data?.users ?? [];

	if (users.length === 0) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Users />
					</EmptyMedia>
					<EmptyTitle>Nenhum usuario encontrado</EmptyTitle>
					<EmptyDescription>
						{debouncedSearch
							? "Nenhum usuario corresponde a busca. Tente outro termo."
							: "Nenhum usuario cadastrado no sistema."}
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<>
			{/* Mobile: card list */}
			<div className="flex flex-col gap-4 md:hidden">
				{users.map((user) => (
					<AdminUserCard
						currentUserId={currentUserId}
						isEditing={editingUserId === user.id}
						key={user.id}
						onCancelEdit={() => onEditRole(null)}
						onDeactivate={onDeactivate}
						onEditRole={(userId) => onEditRole(userId)}
						onReactivate={onReactivate}
						onRoleChange={onRoleChange}
						user={user}
					/>
				))}
			</div>

			{/* Desktop: table */}
			<div className="hidden md:block">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Nome</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Role</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Leads</TableHead>
							<TableHead className="text-right">Acoes</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{users.map((user) => (
							<UserRow
								currentUserId={currentUserId}
								editingUserId={editingUserId}
								key={user.id}
								onDeactivate={onDeactivate}
								onEditRole={onEditRole}
								onReactivate={onReactivate}
								onRoleChange={onRoleChange}
								user={user}
							/>
						))}
					</TableBody>
				</Table>
			</div>

			{totalPages > 1 && (
				<UsersPagination
					page={page}
					setPage={setPage}
					totalPages={totalPages}
				/>
			)}
		</>
	);
}

function UserRow({
	user,
	editingUserId,
	currentUserId,
	onEditRole,
	onRoleChange,
	onDeactivate,
	onReactivate,
}: {
	user: UserRow;
	editingUserId: string | null;
	currentUserId: string | null;
	onEditRole: (userId: string | null) => void;
	onRoleChange: (userId: string, role: string) => void;
	onDeactivate: (user: { id: string; name: string }) => void;
	onReactivate: (user: { id: string; name: string }) => void;
}) {
	const isEditing = editingUserId === user.id;
	const showDeactivate = !user.isBanned && user.id !== currentUserId;
	const displayName = user.name || user.email;

	return (
		<TableRow>
			<TableCell className="font-medium">{user.name || "-"}</TableCell>
			<TableCell>{user.email}</TableCell>
			<TableCell>
				{isEditing ? (
					<Select
						defaultValue={user.role}
						onValueChange={(value: string | null) => {
							if (value) {
								onRoleChange(user.id, value);
							}
							onEditRole(null);
						}}
					>
						<SelectTrigger className="w-[120px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="admin">Admin</SelectItem>
							<SelectItem value="vendedor">Vendedor</SelectItem>
						</SelectContent>
					</Select>
				) : (
					<RoleBadge role={user.role} />
				)}
			</TableCell>
			<TableCell>
				<StatusBadge isBanned={user.isBanned} />
			</TableCell>
			<TableCell>{user.leadCount}</TableCell>
			<TableCell className="text-right">
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								aria-label="Abrir menu de acoes"
								size="icon-lg"
								type="button"
								variant="ghost"
							/>
						}
					>
						<MoreVertical className="size-4" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem
							onClick={() => onEditRole(isEditing ? null : user.id)}
						>
							<Pencil className="size-4" />
							Editar role
						</DropdownMenuItem>
						{showDeactivate && (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onClick={() =>
										onDeactivate({ id: user.id, name: displayName })
									}
									variant="destructive"
								>
									<Ban className="size-4" />
									Desativar usuario
								</DropdownMenuItem>
							</>
						)}
						{user.isBanned && (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onClick={() =>
										onReactivate({ id: user.id, name: displayName })
									}
								>
									<CheckCircle className="size-4" />
									Reativar usuario
								</DropdownMenuItem>
							</>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</TableCell>
		</TableRow>
	);
}

function UsersPagination({
	page,
	setPage,
	totalPages,
}: {
	page: number;
	setPage: (page: number | ((p: number) => number)) => void;
	totalPages: number;
}) {
	return (
		<div className="mt-4">
			<Pagination>
				<PaginationContent>
					<PaginationItem>
						<PaginationPrevious
							aria-disabled={page <= 1}
							className={
								page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
							}
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							text="Anterior"
						/>
					</PaginationItem>
					{Array.from({ length: totalPages }, (_, i) => i + 1).map(
						(pageNum) => (
							<PaginationItem key={pageNum}>
								<PaginationLink
									className="cursor-pointer"
									isActive={pageNum === page}
									onClick={() => setPage(pageNum)}
								>
									{pageNum}
								</PaginationLink>
							</PaginationItem>
						)
					)}
					<PaginationItem>
						<PaginationNext
							aria-disabled={page >= totalPages}
							className={
								page >= totalPages
									? "pointer-events-none opacity-50"
									: "cursor-pointer"
							}
							onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
							text="Proximo"
						/>
					</PaginationItem>
				</PaginationContent>
			</Pagination>
		</div>
	);
}

function DeactivateDialog({
	open,
	onOpenChange,
	userName,
	isPending,
	onConfirm,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	userName?: string;
	isPending: boolean;
	onConfirm: () => void;
}) {
	return (
		<AlertDialog onOpenChange={onOpenChange} open={open}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Desativar Usuario</AlertDialogTitle>
					<AlertDialogDescription>
						O usuario <strong>{userName}</strong> perdera acesso ao sistema
						imediatamente. Deseja continuar?
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<AlertDialogAction
						disabled={isPending}
						onClick={onConfirm}
						variant="destructive"
					>
						{isPending ? "Desativando..." : "Desativar"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

function ReactivateDialog({
	open,
	onOpenChange,
	userName,
	isPending,
	onConfirm,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	userName?: string;
	isPending: boolean;
	onConfirm: () => void;
}) {
	return (
		<AlertDialog onOpenChange={onOpenChange} open={open}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Reativar Usuario</AlertDialogTitle>
					<AlertDialogDescription>
						O usuario <strong>{userName}</strong> voltara a ter acesso ao
						sistema. Confirmar?
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<AlertDialogAction disabled={isPending} onClick={onConfirm}>
						{isPending ? "Reativando..." : "Reativar"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

function RoleBadge({ role }: { role: string }) {
	if (role === "admin") {
		return (
			<Badge variant="default">
				<Shield className="size-3" />
				Admin
			</Badge>
		);
	}
	return <Badge variant="secondary">Vendedor</Badge>;
}

function StatusBadge({ isBanned }: { isBanned: boolean }) {
	if (isBanned) {
		return <Badge variant="destructive">Desativado</Badge>;
	}
	return (
		<Badge className="bg-primary/10 text-primary">
			Ativo
		</Badge>
	);
}

function UsersTableSkeleton() {
	return (
		<>
			{/* Mobile skeleton */}
			<div className="flex flex-col gap-4 md:hidden">
				{Array.from({ length: 5 }, (_, i) => (
					<Skeleton
						className="h-[72px] w-full rounded-lg"
						key={`skeleton-mobile-${String(i)}`}
					/>
				))}
			</div>
			{/* Desktop skeleton */}
			<div className="hidden md:block">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Nome</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Role</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Leads</TableHead>
							<TableHead className="text-right">Acoes</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{Array.from({ length: 5 }, (_, i) => (
							<TableRow key={`skeleton-${i.toString()}`}>
								<TableCell>
									<Skeleton className="h-4 w-24" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-4 w-36" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-5 w-16" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-5 w-14" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-4 w-8" />
								</TableCell>
								<TableCell>
									<Skeleton className="ml-auto h-6 w-16" />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</>
	);
}
