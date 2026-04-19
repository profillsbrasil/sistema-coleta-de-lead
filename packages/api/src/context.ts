import { auth, type Session } from "@dashboard-leads-profills/auth";
import type { NextRequest } from "next/server";

export type Context = {
	headers: Headers;
	session: Session["session"] | null;
	user: Session["user"] | null;
	userRole: "admin" | "vendedor" | null;
};

export async function createContext(req: NextRequest): Promise<Context> {
	const session = await auth.api.getSession({ headers: req.headers });
	const user = session?.user ?? null;
	const userRole =
		(user?.role as "admin" | "vendedor" | null | undefined) ?? null;

	return {
		headers: req.headers,
		session: session?.session ?? null,
		user,
		userRole,
	};
}
