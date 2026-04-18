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

const res = await auth.api.signUpEmail({
	body: { email, password, name },
});

if (!res?.user) {
	console.error("Falha ao criar usuário via auth.api.signUpEmail.");
	process.exit(1);
}

await db.update(user).set({ role: "admin" }).where(eq(user.id, res.user.id));

console.log(`Admin criado: ${res.user.id} (${email})`);
process.exit(0);
