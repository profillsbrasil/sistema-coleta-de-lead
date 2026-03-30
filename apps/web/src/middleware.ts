import { updateSession } from "@/lib/supabase/proxy";
import type { NextRequest } from "next/server";

export default async function middleware(request: NextRequest) {
	return await updateSession(request);
}

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
