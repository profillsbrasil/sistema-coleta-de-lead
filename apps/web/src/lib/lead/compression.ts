const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.7;
const STORAGE_WARNING_THRESHOLD = 0.8; // 80%
const STORAGE_FULL_THRESHOLD = 0.9; // 90%
const COMPRESSED_DIMENSION = 800;

export type StorageStatus = "ok" | "warning" | "full";

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

export async function getStorageStatus(): Promise<StorageStatus> {
	if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
		return "ok";
	}

	const { usage, quota } = await navigator.storage.estimate();

	if (quota == null || quota === 0) {
		return "ok";
	}

	const ratio = (usage ?? 0) / quota;

	if (ratio >= STORAGE_FULL_THRESHOLD) {
		return "full";
	}

	if (ratio >= STORAGE_WARNING_THRESHOLD) {
		return "warning";
	}

	return "ok";
}

export async function compressForStorage(blob: Blob): Promise<Blob> {
	const status = await getStorageStatus();

	if (status === "ok") {
		return blob;
	}

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
