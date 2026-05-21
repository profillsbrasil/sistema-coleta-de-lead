import { protectedProcedure, publicProcedure, router } from "../index";
import { adminRouter } from "./admin/index";
import { debugRouter } from "./debug";
import { leaderboardRouter } from "./leaderboard";
import { syncRouter } from "./sync";
import { whatsappRouter } from "./whatsapp";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => "OK"),
	privateData: protectedProcedure.query(({ ctx }) => ({
		message: "This is private",
		user: ctx.user,
	})),
	admin: adminRouter,
	debug: debugRouter,
	leaderboard: leaderboardRouter,
	sync: syncRouter,
	whatsapp: whatsappRouter,
});
export type AppRouter = typeof appRouter;
