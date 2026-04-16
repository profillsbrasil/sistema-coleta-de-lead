"use client";

import type { Lead } from "@/lib/db/types";
import { saveLead } from "@/lib/lead/save-lead";
import { updateLead } from "@/lib/lead/update-lead";
import { type LeadFormData, leadFormSchema } from "@/lib/lead/validation";
import { formatPhone, maskPhoneInput, unmaskPhone } from "@/lib/masks/phone";
import { Button } from "@dashboard-leads-profills/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard-leads-profills/ui/components/card";
import { Input } from "@dashboard-leads-profills/ui/components/input";
import { Label } from "@dashboard-leads-profills/ui/components/label";
import { Textarea } from "@dashboard-leads-profills/ui/components/textarea";
import { ArrowLeft, Loader2, QrCode } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import PhotoCapture from "./photo-capture";
import QRScanner from "./qr-scanner";
import TagSelector from "./tag-selector";

type InterestTag = "quente" | "morno" | "frio";

interface FormErrors {
	email?: string;
	name?: string;
	phone?: string;
}

interface LeadFormProps {
	hidePhoto?: boolean;
	hideQR?: boolean;
	lead?: Lead;
	onDelete?: () => void;
	onSave?: (data: LeadFormData, photo: Blob | null) => Promise<void>;
	onUpdate?: (
		data: LeadFormData,
		photo: Blob | null | undefined
	) => Promise<void>;
	userId?: string | null;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: form component with many fields requires co-located state and validation logic
export default function LeadForm({
	lead,
	onDelete,
	onSave,
	onUpdate,
	hidePhoto,
	hideQR,
	userId,
}: LeadFormProps) {
	const router = useRouter();
	const isEditMode = !!lead;

	const [name, setName] = useState(lead?.name ?? "");
	const [phone, setPhone] = useState(formatPhone(lead?.phone ?? ""));
	const [email, setEmail] = useState(lead?.email ?? "");
	const [interestTag, setInterestTag] = useState<InterestTag>(
		lead?.interestTag ?? "morno"
	);
	const [company, setCompany] = useState(lead?.company ?? "");
	const [position, setPosition] = useState(lead?.position ?? "");
	const [segment, setSegment] = useState(lead?.segment ?? "");
	const [notes, setNotes] = useState(lead?.notes ?? "");
	const [errors, setErrors] = useState<FormErrors>({});
	const [isSubmitting, setIsSubmitting] = useState(false);

	const [showQRScanner, setShowQRScanner] = useState(false);
	const [photo, setPhoto] = useState<Blob | null>(lead?.photo ?? null);
	const [photoChanged, setPhotoChanged] = useState(false);

	const nameRef = useRef<HTMLInputElement>(null);
	const phoneRef = useRef<HTMLInputElement>(null);
	const emailRef = useRef<HTMLInputElement>(null);

	function focusFirstError(fieldErrors: FormErrors) {
		if (fieldErrors.name) {
			nameRef.current?.focus();
		} else if (fieldErrors.phone) {
			phoneRef.current?.focus();
		} else if (fieldErrors.email) {
			emailRef.current?.focus();
		}
	}

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: form submit with optional callback paths requires branching logic
	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setErrors({});

		if (!(onSave || userId)) {
			toast.error("Algo deu errado. Tente novamente.");
			return;
		}

		const result = leadFormSchema.safeParse({
			name,
			phone: unmaskPhone(phone),
			email,
			interestTag,
			company,
			position,
			segment,
			notes,
		});

		if (!result.success) {
			const fieldErrors: FormErrors = {};
			for (const issue of result.error.issues) {
				const field = issue.path[0] as keyof FormErrors;
				if (!fieldErrors[field]) {
					fieldErrors[field] = issue.message;
				}
			}
			setErrors(fieldErrors);
			focusFirstError(fieldErrors);
			return;
		}

		setIsSubmitting(true);
		try {
			if (isEditMode && lead) {
				if (onUpdate) {
					await onUpdate(result.data, photoChanged ? photo : undefined);
				} else {
					await updateLead(
						lead.localId,
						result.data,
						photoChanged ? photo : undefined
					);
				}
				toast.success("Lead atualizado!");
			} else {
				if (onSave) {
					await onSave(result.data, photo);
				} else {
					await saveLead(result.data, userId as string, photo);
				}
				toast.success("Lead salvo!");
			}
			router.back();
		} catch {
			toast.error("Algo deu errado. Tente novamente.");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className="flex flex-col px-4 py-8">
			<header className="mx-auto flex w-full max-w-none items-center gap-4 pb-6 md:max-w-2xl">
				<Button
					aria-label="Voltar"
					onClick={() => router.back()}
					size="icon"
					type="button"
					variant="ghost"
				>
					<ArrowLeft className="size-5" />
				</Button>
				<h1 className="font-semibold text-xl">
					{isEditMode ? "Editar Lead" : "Novo Lead"}
				</h1>
			</header>

			<Card className="mx-auto mb-8 w-full max-w-none md:max-w-2xl">
				<CardHeader>
					<CardTitle className="sr-only">Formulario de lead</CardTitle>
				</CardHeader>
				<CardContent>
					<form
						aria-busy={isSubmitting}
						className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4"
						onSubmit={handleSubmit}
					>
						<div className="flex flex-col gap-2 justify-center">
							<Label htmlFor="lead-name">Nome *</Label>
							<Input
								aria-describedby={errors.name ? "error-name" : undefined}
								aria-invalid={!!errors.name}
								disabled={isSubmitting}
								id="lead-name"
								onChange={(e) => setName(e.target.value)}
								placeholder="Nome do contato"
								ref={nameRef}
								required
								type="text"
								value={name}
							/>
							{errors.name && (
								<p
									className="text-destructive text-xs"
									id="error-name"
									role="alert"
								>
									{errors.name}
								</p>
							)}
						</div>

						<div className="flex flex-col gap-2">
							<Label>Interesse *</Label>
							<TagSelector
								disabled={isSubmitting}
								onChange={setInterestTag}
								value={interestTag}

							/>
						</div>

						<div className="flex flex-col gap-2">
							<Label htmlFor="lead-phone">Telefone</Label>
							<div className="flex gap-2">
								<Input
									aria-describedby={errors.phone ? "error-phone" : undefined}
									aria-invalid={!!errors.phone}
									className="flex-1"
									disabled={isSubmitting}
									id="lead-phone"
									onChange={(e) => setPhone(maskPhoneInput(e.target.value))}
									placeholder="(51) 99647-4579"
									ref={phoneRef}
									type="tel"
									value={phone}
								/>
								{hideQR ? null : (
									<Button
										aria-label="Escanear QR Code do WhatsApp"
										disabled={isSubmitting}
										onClick={() => setShowQRScanner(true)}
										size="icon"
										type="button"
										variant="outline"
									>
										<QrCode className="size-4" />
									</Button>
								)}
							</div>
							{errors.phone && (
								<p
									className="text-destructive text-xs"
									id="error-phone"
									role="alert"
								>
									{errors.phone}
								</p>
							)}
						</div>

						<div className="flex flex-col gap-2">
							<Label htmlFor="lead-email">Email</Label>
							<Input
								aria-describedby={errors.email ? "error-email" : undefined}
								aria-invalid={!!errors.email}
								disabled={isSubmitting}
								id="lead-email"
								onChange={(e) => setEmail(e.target.value)}
								placeholder="email@exemplo.com"
								ref={emailRef}
								type="email"
								value={email}
							/>
							{errors.email && (
								<p
									className="text-destructive text-xs"
									id="error-email"
									role="alert"
								>
									{errors.email}
								</p>
							)}
						</div>

						<div className="flex flex-col gap-2">
							<Label htmlFor="lead-company">Empresa</Label>
							<Input
								disabled={isSubmitting}
								id="lead-company"
								onChange={(e) => setCompany(e.target.value)}
								placeholder="Empresa"
								type="text"
								value={company}
							/>
						</div>

						<div className="flex flex-col gap-2">
							<Label htmlFor="lead-position">Cargo</Label>
							<Input
								disabled={isSubmitting}
								id="lead-position"
								onChange={(e) => setPosition(e.target.value)}
								placeholder="Cargo"
								type="text"
								value={position}
							/>
						</div>

						<div className="flex flex-col gap-2">
							<Label htmlFor="lead-segment">Segmento</Label>
							<Input
								disabled={isSubmitting}
								id="lead-segment"
								onChange={(e) => setSegment(e.target.value)}
								placeholder="Segmento de atuacao"
								type="text"
								value={segment}
							/>
						</div>

						{hidePhoto ? null : (
							<div className="flex flex-col gap-2">
								<Label>Foto do cartao</Label>
								<PhotoCapture
									onCapture={(blob) => {
										setPhoto(blob);
										setPhotoChanged(true);
									}}
									onRemove={() => {
										setPhoto(null);
										setPhotoChanged(true);
									}}
									photo={photo}
								/>
							</div>
						)}

						<div className="flex flex-col gap-2 md:col-span-2">
							<Label htmlFor="lead-notes">Notas</Label>
							<Textarea
								disabled={isSubmitting}
								id="lead-notes"
								onChange={(e) => setNotes(e.target.value)}
								placeholder="Observacoes sobre o contato..."
								value={notes}
							/>
						</div>

						<Button
							aria-busy={isSubmitting}
							className="mt-2 w-full md:col-span-2"
							disabled={isSubmitting}
							size="lg"
							type="submit"
						>
							{isSubmitting ? <Loader2 className="animate-spin" /> : null}
							{isEditMode ? "Salvar alteracoes" : "Salvar Lead"}
						</Button>

						{isEditMode && onDelete ? (
							<Button
								className="w-full text-destructive md:col-span-2"
								disabled={isSubmitting}
								onClick={onDelete}
								size="lg"
								type="button"
								variant="outline"
							>
								Excluir Lead
							</Button>
						) : null}
					</form>
				</CardContent>
			</Card>

			{hideQR ? null : (
				<QRScanner
					onClose={() => setShowQRScanner(false)}
					onScan={(scannedPhone) => {
						setPhone(maskPhoneInput(scannedPhone));
						setShowQRScanner(false);
					}}
					open={showQRScanner}
				/>
			)}
		</div>
	);
}
