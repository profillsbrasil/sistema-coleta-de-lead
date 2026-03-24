import { protectedProcedure, publicProcedure, router } from "../index";
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
	todo: todoRouter,
});
export type AppRouter = typeof appRouter;
