"use client";

import { Button } from "@dashboard-leads-profills/ui/components/button";
import { Camera, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { compressImage } from "@/lib/lead/compression";

interface PhotoCaptureProps {
	onCapture: (blob: Blob) => void;
	onRemove: () => void;
	photo: Blob | null;
}

export default function PhotoCapture({
	photo,
	onCapture,
	onRemove,
}: PhotoCaptureProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [isCompressing, setIsCompressing] = useState(false);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!photo) {
			setPreviewUrl(null);
			return;
		}

		const url = URL.createObjectURL(photo);
		setPreviewUrl(url);

		return () => {
			URL.revokeObjectURL(url);
		};
	}, [photo]);

	async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) {
			return;
		}

		setIsCompressing(true);
		try {
			const compressed = await compressImage(file);
			onCapture(compressed);
		} finally {
			setIsCompressing(false);
			if (inputRef.current) {
				inputRef.current.value = "";
			}
		}
	}

	function handleRemove() {
		onRemove();
		if (inputRef.current) {
			inputRef.current.value = "";
		}
	}

	return (
		<div className="flex items-center gap-3">
			<input
				accept="image/*"
				capture="environment"
				className="hidden"
				onChange={handleFileChange}
				ref={inputRef}
				type="file"
			/>

			<Button
				aria-label="Tirar foto do cartao de visita"
				disabled={isCompressing}
				onClick={() => inputRef.current?.click()}
				size="sm"
				type="button"
				variant="outline"
			>
				{isCompressing ? (
					<Loader2 className="mr-2 size-4 animate-spin" />
				) : (
					<Camera className="mr-2 size-4" />
				)}
				Tirar foto
			</Button>

			{previewUrl && (
				<div className="relative">
					{/* biome-ignore lint/performance/noImgElement: blob URL preview incompatible with next/image */}
					{/* biome-ignore lint/correctness/useImageSize: dimensions set via CSS h-20 w-20 (80x80px) */}
					<img
						alt="Preview da foto capturada"
						className="h-20 w-20 rounded object-cover"
						src={previewUrl}
					/>
					<Button
						aria-label="Remover foto"
						className="absolute -top-2 -right-2 size-6 rounded-full p-0"
						onClick={handleRemove}
						size="icon"
						type="button"
						variant="destructive"
					>
						<X className="size-3" />
					</Button>
				</div>
			)}
		</div>
	);
}
