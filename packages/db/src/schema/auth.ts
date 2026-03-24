import { bigserial, pgEnum, pgTable, unique, uuid } from "drizzle-orm/pg-core";

export const appRoleEnum = pgEnum("app_role", ["admin", "vendedor"]);

export const userRoles = pgTable(
	"user_roles",
	{
		id: bigserial("id", { mode: "bigint" }).primaryKey(),
		userId: uuid("user_id").notNull(),
		role: appRoleEnum("role").notNull(),
	},
	(table) => [
		unique("user_roles_user_id_role_unique").on(table.userId, table.role),
	]
);
