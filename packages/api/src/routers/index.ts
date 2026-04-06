import { protectedProcedure, publicProcedure, router } from "../index";
import { adminRouter } from "./admin/index";
import { leaderboardRouter } from "./leaderboard";
import { syncRouter } from "./sync";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	privateData: protectedProcedure.query(({ ctx }) => {
		return {
			message: "This is private",
			user: ctx.user,
		};
	}),
	admin: adminRouter,
	leaderboard: leaderboardRouter,
	sync: syncRouter,
});
export type AppRouter = typeof appRouter;
