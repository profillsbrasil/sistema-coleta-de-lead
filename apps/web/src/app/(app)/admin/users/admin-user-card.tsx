"use client";

import { Badge } from "@dashboard-leads-profills/ui/components/badge";
import { Card } from "@dashboard-leads-profills/ui/components/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@dashboard-leads-profills/ui/components/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@dashboard-leads-profills/ui/components/select";
import { Ban, CheckCircle, MoreVertical, Pencil, Shield } from "lucide-react";

interface AdminUserCardProps {
	currentUserId: string | null;
	isEditing: boolean;
	onCancelEdit: () => void;
	onDeactivate: (user: { id: string; name: string }) => void;
	onEditRole: (userId: string) => void;
	onReactivate: (user: { id: string; name: string }) => void;
	onRoleChange: (userId: string, role: string) => void;
	user: {
		id: string;
		name: string;
		email: string;
		role: string;
		isBanned: boolean;
		leadCount: number;
	};
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

export function AdminUserCard({
	user,
	currentUserId,
	isEditing,
	onEditRole,
	onRoleChange,
	onCancelEdit,
	onDeactivate,
	onReactivate,
}: AdminUserCardProps) {
	const showDeactivate = !user.isBanned && user.id !== currentUserId;
	const displayName = user.name || user.email;

	return (
		<Card className="p-4">
			<div className="flex items-start justify-between gap-2">
				<div className="flex min-w-0 flex-col gap-1">
					<div className="flex items-center gap-2">
						<span className="truncate font-semibold text-sm">
							{displayName}
						</span>
						{isEditing ? (
							<Select
								defaultValue={user.role}
								onValueChange={(value: string | null) => {
									if (value) {
										onRoleChange(user.id, value);
									}
									onCancelEdit();
								}}
							>
								<SelectTrigger className="h-8 w-[120px]">
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
					</div>
					<div className="flex items-center gap-2">
						<span className="text-muted-foreground text-sm">
							{user.leadCount} leads
						</span>
						<StatusBadge isBanned={user.isBanned} />
					</div>
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<button
								aria-label="Abrir menu de acoes"
								className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg hover:bg-muted"
								type="button"
							/>
						}
					>
						<MoreVertical className="size-4" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => onEditRole(user.id)}>
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
			</div>
		</Card>
	);
}
