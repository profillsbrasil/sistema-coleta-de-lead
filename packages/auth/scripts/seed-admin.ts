import "dotenv/config";
import { auth } from "@dashboard-leads-profills/auth";
import { user } from "@dashboard-leads-profills/auth/schema";
import { db } from "@dashboard-leads-profills/db";
import { eq } from "drizzle-orm";

const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;
const name = process.env.SEED_ADMIN_NAME ?? "Admin";

if (!email || !password) {
	console.error(
		"Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD antes de rodar o seed.",
	);
	process.exit(1);
}

const existing = await db
	.select({ id: user.id, role: user.role })
	.from(user)
	.where(eq(user.email, email));

let userId: string;

if (existing.length > 0 && existing[0]) {
	userId = existing[0].id;
	console.log(`User já existe: ${userId}`);
} else {
	const res = await auth.api.signUpEmail({
		body: { email, password, name },
	});
	if (!res?.user) {
		console.error("Falha ao criar usuário via auth.api.signUpEmail.");
		process.exit(1);
	}
	userId = res.user.id;
	console.log(`User criado: ${userId}`);
}

await db.update(user).set({ role: "admin" }).where(eq(user.id, userId));

console.log(`Admin set: ${userId} (${email})`);
process.exit(0);
