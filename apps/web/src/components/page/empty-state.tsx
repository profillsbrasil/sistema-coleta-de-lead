import { buttonVariants } from "@dashboard-leads-profills/ui/components/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@dashboard-leads-profills/ui/components/empty";
import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";

interface EmptyStateProps {
	className?: string;
	cta?: {
		href?: string;
		icon?: ComponentType<{ className?: string }>;
		label: string;
		onClick?: () => void;
	};
	description: ReactNode;
	icon?: ComponentType<{ className?: string }>;
	title: string;
}

export function EmptyState({
	className,
	cta,
	description,
	icon: Icon,
	title,
}: EmptyStateProps) {
	return (
		<Empty
			className={cn(
				"mx-4 rounded-lg border border-border-subtle bg-card py-10",
				className
			)}
		>
			<EmptyHeader>
				{Icon && (
					<EmptyMedia variant="icon">
						<Icon className="size-6" />
					</EmptyMedia>
				)}
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>
			{cta && (
				<EmptyContent>
					{cta.href ? (
						<Link
							className={buttonVariants({
								variant: "default",
								size: "sm",
								className: "rounded-full",
							})}
							href={cta.href as unknown as "/"}
						>
							{cta.icon && <cta.icon className="size-4" />}
							{cta.label}
						</Link>
					) : (
						<button
							className={buttonVariants({
								variant: "default",
								size: "sm",
								className: "rounded-full",
							})}
							onClick={cta.onClick}
							type="button"
						>
							{cta.icon && <cta.icon className="size-4" />}
							{cta.label}
						</button>
					)}
				</EmptyContent>
			)}
		</Empty>
	);
}
