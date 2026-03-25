const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.7;

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
