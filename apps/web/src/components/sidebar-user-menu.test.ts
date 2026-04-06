// @vitest-environment node

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
	useRouter: vi.fn(() => ({
		push: vi.fn(),
	})),
}));

vi.mock("next-themes", () => ({
	useTheme: vi.fn(() => ({
		resolvedTheme: "light",
		setTheme: vi.fn(),
	})),
}));

vi.mock("@/components/sync-status-provider", () => ({
	useSyncStatus: vi.fn(() => ({
		isOnline: true,
		isSyncing: false,
		lastError: null,
		lastSync: null,
		pendingCount: 0,
	})),
}));

vi.mock("@/lib/supabase/client", () => ({
	createClient: vi.fn(() => ({
		auth: {
			signOut: vi.fn(),
		},
	})),
}));

describe("sidebar-user-menu", () => {
	it("renders only one button inside the dropdown trigger row", async () => {
		const { default: SidebarUserMenu } = await import("./sidebar-user-menu");

		const markup = renderToStaticMarkup(
			React.createElement(SidebarUserMenu, {
				gravatarUrl: "https://example.com/avatar.png",
				userEmail: "othavio@example.com",
				userName: "Othavio Queiroz",
				userRole: "admin",
			})
		);

		expect(markup.match(/<button\b/g)).toHaveLength(1);
	});
});
