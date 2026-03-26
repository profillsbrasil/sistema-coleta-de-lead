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
import { Skeleton } from "@dashboard-leads-profills/ui/components/skeleton";
import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import LeadForm from "@/components/lead-form";
import { db } from "@/lib/db";
import { deleteLead } from "@/lib/lead/delete-lead";

const LEADS_HREF = "/leads" as unknown as "/";

interface LeadDetailProps {
	localId: string;
	userId: string;
}

export default function LeadDetail({ localId, userId }: LeadDetailProps) {
	const router = useRouter();
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [notFound, setNotFound] = useState(false);

	const lead = useLiveQuery(() => db.leads.get(localId), [localId]);

	useEffect(() => {
		if (lead === null || (lead !== undefined && lead.userId !== userId)) {
			toast.error("Lead nao encontrado.");
			setNotFound(true);
		}
	}, [lead, userId]);

	useEffect(() => {
		if (notFound) {
			router.push(LEADS_HREF);
		}
	}, [notFound, router]);

	async function handleDelete() {
		await deleteLead(localId);
		toast.success("Lead excluido!");
		router.push(LEADS_HREF);
	}

	if (lead === undefined || notFound) {
		return (
			<div className="flex flex-col px-4 py-8">
				<div className="mx-auto w-full max-w-[480px]">
					<Skeleton className="mb-6 h-10 w-48" />
					<Skeleton className="mb-4 h-12 w-full" />
					<Skeleton className="mb-4 h-12 w-full" />
					<Skeleton className="mb-4 h-12 w-full" />
					<Skeleton className="h-12 w-full" />
				</div>
			</div>
		);
	}

	return (
		<>
			<LeadForm lead={lead} onDelete={() => setShowDeleteDialog(true)} />

			<AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir lead?</AlertDialogTitle>
						<AlertDialogDescription>
							O lead sera removido da sua lista. Esta acao sera sincronizada
							quando voce estiver online.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction onClick={handleDelete} variant="destructive">
							Excluir
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
