"use client";

import { Button } from "@dashboard-leads-profills/ui/components/button";
import { Html5Qrcode } from "html5-qrcode";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { parseWhatsAppUrl } from "@/lib/lead/wa-parser";

const SCANNER_ELEMENT_ID = "qr-reader";

interface QRScannerProps {
	onClose: () => void;
	onScan: (phone: string) => void;
	open: boolean;
}

export default function QRScanner({ open, onClose, onScan }: QRScannerProps) {
	const scannerRef = useRef<Html5Qrcode | null>(null);
	const closeBtnRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!open) {
			return;
		}

		closeBtnRef.current?.focus();

		let cancelled = false;
		const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
		scannerRef.current = scanner;

		function handleSuccess(decodedText: string) {
			const phone = parseWhatsAppUrl(decodedText);
			if (phone) {
				onScan(phone);
				toast.success("Telefone detectado");
				scanner
					.stop()
					.then(() => scanner.clear())
					.catch(() => {
						// Best-effort cleanup after successful scan
					});
				onClose();
			} else {
				toast.error("QR Code nao reconhecido. Tente novamente.");
			}
		}

		scanner
			.start(
				{ facingMode: "environment" },
				{ fps: 10, qrbox: { width: 250, height: 250 } },
				handleSuccess,
				() => {
					// No-op: frames without QR are normal during scanning
				}
			)
			.catch((err: unknown) => {
				if (cancelled) {
					return;
				}
				const message = err instanceof Error ? err.message : String(err);
				if (
					message.includes("NotAllowedError") ||
					message.includes("Permission")
				) {
					toast.error(
						"Permita o acesso a camera nas configuracoes do navegador."
					);
				}
				onClose();
			});

		return () => {
			cancelled = true;
			if (scannerRef.current?.isScanning) {
				scannerRef.current
					.stop()
					.then(() => scannerRef.current?.clear())
					.catch(() => {
						// Best-effort cleanup on unmount
					});
			}
			scannerRef.current = null;
		};
	}, [open, onClose, onScan]);

	if (!open) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 flex flex-col bg-background">
			<div className="relative flex items-center justify-center px-4 py-4">
				<Button
					aria-label="Fechar"
					className="absolute top-4 left-4"
					onClick={onClose}
					ref={closeBtnRef}
					size="icon"
					type="button"
					variant="ghost"
				>
					<X className="size-5" />
				</Button>
				<h2 className="font-semibold text-lg">Escanear QR</h2>
			</div>

			<div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
				<div
					className="aspect-square w-full max-w-[320px] overflow-hidden rounded-lg"
					id={SCANNER_ELEMENT_ID}
				/>
				<p className="text-center text-muted-foreground text-sm">
					Aponte para o QR Code do WhatsApp
				</p>
			</div>
		</div>
	);
}
