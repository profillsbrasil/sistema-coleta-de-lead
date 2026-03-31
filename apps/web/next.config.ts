import "@dashboard-leads-profills/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	typedRoutes: true,
	reactCompiler: true,
	async headers() {
		return [
			{
				source: "/sw.js",
				headers: [
					{
						key: "Service-Worker-Allowed",
						value: "/",
					},
					{
						key: "Cache-Control",
						value: "no-cache, no-store, must-revalidate",
					},
				],
			},
			{
				source: "/sw-manifest.json",
				headers: [
					{
						key: "Cache-Control",
						value: "no-cache, no-store, must-revalidate",
					},
				],
			},
			{
				source: "/sw-build.js",
				headers: [
					{
						key: "Cache-Control",
						value: "no-cache, no-store, must-revalidate",
					},
				],
			},
		];
	},
};

export default nextConfig;
