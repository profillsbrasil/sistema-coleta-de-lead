import { protectedProcedure, publicProcedure, router } from "../index";
import { leaderboardRouter } from "./leaderboard";
import { syncRouter } from "./sync";
import { todoRouter } from "./todo";

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
	leaderboard: leaderboardRouter,
	sync: syncRouter,
	todo: todoRouter,
});
export type AppRouter = typeof appRouter;
