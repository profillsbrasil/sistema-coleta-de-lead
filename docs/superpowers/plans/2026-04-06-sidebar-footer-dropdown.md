# Sidebar Footer → DropdownMenu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refatorar o footer da sidebar para usar DropdownMenu, movendo Theme Toggle e Sign Out para um menu popup e mantendo o SyncStatusIcon visível.

**Architecture:** O componente `SidebarUserMenu` é reescrito in-place. A linha do footer vira um `DropdownMenuTrigger` (Avatar + Nome + Chevron) com `SyncStatusIcon` como sibling fora do trigger. O `DropdownMenuContent` abre acima com 3 itens: Minha Conta, Theme Toggle, Sair.

**Tech Stack:** React 19, Base UI `@base-ui/react/menu` (via `DropdownMenu` de `packages/ui`), lucide-react, next-themes, Next.js router.

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `apps/web/src/components/sidebar-user-menu.tsx` | Refatorar footer: trigger + dropdown + sync sibling |

Nenhum arquivo novo. Uma única refatoração in-place.

---

### Task 1: Refatorar imports e remover Button

**Files:**
- Modify: `apps/web/src/components/sidebar-user-menu.tsx:1-19`

- [ ] **Step 1: Atualizar imports**

Substituir o bloco de imports atual por:

```tsx
"use client";

import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@dashboard-leads-profills/ui/components/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@dashboard-leads-profills/ui/components/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuItem,
} from "@dashboard-leads-profills/ui/components/sidebar";
import { ChevronsUpDown, LogOut, Moon, Sun, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { clearAuthSnapshot } from "@/lib/auth/auth-snapshot";
import { createClient } from "@/lib/supabase/client";
import { SyncStatusIcon } from "./sync-status-icon";
```

Mudanças vs original:
- Removido: `Button` de `@dashboard-leads-profills/ui/components/button`
- Adicionado: `DropdownMenu*` de `@dashboard-leads-profills/ui/components/dropdown-menu`
- Adicionado: `ChevronsUpDown`, `User` de lucide-react

- [ ] **Step 2: Verificar que compila**

Run: `cd /home/othavio/Work/profills/sistema-coleta-de-lead && bun run check-types`
Expected: Erros de tipo porque `Button` ainda é referenciado no JSX (esperado neste ponto, será resolvido no Task 2)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/sidebar-user-menu.tsx
git commit -m "refactor: atualizar imports do sidebar-user-menu para DropdownMenu"
```

---

### Task 2: Reescrever o JSX do componente

**Files:**
- Modify: `apps/web/src/components/sidebar-user-menu.tsx:45-107`

- [ ] **Step 1: Substituir o return do componente**

Substituir todo o bloco `return (...)` do componente `SidebarUserMenu` (linhas 68-106) por:

```tsx
	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<div className="flex items-center gap-2 px-2 py-2">
					<DropdownMenu>
						<DropdownMenuTrigger className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md p-1 text-left outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring">
							<Avatar>
								<AvatarImage alt={userName} src={gravatarUrl} />
								<AvatarFallback>{getInitials(userName)}</AvatarFallback>
							</Avatar>
							<div className="flex min-w-0 flex-1 flex-col">
								<span className="truncate font-semibold text-sm">
									{userName}
								</span>
								<span className="truncate text-muted-foreground text-xs">
									{userRole === "admin" ? "Admin" : "Vendedor"}
								</span>
							</div>
							<ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="start"
							className="w-56"
							side="top"
							sideOffset={8}
						>
							<DropdownMenuItem
								onClick={() => router.push("/account")}
							>
								<User />
								Minha Conta
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={handleToggleTheme}>
								{mounted ? (
									resolvedTheme === "dark" ? (
										<Sun />
									) : (
										<Moon />
									)
								) : (
									<Sun className="opacity-0" />
								)}
								{mounted
									? resolvedTheme === "dark"
										? "Tema Claro"
										: "Tema Escuro"
									: "Tema"}
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={handleSignOut}
								variant="destructive"
							>
								<LogOut />
								Sair
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
					<SyncStatusIcon />
				</div>
			</SidebarMenuItem>
		</SidebarMenu>
	);
```

Pontos-chave:
- `DropdownMenuTrigger` envolve apenas Avatar + Nome + Chevron
- `SyncStatusIcon` é sibling do `DropdownMenu` — fora do trigger, evitando `<button>` dentro de `<button>`
- `mounted` guard mantido para evitar flicker SSR no label/ícone do tema
- `DropdownMenuContent` com `className="w-56"` para largura fixa (não herda `--anchor-width`)
- "Minha Conta" usa `router.push`, não `<Link>`
- "Sair" usa `variant="destructive"`

- [ ] **Step 2: Verificar que compila**

Run: `cd /home/othavio/Work/profills/sistema-coleta-de-lead && bun run check-types`
Expected: PASS sem erros

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/sidebar-user-menu.tsx
git commit -m "feat: refatorar footer da sidebar para DropdownMenu

Move Theme Toggle e Sign Out para DropdownMenu.
SyncStatusIcon permanece visível como sibling fora do trigger.
Adiciona item 'Minha Conta' apontando para /account."
```

---

### Task 3: Verificação manual e visual

- [ ] **Step 1: Iniciar dev server**

Run: `cd /home/othavio/Work/profills/sistema-coleta-de-lead && bun run dev:web`
Abrir: http://localhost:3001

- [ ] **Step 2: Verificar footer da sidebar**

Checklist visual:
- Footer mostra: Avatar + Nome/Role + Chevron + Sync icon
- Theme toggle e Sign Out NÃO aparecem mais na linha do footer
- Chevron (`ChevronsUpDown`) visível à direita do nome

- [ ] **Step 3: Testar DropdownMenu**

- Clicar no trigger → menu abre acima do footer
- Menu tem largura fixa (~224px / w-56)
- 3 itens visíveis: "Minha Conta", "Tema Escuro/Claro", "Sair"
- Separadores entre cada item

- [ ] **Step 4: Testar ações do menu**

- Clicar "Minha Conta" → navega para /account (vai dar 404, esperado)
- Clicar "Tema Escuro"/"Tema Claro" → tema muda, menu fecha
- Clicar "Sair" → sign out, redirect para /login

- [ ] **Step 5: Testar SyncStatusIcon independente**

- Hover no ícone de sync → tooltip aparece normalmente
- Tooltip funciona independente do menu aberto/fechado

- [ ] **Step 6: Testar mobile**

- Redimensionar para mobile ou usar DevTools responsive
- Sidebar abre como Sheet
- Footer e DropdownMenu funcionam igual no Sheet

- [ ] **Step 7: Testar acessibilidade via teclado**

- Tab para o trigger → focus ring visível
- Enter/Space → menu abre
- Arrow keys → navega entre itens
- Escape → fecha menu
- Tab para SyncStatusIcon → funciona independente

---

## Arquivo final esperado

Para referência, o arquivo completo após Tasks 1-2:

```tsx
"use client";

import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@dashboard-leads-profills/ui/components/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@dashboard-leads-profills/ui/components/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuItem,
} from "@dashboard-leads-profills/ui/components/sidebar";
import { ChevronsUpDown, LogOut, Moon, Sun, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { clearAuthSnapshot } from "@/lib/auth/auth-snapshot";
import { createClient } from "@/lib/supabase/client";
import { SyncStatusIcon } from "./sync-status-icon";

interface SidebarUserMenuProps {
	gravatarUrl: string;
	userEmail: string;
	userName: string;
	userRole: string;
}

const WHITESPACE_RE = /\s+/;

function getInitials(name: string): string {
	const parts = name.trim().split(WHITESPACE_RE);
	if (parts.length >= 2) {
		return `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
	}
	return name.slice(0, 2).toUpperCase();
}

export default function SidebarUserMenu({
	gravatarUrl,
	userEmail: _userEmail,
	userName,
	userRole,
}: SidebarUserMenuProps) {
	const router = useRouter();
	const { setTheme, resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	function handleToggleTheme() {
		setTheme(resolvedTheme === "dark" ? "light" : "dark");
	}

	async function handleSignOut() {
		const supabase = createClient();
		clearAuthSnapshot();
		await supabase.auth.signOut();
		router.push("/login");
	}

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<div className="flex items-center gap-2 px-2 py-2">
					<DropdownMenu>
						<DropdownMenuTrigger className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md p-1 text-left outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring">
							<Avatar>
								<AvatarImage alt={userName} src={gravatarUrl} />
								<AvatarFallback>{getInitials(userName)}</AvatarFallback>
							</Avatar>
							<div className="flex min-w-0 flex-1 flex-col">
								<span className="truncate font-semibold text-sm">
									{userName}
								</span>
								<span className="truncate text-muted-foreground text-xs">
									{userRole === "admin" ? "Admin" : "Vendedor"}
								</span>
							</div>
							<ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="start"
							className="w-56"
							side="top"
							sideOffset={8}
						>
							<DropdownMenuItem
								onClick={() => router.push("/account")}
							>
								<User />
								Minha Conta
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={handleToggleTheme}>
								{mounted ? (
									resolvedTheme === "dark" ? (
										<Sun />
									) : (
										<Moon />
									)
								) : (
									<Sun className="opacity-0" />
								)}
								{mounted
									? resolvedTheme === "dark"
										? "Tema Claro"
										: "Tema Escuro"
									: "Tema"}
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={handleSignOut}
								variant="destructive"
							>
								<LogOut />
								Sair
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
					<SyncStatusIcon />
				</div>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
```
