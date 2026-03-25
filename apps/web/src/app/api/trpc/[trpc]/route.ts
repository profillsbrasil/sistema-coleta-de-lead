import { createContext } from "@dashboard-leads-profills/api/context";
import { appRouter } from "@dashboard-leads-profills/api/routers/index";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { NextRequest } from "next/server";

function handler(req: NextRequest) {
	return fetchRequestHandler({
		endpoint: "/api/trpc",
		req,
		router: appRouter,
		createContext: () => createContext(req),
		onError: ({ error, path }) => {
			console.error(`tRPC error on ${path}:`, error.message, error.cause);
		},
	});
}

export { handler as GET, handler as POST };
