"use client";

import { Button } from "@dashboard-leads-profills/ui/components/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@dashboard-leads-profills/ui/components/empty";
import { Skeleton } from "@dashboard-leads-profills/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import LeadForm from "@/components/lead-form";
import type { Lead } from "@/lib/db/types";
import type { LeadFormData } from "@/lib/lead/validation";
import { trpc } from "@/utils/trpc";

interface AdminLeadEditProps {
	leadId: string;
}

function mapServerLeadToLocal(serverLead: Record<string, unknown>): Lead {
	return {
		localId: serverLead.localId as string,
		userId: serverLead.userId as string,
		name: serverLead.name as string,
		phone: (serverLead.phone as string | null) ?? null,
		email: (serverLead.email as string | null) ?? null,
		company: (serverLead.company as string | null) ?? null,
		position: (serverLead.position as string | null) ?? null,
		segment: (serverLead.segment as string | null) ?? null,
		notes: (serverLead.notes as string | null) ?? null,
		interestTag: serverLead.interestTag as "quente" | "morno" | "frio",
		photo: null,
		createdAt: new Date(serverLead.createdAt as string).toISOString(),
		updatedAt: new Date(serverLead.updatedAt as string).toISOString(),
		deletedAt: serverLead.deletedAt
			? new Date(serverLead.deletedAt as string).toISOString()
			: null,
		serverId: serverLead.id ? Number(serverLead.id) : null,
		syncStatus: "synced",
	};
}

export default function AdminLeadEdit({ leadId }: AdminLeadEditProps) {
	const router = useRouter();

	const leadQuery = useQuery(trpc.admin.leads.getById.queryOptions({ leadId }));

	const updateMutation = useMutation(
		trpc.admin.leads.update.mutationOptions({
			onSuccess: () => {
				toast.success("Lead atualizado!");
				router.push("/admin/leads" as unknown as "/");
			},
			onError: () => {
				toast.error("Erro ao atualizar lead.");
			},
		})
	);

	const deleteMutation = useMutation(
		trpc.admin.leads.delete.mutationOptions({
			onSuccess: () => {
				toast.success("Lead excluido!");
				router.push("/admin/leads" as unknown as "/");
			},
			onError: () => {
				toast.error("Erro ao excluir lead.");
			},
		})
	);

	async function handleUpdate(data: LeadFormData) {
		await updateMutation.mutateAsync({
			localId: leadId,
			data: {
				name: data.name,
				phone: data.phone ?? null,
				email: data.email ?? null,
				company: data.company ?? null,
				position: data.position ?? null,
				segment: data.segment ?? null,
				notes: data.notes ?? null,
				interestTag: data.interestTag,
			},
		});
	}

	async function handleDelete() {
		await deleteMutation.mutateAsync({ localId: leadId });
	}

	if (leadQuery.isLoading) {
		return (
			<div className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 py-8">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	if (leadQuery.isError || !leadQuery.data) {
		return (
			<div className="flex flex-col gap-6">
				<Empty>
					<EmptyHeader>
						<EmptyTitle>Lead nao encontrado</EmptyTitle>
						<EmptyDescription>
							O lead solicitado nao existe ou foi excluido.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
				<Button
					onClick={() => router.push("/admin/leads" as unknown as "/")}
					variant="outline"
				>
					<ArrowLeft className="size-4" />
					Voltar para leads
				</Button>
			</div>
		);
	}

	const mappedLead = mapServerLeadToLocal(
		leadQuery.data as unknown as Record<string, unknown>
	);

	return (
		<LeadForm
			hidePhoto
			hideQR
			lead={mappedLead}
			onDelete={handleDelete}
			onUpdate={handleUpdate}
		/>
	);
}
