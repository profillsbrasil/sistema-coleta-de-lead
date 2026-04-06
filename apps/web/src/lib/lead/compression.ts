const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.7;
const STORAGE_COMPRESS_THRESHOLD = 0.8; // 80%
const STORAGE_REJECT_THRESHOLD = 0.9; // 90%
const COMPRESSED_DIMENSION = 800;

export function calculateDimensions(
	width: number,
	height: number,
	maxDimension: number
): { width: number; height: number } {
	if (width <= maxDimension && height <= maxDimension) {
		return { width, height };
	}

	const ratio = Math.min(maxDimension / width, maxDimension / height);
	return {
		width: Math.round(width * ratio),
		height: Math.round(height * ratio),
	};
}

export async function checkStorageAndCompress(blob: Blob): Promise<Blob> {
	if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
		return blob;
	}

	const { usage, quota } = await navigator.storage.estimate();

	if (quota == null || quota === 0) {
		return blob;
	}

	const usageRatio = (usage ?? 0) / quota;

	if (usageRatio >= STORAGE_REJECT_THRESHOLD) {
		throw new Error(
			"Armazenamento cheio (>90%). Libere espaço antes de adicionar fotos."
		);
	}

	if (usageRatio >= STORAGE_COMPRESS_THRESHOLD) {
		const bitmap = await createImageBitmap(blob);
		const { width, height } = calculateDimensions(
			bitmap.width,
			bitmap.height,
			COMPRESSED_DIMENSION
		);

		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;

		const ctx = canvas.getContext("2d");
		if (!ctx) {
			bitmap.close();
			return blob;
		}

		ctx.drawImage(bitmap, 0, 0, width, height);
		bitmap.close();

		return new Promise((resolve) => {
			canvas.toBlob(
				(compressed) => resolve(compressed ?? blob),
				"image/jpeg",
				JPEG_QUALITY
			);
		});
	}

	return blob;
}

export async function compressImage(file: File): Promise<Blob> {
	const bitmap = await createImageBitmap(file);

	const { width, height } = calculateDimensions(
		bitmap.width,
		bitmap.height,
		MAX_DIMENSION
	);

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext("2d");
	if (!ctx) {
		bitmap.close();
		throw new Error("Failed to get canvas 2d context");
	}

	ctx.drawImage(bitmap, 0, 0, width, height);
	bitmap.close();

	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) {
					resolve(blob);
				} else {
					reject(new Error("Canvas toBlob failed"));
				}
			},
			"image/jpeg",
			JPEG_QUALITY
		);
	});
}
