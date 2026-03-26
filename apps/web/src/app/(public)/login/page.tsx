import { Suspense } from "react";
import LoginCard from "@/components/login-card";

export default function LoginPage() {
	return (
		<div className="flex min-h-svh items-center justify-center p-4">
			<Suspense>
				<LoginCard />
			</Suspense>
		</div>
	);
}
