import { router } from "../../index";
import { adminLeadsRouter } from "./leads";
import { adminStatsRouter } from "./stats";
import { adminUsersRouter } from "./users";

export const adminRouter = router({
	leads: adminLeadsRouter,
	users: adminUsersRouter,
	stats: adminStatsRouter,
});
