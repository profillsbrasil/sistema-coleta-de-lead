"use client";

import { Button } from "@dashboard-leads-profills/ui/components/button";
import { Input } from "@dashboard-leads-profills/ui/components/input";
import { Label } from "@dashboard-leads-profills/ui/components/label";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";

export function DsrForm() {
	const [waId, setWaId] = useState("");
	const [reason, setReason] = useState("");
	const [confirm, setConfirm] = useState(false);

	const deleteMutation = useMutation(
		trpc.whatsapp.dsrDelete.mutationOptions({
			onSuccess: (res) => {
				toast.success(
					`Participant ${res.deletedParticipantId} apagado. Snapshot registrado em dsr_audit.`
				);
				setWaId("");
				setReason("");
				setConfirm(false);
			},
			onError: (err) => toast.error(`Falha: ${err.message}`),
		})
	);

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!confirm) {
			toast.error("Confirme a exclusão no checkbox.");
			return;
		}
		deleteMutation.mutate({ waId: waId.trim(), reason: reason.trim(), confirm: true });
	}

	return (
		<form className="flex flex-col gap-6 px-4" onSubmit={handleSubmit}>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="waId">WhatsApp ID (com DDI/DDD, só dígitos)</Label>
				<Input
					id="waId"
					placeholder="5511999998888"
					value={waId}
					onChange={(e) => setWaId(e.target.value)}
					autoComplete="off"
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label htmlFor="reason">Motivo da exclusão (auditoria)</Label>
				<Input
					id="reason"
					placeholder="Solicitação por e-mail em 2026-05-25"
					value={reason}
					onChange={(e) => setReason(e.target.value)}
				/>
				<p className="text-muted-foreground text-xs">
					Vai pro registro de dsr_audit junto com seu user id, o snapshot do
					participant e o timestamp.
				</p>
			</div>

			<label className="flex items-start gap-2 text-sm">
				<input
					type="checkbox"
					checked={confirm}
					onChange={(e) => setConfirm(e.target.checked)}
					className="mt-0.5"
				/>
				<span>
					Confirmo a exclusão permanente. Vai apagar participant, todas as
					mensagens e o rate-limit. <strong>Não há undo.</strong>
				</span>
			</label>

			<div className="flex items-center justify-end gap-3">
				<Button
					disabled={
						deleteMutation.isPending ||
						!confirm ||
						waId.trim() === "" ||
						reason.trim().length < 3
					}
					type="submit"
					variant="destructive"
				>
					{deleteMutation.isPending ? "Apagando…" : "Apagar dados"}
				</Button>
			</div>
		</form>
	);
}
