"use client";

import { useFormStatus } from "react-dom";

// Rendered inside the import form so useFormStatus sees its submission.
export function ImportBackupPending() {
  const { pending } = useFormStatus();
  if (!pending) return null;

  return (
    <div
      className="dialog-overlay fixed inset-0 z-[1400] flex flex-col items-center justify-center gap-6 bg-white/85 p-4 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="tile-loader" aria-hidden="true">
        <span className="tile-loader-cell" />
        <span className="tile-loader-cell" />
        <span className="tile-loader-cell" />
        <span className="tile-loader-cell" />
        <span className="tile-loader-tile" />
        <span className="tile-loader-tile" />
        <span className="tile-loader-tile" />
        <span className="tile-loader-tile" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-ink">Mengimpor data cadangan…</p>
        <p className="mt-1 text-xs text-muted">Jangan tutup atau muat ulang halaman ini.</p>
      </div>
    </div>
  );
}
