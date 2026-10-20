import { SeraLoader } from "@/components/SeraLoader";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3" aria-busy="true">
      <SeraLoader size="md" label="Memuat halaman" />
      <p className="text-sm text-muted">Memuat…</p>
    </div>
  );
}
