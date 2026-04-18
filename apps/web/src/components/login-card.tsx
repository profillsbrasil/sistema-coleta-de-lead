"use client";

import { authClient } from "@dashboard-leads-profills/auth/client";
import { Button } from "@dashboard-leads-profills/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@dashboard-leads-profills/ui/components/card";
import {
	Field,
	FieldError,
	FieldLabel,
	FieldSeparator,
} from "@dashboard-leads-profills/ui/components/field";
import { Input } from "@dashboard-leads-profills/ui/components/input";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@dashboard-leads-profills/ui/components/tabs";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { readAuthSnapshot } from "@/lib/auth/auth-snapshot";

function GoogleIcon() {
	return (
		<svg aria-hidden="true" height="20" viewBox="0 0 24 24" width="20">
			<path
				d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
				fill="#4285F4"
			/>
			<path
				d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
				fill="#34A853"
			/>
			<path
				d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
				fill="#FBBC05"
			/>
			<path
				d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
				fill="#EA4335"
			/>
		</svg>
	);
}

export default function LoginCard() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");
	const [formError, setFormError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isGoogleLoading, setIsGoogleLoading] = useState(false);
	const [localSnapshotName, setLocalSnapshotName] = useState<string | null>(
		null,
	);
	const router = useRouter();
	const searchParams = useSearchParams();

	useEffect(() => {
		const error = searchParams.get("error");
		if (error === "auth-code-error") {
			toast.error("Erro ao autenticar. Tente novamente com outro provedor.");
		} else if (error) {
			toast.error("Não foi possível fazer login. Tente novamente.");
		}
	}, [searchParams]);

	useEffect(() => {
		setLocalSnapshotName(readAuthSnapshot()?.userName ?? null);
	}, []);

	async function handleGoogleLogin() {
		setIsGoogleLoading(true);
		try {
			await authClient.signIn.social({
				provider: "google",
				callbackURL: "/dashboard",
			});
		} catch {
			toast.error("Não foi possível iniciar o login com Google.");
			setIsGoogleLoading(false);
		}
	}

	async function handleEmailLogin(e: React.FormEvent) {
		e.preventDefault();
		setFormError(null);

		const trimmedEmail = email.trim();
		if (!trimmedEmail || !password) {
			setFormError("Preencha email e senha.");
			return;
		}

		setIsSubmitting(true);
		try {
			const { error } = await authClient.signIn.email({
				email: trimmedEmail,
				password,
			});

			if (error) {
				setFormError("Email ou senha incorretos.");
				return;
			}

			router.replace("/dashboard");
			router.refresh();
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleEmailSignup(e: React.FormEvent) {
		e.preventDefault();
		setFormError(null);

		const trimmedEmail = email.trim();
		const trimmedName = name.trim();

		if (!trimmedName) {
			setFormError("Informe seu nome.");
			return;
		}
		if (!trimmedEmail) {
			setFormError("Informe seu email.");
			return;
		}
		if (password.length < 6) {
			setFormError("A senha deve ter pelo menos 6 caracteres.");
			return;
		}

		setIsSubmitting(true);
		try {
			const { error } = await authClient.signUp.email({
				email: trimmedEmail,
				password,
				name: trimmedName,
			});

			if (error) {
				if (error.message?.includes("exists") || error.code === "USER_ALREADY_EXISTS") {
					setFormError("Este email já está cadastrado.");
				} else {
					setFormError(error.message ?? "Falha ao cadastrar.");
				}
				return;
			}

			router.replace("/dashboard");
			router.refresh();
		} finally {
			setIsSubmitting(false);
		}
	}

	const isLoading = isSubmitting || isGoogleLoading;

	return (
		<Card className="w-full max-w-[400px]">
			<CardHeader className="text-center">
				<CardTitle className="font-semibold text-xl">Dashboard Leads</CardTitle>
				<CardDescription>
					Acesse sua conta para começar a coletar leads
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				{localSnapshotName ? (
					<Button
						className="w-full"
						disabled={isLoading}
						onClick={() => router.push("/dashboard")}
						size="lg"
						variant="secondary"
					>
						Continuar offline como {localSnapshotName}
					</Button>
				) : null}

				<Tabs defaultValue={0}>
					<TabsList className="w-full">
						<TabsTrigger
							className="flex-1"
							onClick={() => setFormError(null)}
							value={0}
						>
							Entrar
						</TabsTrigger>
						<TabsTrigger
							className="flex-1"
							onClick={() => setFormError(null)}
							value={1}
						>
							Criar conta
						</TabsTrigger>
					</TabsList>

					<TabsContent value={0}>
						<form
							className="flex flex-col gap-3 pt-4"
							onSubmit={handleEmailLogin}
						>
							<Field>
								<FieldLabel>Email</FieldLabel>
								<Input
									autoComplete="email"
									disabled={isLoading}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="seu@email.com"
									type="email"
									value={email}
								/>
							</Field>
							<Field>
								<FieldLabel>Senha</FieldLabel>
								<Input
									autoComplete="current-password"
									disabled={isLoading}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="Sua senha"
									type="password"
									value={password}
								/>
							</Field>
							{formError && <FieldError>{formError}</FieldError>}
							<Button
								className="w-full"
								disabled={isLoading}
								size="lg"
								type="submit"
							>
								{isSubmitting ? (
									<Loader2 className="animate-spin" />
								) : null}
								Entrar
							</Button>
						</form>
					</TabsContent>

					<TabsContent value={1}>
						<form
							className="flex flex-col gap-3 pt-4"
							onSubmit={handleEmailSignup}
						>
							<Field>
								<FieldLabel>Nome</FieldLabel>
								<Input
									autoComplete="name"
									disabled={isLoading}
									onChange={(e) => setName(e.target.value)}
									placeholder="Seu nome completo"
									type="text"
									value={name}
								/>
							</Field>
							<Field>
								<FieldLabel>Email</FieldLabel>
								<Input
									autoComplete="email"
									disabled={isLoading}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="seu@email.com"
									type="email"
									value={email}
								/>
							</Field>
							<Field>
								<FieldLabel>Senha</FieldLabel>
								<Input
									autoComplete="new-password"
									disabled={isLoading}
									minLength={6}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="Mínimo 6 caracteres"
									type="password"
									value={password}
								/>
							</Field>
							{formError && <FieldError>{formError}</FieldError>}
							<Button
								className="w-full"
								disabled={isLoading}
								size="lg"
								type="submit"
							>
								{isSubmitting ? (
									<Loader2 className="animate-spin" />
								) : null}
								Criar conta
							</Button>
						</form>
					</TabsContent>
				</Tabs>

				<FieldSeparator>ou</FieldSeparator>

				<Button
					aria-busy={isGoogleLoading}
					className="w-full"
					disabled={isLoading}
					onClick={handleGoogleLogin}
					size="lg"
					variant="outline"
				>
					{isGoogleLoading ? (
						<Loader2 className="animate-spin" />
					) : (
						<GoogleIcon />
					)}
					Continuar com Google
				</Button>
			</CardContent>
		</Card>
	);
}
