"use client";

import {
	SidebarInset,
	SidebarProvider,
} from "@dashboard-leads-profills/ui/components/sidebar";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import AppSidebar from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import { SyncStatusProvider } from "@/components/sync-status-provider";
import { AppAuthProvider, useAppAuth } from "./app-auth-provider";

function LoadingState() {
	return (
		<div className="flex min-h-svh items-center justify-center p-4 text-center text-muted-foreground text-sm">
			Carregando seu workspace local...
		</div>
	);
}

function OfflineBlockedState({ isOnline }: { isOnline: boolean }) {
	return (
		<main className="flex min-h-svh flex-col items-center justify-center gap-4 p-8 text-center">
			<h1 className="font-semibold text-2xl">Acesso offline indisponivel</h1>
			<p className="max-w-md text-muted-foreground text-sm">
				{isOnline
					? "Sua sessao local nao esta pronta. Entre novamente para continuar."
					: "Voce precisa entrar uma vez com internet para habilitar o modo offline neste dispositivo."}
			</p>
			<Link
				className="text-primary text-sm underline underline-offset-4"
				href="/login"
			>
				Ir para o login
			</Link>
		</main>
	);
}

function AuthenticatedAppShellContent({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const router = useRouter();
	const { isLoading, isOnline, snapshot } = useAppAuth();

	useEffect(() => {
		if (isLoading || snapshot) {
			return;
		}

		if (isOnline) {
			router.replace("/login");
		}
	}, [isLoading, isOnline, router, snapshot]);

	useEffect(() => {
		if (!snapshot) {
			return;
		}

		if (pathname.startsWith("/admin") && snapshot.userRole !== "admin") {
			router.replace("/dashboard");
		}
	}, [pathname, router, snapshot]);

	if (isLoading && !snapshot) {
		return <LoadingState />;
	}

	if (!snapshot) {
		return <OfflineBlockedState isOnline={isOnline} />;
	}

	const isAdmin = snapshot.userRole === "admin";

	return (
		<SyncStatusProvider>
			<SidebarProvider defaultOpen>
				<ServiceWorkerRegistrar />
				<AppSidebar
					gravatarUrl={snapshot.gravatarUrl}
					isAdmin={isAdmin && isOnline}
					userEmail={snapshot.userEmail}
					userName={snapshot.userName}
					userRole={snapshot.userRole}
				/>
				<SidebarInset>
					<AppTopbar />
					<div className="flex-1 p-4 md:p-6">{children}</div>
				</SidebarInset>
			</SidebarProvider>
		</SyncStatusProvider>
	);
}

export function AuthenticatedAppShell({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<AppAuthProvider>
			<AuthenticatedAppShellContent>{children}</AuthenticatedAppShellContent>
		</AppAuthProvider>
	);
}
