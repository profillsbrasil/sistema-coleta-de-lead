import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	const { data: claimsData } = await supabase.auth.getClaims();
	const userRole = (claimsData?.claims as Record<string, unknown>)?.user_role;

	if (userRole !== "admin") {
		redirect("/dashboard");
	}

	return <>{children}</>;
}
