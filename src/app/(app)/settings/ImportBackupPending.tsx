"use client";

import { useFormStatus } from "react-dom";
import { SeraLoader } from "@/components/SeraLoader";

// Rendered inside the import form so useFormStatus sees its submission.
export function ImportBackupPending() {
  const { pending } = useFormStatus();
  if (!pending) return null;

  return (
    <div
      className="dialog-overlay fixed inset-0 z-[1400] flex flex-col items-center justify-center gap-4 bg-white/85 p-4 text-center backdrop-blur-sm"
      aria-live="polite"
    >
      <SeraLoader size="lg" label="Mengimpor data cadangan" />
      <div>
        <p className="text-sm font-semibold text-ink">Mengimpor data cadangan…</p>
        <p className="mt-1 text-xs text-muted">Jangan tutup atau muat ulang halaman ini.</p>
      </div>
    </div>
  );
}
