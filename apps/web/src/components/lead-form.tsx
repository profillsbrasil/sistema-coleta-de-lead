"use client";

import { Button } from "@dashboard-leads-profills/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@dashboard-leads-profills/ui/components/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@dashboard-leads-profills/ui/components/collapsible";
import { Input } from "@dashboard-leads-profills/ui/components/input";
import { Label } from "@dashboard-leads-profills/ui/components/label";
import { Textarea } from "@dashboard-leads-profills/ui/components/textarea";
import { ArrowLeft, ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { saveLead } from "@/lib/lead/save-lead";
import { leadFormSchema } from "@/lib/lead/validation";
import { createClient } from "@/lib/supabase/client";

import TagSelector from "./tag-selector";

type InterestTag = "quente" | "morno" | "frio";

interface FormErrors {
	email?: string;
	name?: string;
	phone?: string;
}

export default function LeadForm() {
	const router = useRouter();

	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");
	const [email, setEmail] = useState("");
	const [interestTag, setInterestTag] = useState<InterestTag>("morno");
	const [company, setCompany] = useState("");
	const [position, setPosition] = useState("");
	const [segment, setSegment] = useState("");
	const [notes, setNotes] = useState("");
	const [errors, setErrors] = useState<FormErrors>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showDetails, setShowDetails] = useState(false);

	const nameRef = useRef<HTMLInputElement>(null);
	const phoneRef = useRef<HTMLInputElement>(null);
	const emailRef = useRef<HTMLInputElement>(null);

	const [userId, setUserId] = useState<string | null>(null);

	useEffect(() => {
		const supabase = createClient();
		supabase.auth.getUser().then(({ data }) => {
			if (data.user) {
				setUserId(data.user.id);
			}
		});
	}, []);

	function focusFirstError(fieldErrors: FormErrors) {
		if (fieldErrors.name) {
			nameRef.current?.focus();
		} else if (fieldErrors.phone) {
			phoneRef.current?.focus();
		} else if (fieldErrors.email) {
			emailRef.current?.focus();
		}
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setErrors({});

		if (!userId) {
			toast.error("Algo deu errado. Tente novamente.");
			return;
		}

		const result = leadFormSchema.safeParse({
			name,
			phone,
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
			await saveLead(result.data, userId, null);
			toast.success("Lead salvo!");
			router.back();
		} catch {
			toast.error("Algo deu errado. Tente novamente.");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className="flex min-h-screen flex-col px-4 py-8">
			<header className="mx-auto flex w-full max-w-[480px] items-center gap-4 pb-6">
				<Button
					aria-label="Voltar"
					onClick={() => router.back()}
					size="icon"
					type="button"
					variant="ghost"
				>
					<ArrowLeft className="size-5" />
				</Button>
				<h1 className="font-semibold text-xl">Novo Lead</h1>
			</header>

			<Card className="mx-auto w-full max-w-[480px]">
				<CardHeader>
					<CardTitle className="sr-only">Formulario de lead</CardTitle>
				</CardHeader>
				<CardContent>
					<form
						aria-busy={isSubmitting}
						className="flex flex-col gap-4"
						onSubmit={handleSubmit}
					>
						<div className="flex flex-col gap-2">
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
							<Label htmlFor="lead-phone">Telefone</Label>
							<div className="flex gap-2">
								<Input
									aria-describedby={errors.phone ? "error-phone" : undefined}
									aria-invalid={!!errors.phone}
									className="flex-1"
									disabled={isSubmitting}
									id="lead-phone"
									onChange={(e) => setPhone(e.target.value)}
									placeholder="Telefone com DDD"
									ref={phoneRef}
									type="tel"
									value={phone}
								/>
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
							<Label>Interesse *</Label>
							<TagSelector
								disabled={isSubmitting}
								onChange={setInterestTag}
								value={interestTag}
							/>
						</div>

						<Collapsible onOpenChange={setShowDetails} open={showDetails}>
							<CollapsibleTrigger
								className="inline-flex w-full items-center justify-between rounded-lg px-2.5 py-2 font-medium text-sm hover:bg-muted"
								disabled={isSubmitting}
								type="button"
							>
								Mais detalhes
								<ChevronDown
									className={`size-4 transition-transform ${showDetails ? "rotate-180" : ""}`}
								/>
							</CollapsibleTrigger>
							<CollapsibleContent>
								<div className="flex flex-col gap-4 pt-4">
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

									<div className="flex flex-col gap-2">
										<Label htmlFor="lead-notes">Notas</Label>
										<Textarea
											disabled={isSubmitting}
											id="lead-notes"
											onChange={(e) => setNotes(e.target.value)}
											placeholder="Observacoes sobre o contato..."
											value={notes}
										/>
									</div>
								</div>
							</CollapsibleContent>
						</Collapsible>

						<Button
							aria-busy={isSubmitting}
							className="mt-2 w-full"
							disabled={isSubmitting}
							size="lg"
							type="submit"
						>
							{isSubmitting ? <Loader2 className="animate-spin" /> : null}
							Salvar Lead
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
