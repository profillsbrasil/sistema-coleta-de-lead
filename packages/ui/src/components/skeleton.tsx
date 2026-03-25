import { cn } from "@dashboard-leads-profills/ui/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("animate-pulse rounded-md bg-muted", className)}
			data-slot="skeleton"
			{...props}
		/>
	);
}

export { Skeleton };
