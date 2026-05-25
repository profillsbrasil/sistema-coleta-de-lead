"use client";

import {
	whatsappConfigSchema,
	type WhatsappConfigInput,
} from "@dashboard-leads-profills/api/whatsapp/config-schema";
import { Button } from "@dashboard-leads-profills/ui/components/button";
import { Input } from "@dashboard-leads-profills/ui/components/input";
import { Label } from "@dashboard-leads-profills/ui/components/label";
import { Skeleton } from "@dashboard-leads-profills/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";

const EMPTY_PROFILE = { handle: "", url: "" };

const EMPTY_FORM: WhatsappConfigInput = {
	vendorPhone: "",
	eventName: "",
	eventStart: "",
	eventEnd: "",
	raffleDate: "",
	welcomeImageUrl: null,
	logoUrl: null,
	instagramProfiles: [EMPTY_PROFILE, EMPTY_PROFILE, EMPTY_PROFILE],
	officialPostUrl: "",
	privacyPolicyUrl: null,
};

type FieldErrors = Partial<Record<string, string>>;

function getFieldError(errors: FieldErrors, path: string): string | undefined {
	return errors[path];
}

export function WhatsappConfigForm() {
	const queryClient = useQueryClient();
	const configQuery = useQuery(trpc.whatsapp.getConfig.queryOptions());
	const updateMutation = useMutation(
		trpc.whatsapp.updateConfig.mutationOptions({
			onSuccess: () => {
				toast.success("Configuração salva!");
				queryClient.invalidateQueries({
					queryKey: trpc.whatsapp.getConfig.queryKey(),
				});
			},
			onError: (err) => {
				toast.error(`Erro ao salvar: ${err.message}`);
			},
		})
	);

	const [form, setForm] = useState<WhatsappConfigInput>(EMPTY_FORM);
	const [errors, setErrors] = useState<FieldErrors>({});

	useEffect(() => {
		if (configQuery.data) {
			setForm({
				vendorPhone: configQuery.data.vendorPhone,
				eventName: configQuery.data.eventName,
				eventStart: configQuery.data.eventStart,
				eventEnd: configQuery.data.eventEnd,
				raffleDate: configQuery.data.raffleDate,
				welcomeImageUrl: configQuery.data.welcomeImageUrl,
				logoUrl: configQuery.data.logoUrl,
				instagramProfiles: configQuery.data.instagramProfiles as [
					{ handle: string; url: string },
					{ handle: string; url: string },
					{ handle: string; url: string },
				],
				officialPostUrl: configQuery.data.officialPostUrl,
				privacyPolicyUrl: configQuery.data.privacyPolicyUrl,
			});
		}
	}, [configQuery.data]);

	if (configQuery.isLoading) {
		return (
			<div className="flex flex-col gap-3 px-4">
				<Skeleton className="h-9 w-full" />
				<Skeleton className="h-9 w-full" />
				<Skeleton className="h-9 w-full" />
			</div>
		);
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const parsed = whatsappConfigSchema.safeParse(form);
		if (!parsed.success) {
			const newErrors: FieldErrors = {};
			for (const issue of parsed.error.issues) {
				newErrors[issue.path.join(".")] = issue.message;
			}
			setErrors(newErrors);
			toast.error("Alguns campos têm erros — confira o formulário.");
			return;
		}
		setErrors({});
		updateMutation.mutate(parsed.data);
	}

	function updateField<K extends keyof WhatsappConfigInput>(
		key: K,
		value: WhatsappConfigInput[K]
	) {
		setForm((prev) => ({ ...prev, [key]: value }));
	}

	function updateProfile(index: 0 | 1 | 2, key: "handle" | "url", value: string) {
		setForm((prev) => {
			const next = [...prev.instagramProfiles] as WhatsappConfigInput["instagramProfiles"];
			next[index] = { ...next[index]!, [key]: value };
			return { ...prev, instagramProfiles: next };
		});
	}

	return (
		<form className="flex flex-col gap-8 px-4" onSubmit={handleSubmit}>
			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-sm">Atendimento</h2>
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="vendorPhone">Telefone do vendedor (CTA)</Label>
					<Input
						id="vendorPhone"
						placeholder="5555996913627"
						value={form.vendorPhone}
						onChange={(e) => updateField("vendorPhone", e.target.value)}
					/>
					<FieldError message={getFieldError(errors, "vendorPhone")} />
					<p className="text-muted-foreground text-xs">
						Só dígitos, com DDI + DDD. É o número que recebe os clicks de
						&quot;Falar com a equipe&quot;.
					</p>
				</div>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-sm">Evento</h2>
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="eventName">Nome do evento</Label>
					<Input
						id="eventName"
						value={form.eventName}
						onChange={(e) => updateField("eventName", e.target.value)}
					/>
					<FieldError message={getFieldError(errors, "eventName")} />
				</div>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="eventStart">Início</Label>
						<Input
							id="eventStart"
							type="date"
							value={form.eventStart}
							onChange={(e) => updateField("eventStart", e.target.value)}
						/>
						<FieldError message={getFieldError(errors, "eventStart")} />
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="eventEnd">Fim</Label>
						<Input
							id="eventEnd"
							type="date"
							value={form.eventEnd}
							onChange={(e) => updateField("eventEnd", e.target.value)}
						/>
						<FieldError message={getFieldError(errors, "eventEnd")} />
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="raffleDate">Data do sorteio</Label>
						<Input
							id="raffleDate"
							type="date"
							value={form.raffleDate}
							onChange={(e) => updateField("raffleDate", e.target.value)}
						/>
						<FieldError message={getFieldError(errors, "raffleDate")} />
					</div>
				</div>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-sm">Imagens</h2>
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="welcomeImageUrl">Banner welcome (opcional)</Label>
					<Input
						id="welcomeImageUrl"
						placeholder="https://..."
						value={form.welcomeImageUrl ?? ""}
						onChange={(e) =>
							updateField("welcomeImageUrl", e.target.value || null)
						}
					/>
					<FieldError message={getFieldError(errors, "welcomeImageUrl")} />
				</div>
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="logoUrl">Logo no eventNotice (opcional)</Label>
					<Input
						id="logoUrl"
						placeholder="https://..."
						value={form.logoUrl ?? ""}
						onChange={(e) => updateField("logoUrl", e.target.value || null)}
					/>
					<FieldError message={getFieldError(errors, "logoUrl")} />
				</div>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-sm">LGPD</h2>
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="privacyPolicyUrl">
						URL da política de privacidade (opcional)
					</Label>
					<Input
						id="privacyPolicyUrl"
						placeholder="https://profills.com.br/privacidade"
						value={form.privacyPolicyUrl ?? ""}
						onChange={(e) =>
							updateField("privacyPolicyUrl", e.target.value || null)
						}
					/>
					<FieldError message={getFieldError(errors, "privacyPolicyUrl")} />
					<p className="text-muted-foreground text-xs">
						Quando preenchida, aparece no welcome do bot e é gravada como
						snapshot no participant no momento do consent.
					</p>
				</div>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-sm">Pré-requisitos no Instagram</h2>
				<p className="text-muted-foreground text-xs">
					Os 3 perfis que o cliente precisa seguir antes de receber o código.
				</p>
				{[0, 1, 2].map((i) => {
					const profile = form.instagramProfiles[i] ?? EMPTY_PROFILE;
					return (
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2" key={i}>
							<div className="flex flex-col gap-1.5">
								<Label htmlFor={`profile-${i}-handle`}>
									Perfil {i + 1} — @handle
								</Label>
								<Input
									id={`profile-${i}-handle`}
									placeholder="@profillsdobrasil"
									value={profile.handle}
									onChange={(e) =>
										updateProfile(i as 0 | 1 | 2, "handle", e.target.value)
									}
								/>
								<FieldError
									message={getFieldError(
										errors,
										`instagramProfiles.${i}.handle`
									)}
								/>
							</div>
							<div className="flex flex-col gap-1.5">
								<Label htmlFor={`profile-${i}-url`}>URL</Label>
								<Input
									id={`profile-${i}-url`}
									placeholder="https://instagram.com/..."
									value={profile.url}
									onChange={(e) =>
										updateProfile(i as 0 | 1 | 2, "url", e.target.value)
									}
								/>
								<FieldError
									message={getFieldError(errors, `instagramProfiles.${i}.url`)}
								/>
							</div>
						</div>
					);
				})}
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="officialPostUrl">
						URL do post oficial (curtir + comentar)
					</Label>
					<Input
						id="officialPostUrl"
						placeholder="https://instagram.com/p/..."
						value={form.officialPostUrl}
						onChange={(e) => updateField("officialPostUrl", e.target.value)}
					/>
					<FieldError message={getFieldError(errors, "officialPostUrl")} />
				</div>
			</section>

			<div className="flex items-center justify-end gap-3">
				<Button disabled={updateMutation.isPending} type="submit">
					{updateMutation.isPending ? "Salvando…" : "Salvar alterações"}
				</Button>
			</div>
		</form>
	);
}

function FieldError({ message }: { message: string | undefined }) {
	if (!message) return null;
	return <p className="text-destructive text-xs">{message}</p>;
}
