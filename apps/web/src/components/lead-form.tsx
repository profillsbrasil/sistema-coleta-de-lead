"use client";

import { Button } from "@dashboard-leads-profills/ui/components/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@dashboard-leads-profills/ui/components/collapsible";
import { Input } from "@dashboard-leads-profills/ui/components/input";
import { Label } from "@dashboard-leads-profills/ui/components/label";
import { Textarea } from "@dashboard-leads-profills/ui/components/textarea";
import { ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page/page-header";
import type { Lead } from "@/lib/db/types";
import { saveLead } from "@/lib/lead/save-lead";
import { updateLead } from "@/lib/lead/update-lead";
import { type LeadFormData, leadFormSchema } from "@/lib/lead/validation";
import { formatPhone, maskPhoneInput, unmaskPhone } from "@/lib/masks/phone";

import PhotoCapture from "./photo-capture";
import TagSelector from "./tag-selector";

type InterestTag = "quente" | "morno" | "frio";

interface FormErrors {
	company?: string;
	email?: string;
	name?: string;
	phone?: string;
}

interface LeadFormProps {
	hidePhoto?: boolean;
	lead?: Lead;
	onDelete?: () => void;
	onSave?: (data: LeadFormData, photo: Blob | null) => Promise<void>;
	onUpdate?: (
		data: LeadFormData,
		photo: Blob | null | undefined
	) => Promise<void>;
	userId?: string | null;
}

function getInitialState(lead: Lead | undefined) {
	return {
		name: lead?.name ?? "",
		phone: formatPhone(lead?.phone ?? ""),
		email: lead?.email ?? "",
		interestTag: (lead?.interestTag ?? "morno") as InterestTag,
		company: lead?.company ?? "",
		position: lead?.position ?? "",
		segment: lead?.segment ?? "",
		notes: lead?.notes ?? "",
		photo: lead?.photo ?? null,
	};
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: form component with many fields requires co-located state and validation logic
export default function LeadForm({
	lead,
	onDelete,
	onSave,
	onUpdate,
	hidePhoto,
	userId,
}: LeadFormProps) {
	const router = useRouter();
	const isEditMode = !!lead;

	const initial = useMemo(() => getInitialState(lead), [lead]);

	const [name, setName] = useState(initial.name);
	const [phone, setPhone] = useState(initial.phone);
	const [email, setEmail] = useState(initial.email);
	const [interestTag, setInterestTag] = useState<InterestTag>(
		initial.interestTag
	);
	const [company, setCompany] = useState(initial.company);
	const [position, setPosition] = useState(initial.position);
	const [segment, setSegment] = useState(initial.segment);
	const [notes, setNotes] = useState(initial.notes);
	const [errors, setErrors] = useState<FormErrors>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [photo, setPhoto] = useState<Blob | null>(initial.photo);
	const [photoChanged, setPhotoChanged] = useState(false);
	const [extrasOpen, setExtrasOpen] = useState(isEditMode);

	const nameRef = useRef<HTMLInputElement>(null);
	const phoneRef = useRef<HTMLInputElement>(null);
	const emailRef = useRef<HTMLInputElement>(null);
	const companyRef = useRef<HTMLInputElement>(null);

	const hasMinimum =
		name.trim().length > 0 &&
		company.trim().length > 0 &&
		(phone.trim().length > 0 || email.trim().length > 0);

	const missingHint = (() => {
		if (name.trim().length === 0) {
			return "Preencha o nome para salvar";
		}
		if (phone.trim().length === 0 && email.trim().length === 0) {
			return "Adicione telefone ou email";
		}
		if (company.trim().length === 0) {
			return "Adicione a empresa do lead";
		}
		return null;
	})();

	const extrasFilled =
		[position, segment, notes].filter((v) => v.trim().length > 0).length +
		(photo ? 1 : 0);
	const extrasTotal = hidePhoto ? 3 : 4;

	function resetForm() {
		const fresh = getInitialState(undefined);
		setName(fresh.name);
		setPhone(fresh.phone);
		setEmail(fresh.email);
		setInterestTag(fresh.interestTag);
		setCompany(fresh.company);
		setPosition(fresh.position);
		setSegment(fresh.segment);
		setNotes(fresh.notes);
		setPhoto(null);
		setPhotoChanged(false);
		setErrors({});
	}

	function focusFirstError(fieldErrors: FormErrors) {
		if (fieldErrors.name) {
			nameRef.current?.focus();
		} else if (fieldErrors.phone) {
			phoneRef.current?.focus();
		} else if (fieldErrors.email) {
			emailRef.current?.focus();
		} else if (fieldErrors.company) {
			companyRef.current?.focus();
		}
	}

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: form submit with optional callback paths requires branching logic
	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setErrors({});

		if (!(onSave || userId || isEditMode)) {
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
				router.back();
				return;
			}

			let createdId: string | null = null;
			if (onSave) {
				await onSave(result.data, photo);
			} else {
				createdId = await saveLead(result.data, userId as string, photo);
			}

			toast.success("Lead salvo!", {
				action: createdId
					? {
							label: "Editar",
							onClick: () => router.push(`/leads/${createdId}`),
						}
					: undefined,
			});
			resetForm();
			nameRef.current?.focus();
		} catch {
			toast.error("Algo deu errado. Tente novamente.");
		} finally {
			setIsSubmitting(false);
		}
	}

	const submitDisabled = isSubmitting || !(isEditMode || hasMinimum);
	const submitLabel = isEditMode ? "Salvar alterações" : "Salvar lead";

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-40 md:pb-8">
			<PageHeader
				eyebrow={isEditMode ? "Editar" : "Novo"}
				subtitle={
					missingHint && !isEditMode ? (
						<span className="text-muted-foreground">{missingHint}</span>
					) : null
				}
				title={isEditMode ? "Editar lead" : "Novo lead"}
			/>

			<form
				aria-busy={isSubmitting}
				className="flex flex-col gap-5 px-4"
				id="lead-form"
				onSubmit={handleSubmit}
			>
				<div className="flex flex-col gap-2">
					<Label htmlFor="lead-name">
						Nome <span className="text-destructive">*</span>
					</Label>
					<Input
						aria-describedby={errors.name ? "error-name" : undefined}
						aria-invalid={!!errors.name}
						autoComplete="name"
						className="h-12"
						disabled={isSubmitting}
						enterKeyHint="next"
						id="lead-name"
						onChange={(e) => setName(e.target.value)}
						placeholder="Ex.: Maria Silva"
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
					<Label htmlFor="lead-company">
						Empresa <span className="text-destructive">*</span>
					</Label>
					<Input
						aria-describedby={errors.company ? "error-company" : undefined}
						aria-invalid={!!errors.company}
						autoComplete="organization"
						className="h-12"
						disabled={isSubmitting}
						enterKeyHint="next"
						id="lead-company"
						onChange={(e) => setCompany(e.target.value)}
						placeholder="Ex.: Acme Corp"
						ref={companyRef}
						required
						type="text"
						value={company}
					/>
					{errors.company && (
						<p
							className="text-destructive text-xs"
							id="error-company"
							role="alert"
						>
							{errors.company}
						</p>
					)}
				</div>

				<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
					<div className="flex flex-col gap-2">
						<Label htmlFor="lead-phone">
							Telefone{" "}
							<span className="text-muted-foreground text-xs">(ou email)</span>
						</Label>
						<Input
							aria-describedby={errors.phone ? "error-phone" : undefined}
							aria-invalid={!!errors.phone}
							autoComplete="tel"
							className="h-12"
							disabled={isSubmitting}
							enterKeyHint="next"
							id="lead-phone"
							inputMode="tel"
							onChange={(e) => setPhone(maskPhoneInput(e.target.value))}
							placeholder="(51) 99647-4579"
							ref={phoneRef}
							type="tel"
							value={phone}
						/>
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
							autoComplete="email"
							className="h-12"
							disabled={isSubmitting}
							enterKeyHint="next"
							id="lead-email"
							inputMode="email"
							onChange={(e) => setEmail(e.target.value)}
							placeholder="maria@acme.com"
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
				</div>

				<div className="flex flex-col gap-2">
					<Label>
						Interesse <span className="text-destructive">*</span>
					</Label>
					<TagSelector
						disabled={isSubmitting}
						onChange={setInterestTag}
						value={interestTag}
					/>
				</div>

				{hidePhoto ? null : (
					<div className="flex flex-col gap-2">
						<Label>
							Foto do cartão{" "}
							<span className="font-normal text-muted-foreground text-xs">
								(opcional)
							</span>
						</Label>
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

				<Collapsible onOpenChange={setExtrasOpen} open={extrasOpen}>
					<CollapsibleTrigger
						className="flex w-full items-center justify-between rounded-md border border-border-subtle border-dashed bg-card px-4 py-3 font-medium text-foreground text-sm transition-colors hover:bg-accent"
						disabled={isSubmitting}
						type="button"
					>
						<span>
							Mais informações{" "}
							<span className="font-mono font-normal text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
								{extrasFilled === 0
									? "opcional"
									: `${extrasFilled}/${extrasTotal}`}
							</span>
						</span>
						<ChevronDown
							className={`size-4 transition-transform ${extrasOpen ? "rotate-180" : ""}`}
						/>
					</CollapsibleTrigger>
					<CollapsibleContent className="flex flex-col gap-5 pt-5">
						<div className="flex flex-col gap-2">
							<Label htmlFor="lead-position">Cargo</Label>
							<Input
								autoComplete="organization-title"
								className="h-12"
								disabled={isSubmitting}
								id="lead-position"
								onChange={(e) => setPosition(e.target.value)}
								placeholder="Ex.: Head de Vendas"
								type="text"
								value={position}
							/>
						</div>

						<div className="flex flex-col gap-2">
							<Label htmlFor="lead-segment">Segmento</Label>
							<Input
								className="h-12"
								disabled={isSubmitting}
								id="lead-segment"
								onChange={(e) => setSegment(e.target.value)}
								placeholder="Ex.: SaaS B2B"
								type="text"
								value={segment}
							/>
						</div>

						<div className="flex flex-col gap-2">
							<Label htmlFor="lead-notes">Notas</Label>
							<Textarea
								disabled={isSubmitting}
								id="lead-notes"
								onChange={(e) => setNotes(e.target.value)}
								placeholder="Pontos da conversa, próximos passos…"
								rows={3}
								value={notes}
							/>
						</div>
					</CollapsibleContent>
				</Collapsible>

				{isEditMode && onDelete ? (
					<Button
						className="w-full text-destructive"
						disabled={isSubmitting}
						onClick={onDelete}
						size="lg"
						type="button"
						variant="outline"
					>
						Excluir lead
					</Button>
				) : null}
			</form>

			<div className="-mx-4 fixed inset-x-0 bottom-[68px] z-20 border-border-subtle border-t bg-background/95 px-4 pt-3 pb-3 backdrop-blur md:relative md:inset-auto md:mx-0 md:border-0 md:bg-transparent md:px-4 md:pt-0 md:pb-0 md:backdrop-blur-none">
				<Button
					aria-busy={isSubmitting}
					className="w-full rounded-full"
					disabled={submitDisabled}
					form="lead-form"
					size="lg"
					type="submit"
				>
					{isSubmitting ? (
						<Loader2 className="mr-2 size-4 animate-spin" />
					) : null}
					{submitLabel}
				</Button>
			</div>
		</div>
	);
}
